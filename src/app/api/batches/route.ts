import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";
import { getExpiryStatus } from "@/lib/utils";

export async function GET(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const filterStatus = searchParams.get("status"); // all, expiring_soon, expired, normal
  const medicineId = searchParams.get("medicineId");

  try {
    const whereClause: any = {
      seller_id: seller.id,
    };

    if (medicineId) {
      whereClause.medicine_id = medicineId;
    }

    const batches = await prisma.medicineBatch.findMany({
      where: whereClause,
      include: {
        medicine: true,
      },
      orderBy: { expiry_date: "asc" },
    });

    const enrichedBatches = batches.map((b) => {
      const expiryMeta = getExpiryStatus(b.expiry_date);
      return {
        id: b.id,
        medicine_id: b.medicine_id,
        medicine_name: b.medicine.name,
        generic_name: b.medicine.generic_name,
        unit: b.medicine.unit,
        batch_number: b.batch_number,
        manufacturer: b.manufacturer,
        quantity_received: b.quantity_received,
        quantity_available: b.quantity_available,
        purchase_price: b.purchase_price,
        mrp: b.mrp,
        expiry_date: b.expiry_date,
        purchase_date: b.purchase_date,
        expiry_status: expiryMeta.status,
        expiry_label: expiryMeta.label,
        days_remaining: expiryMeta.daysRemaining,
      };
    });

    let filtered = enrichedBatches;
    if (filterStatus && filterStatus !== "all") {
      filtered = enrichedBatches.filter(
        (b) => b.expiry_status.toLowerCase() === filterStatus.toLowerCase()
      );
    }

    const counts = {
      total: enrichedBatches.length,
      normal: enrichedBatches.filter((b) => b.expiry_status === "NORMAL").length,
      expiring_soon: enrichedBatches.filter(
        (b) => b.expiry_status === "EXPIRING_SOON"
      ).length,
      expired: enrichedBatches.filter((b) => b.expiry_status === "EXPIRED").length,
    };

    return NextResponse.json({ batches: filtered, counts });
  } catch (error: any) {
    console.error("Fetch batches error:", error);
    return NextResponse.json({ error: "Failed to fetch batches." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      medicine_id,
      medicine_name,
      generic_name,
      category,
      unit,
      batch_number,
      manufacturer,
      quantity_received,
      purchase_price,
      mrp,
      expiry_date,
      purchase_date,
    } = body;

    if (!batch_number || !quantity_received || !purchase_price || !mrp || !expiry_date) {
      return NextResponse.json(
        { error: "Batch number, quantity received, purchase price, MRP, and expiry date are required." },
        { status: 400 }
      );
    }

    let resolvedMedicineId = medicine_id;

    // If medicine_id not provided, check or create medicine by name
    if (!resolvedMedicineId) {
      if (!medicine_name) {
        return NextResponse.json({ error: "Medicine name is required." }, { status: 400 });
      }

      let med = await prisma.medicine.findFirst({
        where: {
          seller_id: seller.id,
          name: { equals: medicine_name.trim() },
        },
      });

      if (!med) {
        med = await prisma.medicine.create({
          data: {
            seller_id: seller.id,
            name: medicine_name.trim(),
            generic_name: generic_name?.trim() || null,
            category: category?.trim() || "General",
            unit: unit?.trim() || "strips",
            min_stock_threshold: 15,
          },
        });
      }
      resolvedMedicineId = med.id;
    }

    const qty = parseInt(quantity_received, 10);
    const pPrice = parseFloat(purchase_price);
    const mrpPrice = parseFloat(mrp);
    const expDate = new Date(expiry_date);
    const purDate = purchase_date ? new Date(purchase_date) : new Date();

    const batch = await prisma.medicineBatch.create({
      data: {
        medicine_id: resolvedMedicineId,
        seller_id: seller.id,
        batch_number: batch_number.trim(),
        manufacturer: manufacturer?.trim() || "Standard Pharma",
        quantity_received: qty,
        quantity_available: qty,
        purchase_price: pPrice,
        mrp: mrpPrice,
        expiry_date: expDate,
        purchase_date: purDate,
      },
      include: {
        medicine: true,
      },
    });

    return NextResponse.json(
      { message: "Batch logged successfully into inventory", batch },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Batch intake error:", error);
    return NextResponse.json({ error: "Failed to record batch intake." }, { status: 500 });
  }
}
