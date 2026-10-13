import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const medicines = await prisma.medicine.findMany({
      where: { seller_id: seller.id },
      include: {
        batches: {
          orderBy: { expiry_date: "asc" },
        },
      },
      orderBy: { name: "asc" },
    });

    const enriched = medicines.map((m) => {
      const totalStock = m.batches.reduce((sum, b) => sum + b.quantity_available, 0);
      const activeBatches = m.batches.filter((b) => b.quantity_available > 0);
      const latestBatch = m.batches[m.batches.length - 1];

      return {
        id: m.id,
        name: m.name,
        generic_name: m.generic_name,
        category: m.category,
        unit: m.unit,
        min_stock_threshold: m.min_stock_threshold,
        total_stock: totalStock,
        active_batches_count: activeBatches.length,
        latest_purchase_price: latestBatch?.purchase_price ?? 0,
        latest_mrp: latestBatch?.mrp ?? 0,
        is_low_stock: totalStock <= m.min_stock_threshold,
        is_out_of_stock: totalStock === 0,
        batches: m.batches,
      };
    });

    return NextResponse.json({ medicines: enriched });
  } catch (error: any) {
    console.error("Fetch medicines error:", error);
    return NextResponse.json({ error: "Failed to fetch medicines." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { name, generic_name, category, unit, min_stock_threshold } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json({ error: "Medicine name is required." }, { status: 400 });
    }

    const medicine = await prisma.medicine.create({
      data: {
        seller_id: seller.id,
        name: name.trim(),
        generic_name: generic_name?.trim() || null,
        category: category?.trim() || "General",
        unit: unit?.trim() || "strips",
        min_stock_threshold: Number(min_stock_threshold) || 10,
      },
    });

    return NextResponse.json({ message: "Medicine created successfully", medicine }, { status: 201 });
  } catch (error: any) {
    console.error("Create medicine error:", error);
    return NextResponse.json({ error: "Failed to create medicine." }, { status: 500 });
  }
}
