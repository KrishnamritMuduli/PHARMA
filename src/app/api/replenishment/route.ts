import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedSeller } from "@/lib/auth";
import { generateReplenishmentForecasts } from "@/lib/ml-replenishment";

export async function GET(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const format = searchParams.get("format"); // "csv" or "json"
  const leadTimeDays = parseInt(searchParams.get("leadTime") || "7", 10);

  try {
    const summary = await generateReplenishmentForecasts(seller.id, {
      leadTimeDays,
    });

    if (format === "csv") {
      // Generate CSV string
      const headers = [
        "Medicine Name",
        "Generic Name",
        "Category",
        "Current Stock",
        "Daily Velocity",
        "Weekly Slope (m)",
        "Trend Direction",
        "Stockout Risk",
        "Projected 30-Day Demand",
        "Safety Buffer",
        "Target Stock",
        "Recommended Order Qty",
        "Unit Purchase Price",
        "Estimated Budget (INR)",
      ];

      const rows = summary.forecasts.map((f) => [
        `"${f.medicineName.replace(/"/g, '""')}"`,
        `"${(f.genericName || "").replace(/"/g, '""')}"`,
        `"${(f.category || "").replace(/"/g, '""')}"`,
        f.currentStock,
        f.dailyVelocity,
        f.weeklySlope,
        f.trendDirection,
        f.stockoutRisk,
        f.predicted30DayDemand,
        f.safetyBuffer,
        f.targetStock,
        f.recommendedOrderQty,
        f.latestPurchasePrice,
        f.estimatedBudget,
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

      return new NextResponse(csvContent, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="replenishment-orders-${new Date()
            .toISOString()
            .slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json({
      summary,
      seller: {
        pharmacy_name: seller.pharmacy_name,
        license_number: seller.license_number,
        gst_number: seller.gst_number,
        phone: seller.phone,
        address: seller.address,
      },
    });
  } catch (error: any) {
    console.error("Replenishment ML prediction error:", error);
    return NextResponse.json(
      { error: "Failed to generate replenishment predictions." },
      { status: 500 }
    );
  }
}
