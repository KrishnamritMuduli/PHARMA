import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting PharmaPulse Seed script...");

  // 1. Clean existing database
  await prisma.borrowerTransaction.deleteMany();
  await prisma.saleItem.deleteMany();
  await prisma.sale.deleteMany();
  await prisma.borrower.deleteMany();
  await prisma.medicineBatch.deleteMany();
  await prisma.medicine.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.seller.deleteMany();

  console.log("🧹 Cleaned database tables.");

  // 2. Create Demo Seller
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash("admin123", salt);

  const seller = await prisma.seller.create({
    data: {
      pharmacy_name: "Apex Life Pharmacy & Wellness",
      email: "demo@pharmpulse.com",
      password_hash: passwordHash,
      license_number: "DL-2026-DL-78219B",
      gst_number: "07AAAAA0000A1Z5",
      phone: "+91 98765 43210",
      address: "SCO 42-43, Sector 14, Ring Road, New Delhi, 110001",
    },
  });

  console.log(`✅ Created Seller: ${seller.pharmacy_name} (${seller.email})`);

  // 3. Define Medicine Catalog
  const medicinesData = [
    { name: "Paracetamol 650mg (Dolo)", generic_name: "Paracetamol", category: "Analgesic & Antipyretic", unit: "strips", min_stock_threshold: 40 },
    { name: "Amoxicillin & Clavulanate 625mg (Augmentin)", generic_name: "Amoxicillin + Clavulanic Acid", category: "Antibiotic", unit: "strips", min_stock_threshold: 25 },
    { name: "Azithromycin 500mg (Azee)", generic_name: "Azithromycin", category: "Antibiotic", unit: "strips", min_stock_threshold: 20 },
    { name: "Metformin 500mg ER (Glycomet)", generic_name: "Metformin Hydrochloride", category: "Anti-Diabetic", unit: "strips", min_stock_threshold: 50 },
    { name: "Atorvastatin 20mg (Atorva)", generic_name: "Atorvastatin", category: "Cardiovascular", unit: "strips", min_stock_threshold: 30 },
    { name: "Pantoprazole 40mg (Pan-40)", generic_name: "Pantoprazole", category: "Gastrointestinal", unit: "strips", min_stock_threshold: 40 },
    { name: "Telmisartan 40mg (Telma)", generic_name: "Telmisartan", category: "Cardiovascular", unit: "strips", min_stock_threshold: 35 },
    { name: "Montelukast & Levocetirizine (Montair-LC)", generic_name: "Montelukast + Levocetirizine", category: "Respiratory", unit: "strips", min_stock_threshold: 30 },
    { name: "Cough Syrup 100ml (Ascoril-D)", generic_name: "Dextromethorphan + Phenylephrine", category: "Respiratory", unit: "bottles", min_stock_threshold: 15 },
    { name: "Vitamin D3 60K UI (Calcirol)", generic_name: "Cholecalciferol", category: "Vitamins & Supplements", unit: "sachets", min_stock_threshold: 25 },
    { name: "Omeprazole 20mg (Omez)", generic_name: "Omeprazole", category: "Gastrointestinal", unit: "strips", min_stock_threshold: 30 },
    { name: "Cetirizine 10mg (Cetzine)", generic_name: "Cetirizine Hydrochloride", category: "Antihistamine", unit: "strips", min_stock_threshold: 20 },
    { name: "Ibuprofen 400mg (Brufen)", generic_name: "Ibuprofen", category: "Analgesic & NSAID", unit: "strips", min_stock_threshold: 25 },
    { name: "Ciprofloxacin 500mg (Ciplox)", generic_name: "Ciprofloxacin", category: "Antibiotic", unit: "strips", min_stock_threshold: 15 },
    { name: "B-Complex + Zinc (Becosules)", generic_name: "Vitamin B-Complex + Zinc", category: "Vitamins & Supplements", unit: "strips", min_stock_threshold: 35 },
  ];

  const createdMedicines = [];
  for (const m of medicinesData) {
    const med = await prisma.medicine.create({
      data: {
        seller_id: seller.id,
        name: m.name,
        generic_name: m.generic_name,
        category: m.category,
        unit: m.unit,
        min_stock_threshold: m.min_stock_threshold,
      },
    });
    createdMedicines.push(med);
  }
  console.log(`✅ Created ${createdMedicines.length} Medicines in catalog.`);

  // 4. Create Batches with realistic expiry dates
  // Today date reference
  const now = new Date();
  const manufacturers = ["Sun Pharma", "Cipla Ltd", "Dr. Reddy's", "Abbott Healthcare", "Torrent Pharma", "Lupin Ltd", "Mankind Pharma"];

  const createdBatches = [];

  // Seed batches per medicine
  for (let i = 0; i < createdMedicines.length; i++) {
    const med = createdMedicines[i];
    const basePrice = 25 + (i * 12) % 180;
    const baseMrp = Math.round(basePrice * 1.35 + 10);

    // Batch 1: Standard expiry (12-18 months ahead)
    const exp1 = new Date(now);
    exp1.setMonth(now.getMonth() + 14 + (i % 6));
    const b1 = await prisma.medicineBatch.create({
      data: {
        medicine_id: med.id,
        seller_id: seller.id,
        batch_number: `BAT-2026-${100 + i}`,
        manufacturer: manufacturers[i % manufacturers.length],
        quantity_received: 120 + (i % 5) * 20,
        quantity_available: 85 + (i % 5) * 15,
        purchase_price: basePrice,
        mrp: baseMrp,
        expiry_date: exp1,
        purchase_date: new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000),
      },
    });
    createdBatches.push(b1);

    // Batch 2: Some medicines have an earlier batch expiring soon (< 45 days) or expired
    if (i % 3 === 0) {
      const expSoon = new Date(now);
      expSoon.setDate(now.getDate() + 22); // Expiring in 22 days!
      const b2 = await prisma.medicineBatch.create({
        data: {
          medicine_id: med.id,
          seller_id: seller.id,
          batch_number: `BAT-2025-${900 + i}`,
          manufacturer: manufacturers[(i + 1) % manufacturers.length],
          quantity_received: 50,
          quantity_available: 12,
          purchase_price: Math.round(basePrice * 0.95),
          mrp: baseMrp,
          expiry_date: expSoon,
          purchase_date: new Date(now.getTime() - 120 * 24 * 60 * 60 * 1000),
        },
      });
      createdBatches.push(b2);
    } else if (i === 4) {
      // One batch expired for audit/write-off demonstration
      const expPast = new Date(now);
      expPast.setDate(now.getDate() - 10); // Expired 10 days ago!
      const bExpired = await prisma.medicineBatch.create({
        data: {
          medicine_id: med.id,
          seller_id: seller.id,
          batch_number: `BAT-EXP-${800 + i}`,
          manufacturer: manufacturers[2],
          quantity_received: 30,
          quantity_available: 8,
          purchase_price: basePrice,
          mrp: baseMrp,
          expiry_date: expPast,
          purchase_date: new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
        },
      });
      createdBatches.push(bExpired);
    }
  }

  console.log(`✅ Created ${createdBatches.length} Batches with FIFO pricing & expiry tagging.`);

  // 5. Create Borrowers (Khata / Udhar accounts)
  const borrowersData = [
    { full_name: "Ramesh Sharma", phone: "9811223344", credit_limit: 5000, current_balance: 1450, status: "PARTIAL" },
    { full_name: "Anita Verma", phone: "9877665544", credit_limit: 8000, current_balance: 3200, status: "PENDING" },
    { full_name: "Rajesh Kumar Gupta", phone: "9822334455", credit_limit: 6000, current_balance: 0, status: "SETTLED" },
    { full_name: "Sunita Roy", phone: "9899112233", credit_limit: 4000, current_balance: 850, status: "PENDING" },
    { full_name: "Dr. Vikram Sethi (Clinic)", phone: "9844556677", credit_limit: 15000, current_balance: 4800, status: "PARTIAL" },
  ];

  const createdBorrowers = [];
  for (const b of borrowersData) {
    const borrower = await prisma.borrower.create({
      data: {
        seller_id: seller.id,
        full_name: b.full_name,
        phone: b.phone,
        credit_limit: b.credit_limit,
        current_balance: b.current_balance,
        status: b.status,
      },
    });
    createdBorrowers.push(borrower);
  }
  console.log(`✅ Created ${createdBorrowers.length} Borrower accounts.`);

  // 6. Generate 60 days of historical sales for ML velocity & P&L trends
  console.log("⏳ Generating 60 days of daily sales for analytics & ML forecasting...");
  let invoiceCounter = 1001;

  for (let dayOffset = 60; dayOffset >= 0; dayOffset--) {
    const saleDate = new Date(now.getTime() - dayOffset * 24 * 60 * 60 * 1000);
    // Number of sales on this day: 2 to 5 sales per day
    const salesCountThisDay = 2 + ((dayOffset * 3) % 4);

    for (let s = 0; s < salesCountThisDay; s++) {
      invoiceCounter++;
      const invoiceNumber = `INV-${saleDate.toISOString().slice(0, 10).replace(/-/g, "")}-${invoiceCounter}`;

      // Pick 1 to 3 items per sale
      const numItems = 1 + ((s + dayOffset) % 3);
      let saleTotalAmount = 0;
      let saleTotalCogs = 0;
      const saleItemsToCreate = [];

      for (let it = 0; it < numItems; it++) {
        const batchIdx = (s * 3 + it + dayOffset) % createdBatches.length;
        const batch = createdBatches[batchIdx];
        const qty = 1 + ((it + dayOffset) % 4);
        const unitPrice = batch.mrp;
        const cogs = qty * batch.purchase_price;

        saleTotalAmount += qty * unitPrice;
        saleTotalCogs += cogs;

        saleItemsToCreate.push({
          batch_id: batch.id,
          quantity: qty,
          unit_price: unitPrice,
          cogs: cogs,
        });
      }

      const paymentModes = ["CASH", "ONLINE", "CASH", "CASH", "ONLINE"];
      const paymentMode = paymentModes[(s + dayOffset) % paymentModes.length];

      await prisma.sale.create({
        data: {
          seller_id: seller.id,
          invoice_number: invoiceNumber,
          total_amount: saleTotalAmount,
          total_cogs: saleTotalCogs,
          payment_mode: paymentMode,
          sale_date: saleDate,
          sale_items: {
            create: saleItemsToCreate,
          },
        },
      });
    }
  }

  // 7. Create Borrower transactions (Khata ledger history)
  const b1 = createdBorrowers[0]; // Ramesh Sharma
  await prisma.borrowerTransaction.create({
    data: {
      borrower_id: b1.id,
      seller_id: seller.id,
      type: "CREDIT",
      payment_method: "CREDIT",
      amount: 2450,
      status: "PARTIAL",
      notes: "Prescription medicines for diabetes and blood pressure",
      created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.borrowerTransaction.create({
    data: {
      borrower_id: b1.id,
      seller_id: seller.id,
      type: "PAYMENT",
      payment_method: "UPI",
      amount: 1000,
      status: "SETTLED",
      notes: "GPay partial repayment received",
      created_at: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
    },
  });

  const b2 = createdBorrowers[1]; // Anita Verma
  await prisma.borrowerTransaction.create({
    data: {
      borrower_id: b2.id,
      seller_id: seller.id,
      type: "CREDIT",
      payment_method: "CREDIT",
      amount: 3200,
      status: "PENDING",
      notes: "Post-hospitalization recovery supplies",
      created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
    },
  });

  const b3 = createdBorrowers[2]; // Rajesh Kumar Gupta (settled)
  await prisma.borrowerTransaction.create({
    data: {
      borrower_id: b3.id,
      seller_id: seller.id,
      type: "CREDIT",
      payment_method: "CREDIT",
      amount: 1800,
      status: "SETTLED",
      notes: "Antibiotic course",
      created_at: new Date(now.getTime() - 20 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.borrowerTransaction.create({
    data: {
      borrower_id: b3.id,
      seller_id: seller.id,
      type: "PAYMENT",
      payment_method: "CASH",
      amount: 1800,
      status: "SETTLED",
      notes: "Full settlement paid in cash",
      created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
    },
  });

  // 8. Operating Expenses for Net Profit calculation
  await prisma.expense.createMany({
    data: [
      {
        seller_id: seller.id,
        category: "RENT",
        title: "Shop Commercial Lease - Current Month",
        amount: 22000,
        expense_date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000),
      },
      {
        seller_id: seller.id,
        category: "STAFF_SALARY",
        title: "Pharmacist Assistant Salary",
        amount: 18000,
        expense_date: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        seller_id: seller.id,
        category: "UTILITIES",
        title: "Cold Chain Refrigerator Electricity & Backup",
        amount: 3800,
        expense_date: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        seller_id: seller.id,
        category: "INVENTORY_WRITEOFF",
        title: "Expired Atorva Batch #BAT-EXP-804 write-off",
        amount: 680,
        expense_date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
    ],
  });

  console.log("✅ Created Operating Expenses for Net Profit analytics.");
  console.log("\n🚀 Seeding finished successfully!");
  console.log("Credentials:");
  console.log("Email: demo@pharmpulse.com");
  console.log("Password: admin123");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
