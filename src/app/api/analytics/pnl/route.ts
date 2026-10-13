import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedSeller } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const seller = await getAuthenticatedSeller(req);
  if (!seller) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const timeRange = searchParams.get("range") || "monthly"; // daily, weekly, monthly, custom
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");

  const now = new Date();
  let startDate = new Date();
  let endDate = new Date(now);

  if (timeRange === "daily") {
    startDate.setHours(0, 0, 0, 0);
  } else if (timeRange === "weekly") {
    startDate.setDate(now.getDate() - 7);
  } else if (timeRange === "monthly") {
    startDate.setDate(now.getDate() - 30);
  } else if (timeRange === "custom" && startDateParam && endDateParam) {
    startDate = new Date(startDateParam);
    endDate = new Date(endDateParam);
    endDate.setHours(23, 59, 59, 999);
  } else {
    // default 30 days
    startDate.setDate(now.getDate() - 30);
  }

  try {
    // 1. Fetch sales in date range
    const sales = await prisma.sale.findMany({
      where: {
        seller_id: seller.id,
        sale_date: {
          gte: startDate,
          lte: endDate,
        },
      },
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
      },
      orderBy: { sale_date: "asc" },
    });

    // 2. Fetch Borrower Payments (repayments collected) in date range
    const paymentsCollected = await prisma.borrowerTransaction.findMany({
      where: {
        seller_id: seller.id,
        type: "PAYMENT",
        created_at: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalRepaymentsCollected = paymentsCollected.reduce(
      (sum, p) => sum + p.amount,
      0
    );

    // 3. Fetch Operating Expenses in date range
    const expenses = await prisma.expense.findMany({
      where: {
        seller_id: seller.id,
        expense_date: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const totalOperatingExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const expiredWriteOffs = expenses
      .filter((e) => e.category === "INVENTORY_WRITEOFF")
      .reduce((sum, e) => sum + e.amount, 0);

    // 4. Unrealized Receivables (Total pending borrower balance today)
    const borrowers = await prisma.borrower.findMany({
      where: { seller_id: seller.id },
      select: { current_balance: true },
    });
    const unrealizedReceivables = borrowers.reduce(
      (sum, b) => sum + b.current_balance,
      0
    );

    // 5. Aggregate Sales Numbers
    let directSalesRevenue = 0; // CASH and ONLINE sales
    let creditSalesIssued = 0; // CREDIT sales
    let totalCogs = 0;

    const timelineMap: {
      [key: string]: {
        date: string;
        revenue: number;
        cogs: number;
        grossProfit: number;
        salesCount: number;
      };
    } = {};

    const medicineSalesMap: {
      [id: string]: {
        name: string;
        category: string;
        quantity: number;
        revenue: number;
        cogs: number;
        profit: number;
      };
    } = {};

    for (const s of sales) {
      if (s.payment_mode === "CREDIT") {
        creditSalesIssued += s.total_amount;
      } else {
        directSalesRevenue += s.total_amount;
      }
      totalCogs += s.total_cogs;

      const dateKey = new Date(s.sale_date).toISOString().slice(0, 10);
      if (!timelineMap[dateKey]) {
        timelineMap[dateKey] = {
          date: dateKey,
          revenue: 0,
          cogs: 0,
          grossProfit: 0,
          salesCount: 0,
        };
      }
      timelineMap[dateKey].revenue += s.total_amount;
      timelineMap[dateKey].cogs += s.total_cogs;
      timelineMap[dateKey].grossProfit += s.total_amount - s.total_cogs;
      timelineMap[dateKey].salesCount += 1;

      // Item aggregates for top 10
      for (const item of s.sale_items) {
        const medId = item.batch?.medicine_id || "unknown";
        const medName = item.batch?.medicine?.name || "Other Medicine";
        const medCat = item.batch?.medicine?.category || "General";
        const itemRev = item.quantity * item.unit_price;

        if (!medicineSalesMap[medId]) {
          medicineSalesMap[medId] = {
            name: medName,
            category: medCat,
            quantity: 0,
            revenue: 0,
            cogs: 0,
            profit: 0,
          };
        }
        medicineSalesMap[medId].quantity += item.quantity;
        medicineSalesMap[medId].revenue += itemRev;
        medicineSalesMap[medId].cogs += item.cogs;
        medicineSalesMap[medId].profit += itemRev - item.cogs;
      }
    }

    // Specification: Total Revenue = Cash sales + received credit settlements (plus online)
    const totalRevenue = directSalesRevenue + totalRepaymentsCollected;
    const grossProfit = totalRevenue - totalCogs;
    const grossMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    const netProfit = grossProfit - totalOperatingExpenses;
    const netMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;

    // Timeline array sorted by date
    const timeline = Object.values(timelineMap).sort((a, b) =>
      a.date.localeCompare(b.date)
    );

    // Top 10 selling medicines by quantity sold
    const topMedicines = Object.values(medicineSalesMap)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    // Profit margin distribution (categories)
    const categoryDistribution: {
      [cat: string]: { category: string; revenue: number; profit: number };
    } = {};
    for (const med of Object.values(medicineSalesMap)) {
      if (!categoryDistribution[med.category]) {
        categoryDistribution[med.category] = {
          category: med.category,
          revenue: 0,
          profit: 0,
        };
      }
      categoryDistribution[med.category].revenue += med.revenue;
      categoryDistribution[med.category].profit += med.profit;
    }

    return NextResponse.json({
      metrics: {
        totalRevenue: parseFloat(totalRevenue.toFixed(2)),
        directSalesRevenue: parseFloat(directSalesRevenue.toFixed(2)),
        totalRepaymentsCollected: parseFloat(totalRepaymentsCollected.toFixed(2)),
        creditSalesIssued: parseFloat(creditSalesIssued.toFixed(2)),
        totalCogs: parseFloat(totalCogs.toFixed(2)),
        grossProfit: parseFloat(grossProfit.toFixed(2)),
        grossMargin: parseFloat(grossMargin.toFixed(1)),
        netProfit: parseFloat(netProfit.toFixed(2)),
        netMargin: parseFloat(netMargin.toFixed(1)),
        totalOperatingExpenses: parseFloat(totalOperatingExpenses.toFixed(2)),
        expiredWriteOffs: parseFloat(expiredWriteOffs.toFixed(2)),
        unrealizedReceivables: parseFloat(unrealizedReceivables.toFixed(2)),
        salesCount: sales.length,
      },
      timeline,
      topMedicines,
      categoryDistribution: Object.values(categoryDistribution),
      expenses,
      timeRange,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });
  } catch (error: any) {
    console.error("P&L Analytics error:", error);
    return NextResponse.json({ error: "Failed to generate P&L analytics." }, { status: 500 });
  }
}
