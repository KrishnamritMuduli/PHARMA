import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";
import { executeFifoCheckout } from "@/lib/fifo";
import { generateInvoiceNumber } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limit = parseInt(searchParams.get("limit") || "50", 10);

  try {
    const sales = await prisma.sale.findMany({
      where: { seller_id: seller.id },
      include: {
        sale_items: {
          include: {
            batch: {
              include: {
                medicine: true,
              },
            },
          },
        },
        borrower_transactions: {
          include: {
            borrower: true,
          },
        },
      },
      orderBy: { sale_date: "desc" },
      take: limit,
    });

    const enriched = sales.map((s) => {
      const grossProfit = s.total_amount - s.total_cogs;
      const margin = s.total_amount > 0 ? (grossProfit / s.total_amount) * 100 : 0;
      const borrowerTx = s.borrower_transactions[0];

      return {
        id: s.id,
        invoice_number: s.invoice_number,
        total_amount: s.total_amount,
        total_cogs: s.total_cogs,
        gross_profit: parseFloat(grossProfit.toFixed(2)),
        profit_margin: parseFloat(margin.toFixed(1)),
        payment_mode: s.payment_mode,
        sale_date: s.sale_date,
        item_count: s.sale_items.length,
        borrower_name: borrowerTx?.borrower?.full_name || null,
        sale_items: s.sale_items.map((it) => ({
          id: it.id,
          medicine_name: it.batch?.medicine?.name || "Medicine",
          batch_number: it.batch?.batch_number || "N/A",
          expiry_date: it.batch?.expiry_date,
          quantity: it.quantity,
          unit_price: it.unit_price,
          cogs: it.cogs,
        })),
      };
    });

    return NextResponse.json({ sales: enriched });
  } catch (error: any) {
    console.error("Fetch sales error:", error);
    return NextResponse.json({ error: "Failed to fetch sales." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { items, payment_mode = "CASH", borrower_id } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Cart cannot be empty. Please add medicines." },
        { status: 400 }
      );
    }

    const invoiceNumber = generateInvoiceNumber();

    const sale = await executeFifoCheckout(
      seller.id,
      invoiceNumber,
      payment_mode,
      items.map((it) => ({
        medicineId: it.medicineId,
        quantity: parseInt(it.quantity, 10),
        unitPrice: parseFloat(it.unitPrice),
      })),
      borrower_id
    );

    return NextResponse.json(
      {
        message: "Sale processed successfully with FIFO stock deduction.",
        sale,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Sale checkout error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to complete checkout." },
      { status: 400 }
    );
  }
}
