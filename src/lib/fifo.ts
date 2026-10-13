import { prisma } from "./prisma";

export interface CheckoutItemRequest {
  medicineId: string;
  quantity: number;
  unitPrice: number; // Selling price / MRP charged to customer
}

export interface AllocatedBatchItem {
  batchId: string;
  batchNumber: string;
  expiryDate: Date;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  cogs: number; // quantity * purchasePrice
}

export interface AllocatedMedicineSale {
  medicineId: string;
  medicineName: string;
  requestedQuantity: number;
  batches: AllocatedBatchItem[];
  subtotal: number;
  subtotalCogs: number;
}

/**
 * Plans and calculates FIFO batch allocation without committing to the DB.
 * Allows POS UI to preview batch allocation before finalizing sale.
 */
export async function planFifoAllocation(
  sellerId: string,
  items: CheckoutItemRequest[]
): Promise<{
  allocations: AllocatedMedicineSale[];
  totalAmount: number;
  totalCogs: number;
  error?: string;
}> {
  const allocations: AllocatedMedicineSale[] = [];
  let totalAmount = 0;
  let totalCogs = 0;

  for (const item of items) {
    if (item.quantity <= 0) continue;

    const medicine = await prisma.medicine.findFirst({
      where: { id: item.medicineId, seller_id: sellerId },
      include: {
        batches: {
          where: { quantity_available: { gt: 0 } },
          orderBy: { expiry_date: "asc" },
        },
      },
    });

    if (!medicine) {
      return {
        allocations: [],
        totalAmount: 0,
        totalCogs: 0,
        error: `Medicine with ID ${item.medicineId} not found for this seller.`,
      };
    }

    const totalAvailable = medicine.batches.reduce(
      (sum, b) => sum + b.quantity_available,
      0
    );

    if (totalAvailable < item.quantity) {
      return {
        allocations: [],
        totalAmount: 0,
        totalCogs: 0,
        error: `Insufficient stock for "${medicine.name}". Requested: ${item.quantity}, Available: ${totalAvailable}`,
      };
    }

    let remainingNeeded = item.quantity;
    const batchAllocations: AllocatedBatchItem[] = [];
    let medCogs = 0;

    for (const batch of medicine.batches) {
      if (remainingNeeded <= 0) break;

      const take = Math.min(batch.quantity_available, remainingNeeded);
      const cogs = take * batch.purchase_price;

      batchAllocations.push({
        batchId: batch.id,
        batchNumber: batch.batch_number,
        expiryDate: batch.expiry_date,
        quantity: take,
        unitPrice: item.unitPrice,
        purchasePrice: batch.purchase_price,
        cogs,
      });

      medCogs += cogs;
      remainingNeeded -= take;
    }

    const subtotal = item.quantity * item.unitPrice;
    totalAmount += subtotal;
    totalCogs += medCogs;

    allocations.push({
      medicineId: medicine.id,
      medicineName: medicine.name,
      requestedQuantity: item.quantity,
      batches: batchAllocations,
      subtotal,
      subtotalCogs: medCogs,
    });
  }

  return { allocations, totalAmount, totalCogs };
}

/**
 * Atomically executes FIFO deduction and records the sale, sale_items,
 * and borrower credit transactions if payment_mode is CREDIT.
 */
export async function executeFifoCheckout(
  sellerId: string,
  invoiceNumber: string,
  paymentMode: "CASH" | "ONLINE" | "CREDIT",
  items: CheckoutItemRequest[],
  borrowerId?: string
) {
  return await prisma.$transaction(async (tx) => {
    let saleTotalAmount = 0;
    let saleTotalCogs = 0;
    const saleItemCreates: Array<{
      batch_id: string;
      quantity: number;
      unit_price: number;
      cogs: number;
    }> = [];

    // 1. Process each requested medicine item
    for (const item of items) {
      if (item.quantity <= 0) continue;

      const medicine = await tx.medicine.findFirst({
        where: { id: item.medicineId, seller_id: sellerId },
        include: {
          batches: {
            where: { quantity_available: { gt: 0 } },
            orderBy: { expiry_date: "asc" },
          },
        },
      });

      if (!medicine) {
        throw new Error(`Medicine not found: ${item.medicineId}`);
      }

      const totalAvailable = medicine.batches.reduce(
        (sum, b) => sum + b.quantity_available,
        0
      );
      if (totalAvailable < item.quantity) {
        throw new Error(
          `Insufficient stock for ${medicine.name}. Available: ${totalAvailable}, Requested: ${item.quantity}`
        );
      }

      let remaining = item.quantity;
      for (const batch of medicine.batches) {
        if (remaining <= 0) break;
        const take = Math.min(batch.quantity_available, remaining);
        const itemCogs = take * batch.purchase_price;

        // Deduct batch stock
        await tx.medicineBatch.update({
          where: { id: batch.id },
          data: {
            quantity_available: batch.quantity_available - take,
          },
        });

        saleItemCreates.push({
          batch_id: batch.id,
          quantity: take,
          unit_price: item.unitPrice,
          cogs: itemCogs,
        });

        saleTotalCogs += itemCogs;
        remaining -= take;
      }

      saleTotalAmount += item.quantity * item.unitPrice;
    }

    // 2. Validate Borrower if CREDIT mode
    let borrower = null;
    if (paymentMode === "CREDIT") {
      if (!borrowerId) {
        throw new Error("Borrower customer must be selected for Credit (Udhar) sales.");
      }
      borrower = await tx.borrower.findFirst({
        where: { id: borrowerId, seller_id: sellerId },
      });
      if (!borrower) {
        throw new Error("Customer credit account not found.");
      }

      const newBalance = borrower.current_balance + saleTotalAmount;
      if (newBalance > borrower.credit_limit) {
        throw new Error(
          `Credit limit exceeded for ${borrower.full_name}! Limit: ${borrower.credit_limit}, Current: ${borrower.current_balance}, Attempted New Balance: ${newBalance}`
        );
      }
    }

    // 3. Create Sale Record
    const sale = await tx.sale.create({
      data: {
        seller_id: sellerId,
        invoice_number: invoiceNumber,
        total_amount: saleTotalAmount,
        total_cogs: saleTotalCogs,
        payment_mode: paymentMode,
        sale_items: {
          create: saleItemCreates,
        },
      },
      include: {
        sale_items: true,
      },
    });

    // 4. Update Borrower and create Credit Transaction if CREDIT mode
    if (paymentMode === "CREDIT" && borrower) {
      const updatedBalance = borrower.current_balance + saleTotalAmount;
      await tx.borrower.update({
        where: { id: borrower.id },
        data: {
          current_balance: updatedBalance,
          status: "PENDING",
        },
      });

      await tx.borrowerTransaction.create({
        data: {
          borrower_id: borrower.id,
          seller_id: sellerId,
          sale_id: sale.id,
          type: "CREDIT",
          payment_method: "CREDIT",
          amount: saleTotalAmount,
          status: "PENDING",
          notes: `Credit purchase on Invoice #${invoiceNumber}`,
        },
      });
    }

    return sale;
  });
}
