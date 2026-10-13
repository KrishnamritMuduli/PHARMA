import { prisma } from "./prisma";

export interface MedicineReplenishmentForecast {
  medicineId: string;
  medicineName: string;
  genericName: string | null;
  category: string | null;
  unit: string;
  currentStock: number;
  minThreshold: number;
  latestPurchasePrice: number;
  latestMrp: number;
  leadTimeDays: number;
  
  // ML Metrics
  salesLast30Days: number;
  dailyVelocity: number; // Sales Last 30 Days / 30
  weeklySlope: number; // Linear regression slope m
  trendDirection: "RISING" | "FALLING" | "STABLE";
  stockoutRisk: "CRITICAL" | "MODERATE" | "HEALTHY";
  
  // Formulas
  predicted30DayDemand: number;
  safetyBuffer: number;
  targetStock: number;
  recommendedOrderQty: number;
  estimatedBudget: number; // recommendedOrderQty * latestPurchasePrice
}

export interface ReplenishmentSummary {
  forecasts: MedicineReplenishmentForecast[];
  totalMedicinesAnalyzed: number;
  totalOrdersRecommended: number;
  totalEstimatedBudget: number;
  criticalStockCount: number;
  expiringStockBatchesCount: number;
}

/**
 * Computes simple linear regression slope (m) and intercept (b)
 * given arrays of (x, y) points.
 */
export function calculateLinearRegression(points: Array<{ x: number; y: number }>): {
  slope: number;
  intercept: number;
  r2: number;
} {
  const n = points.length;
  if (n <= 1) {
    return { slope: 0, intercept: points[0]?.y ?? 0, r2: 0 };
  }

  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (const p of points) {
    sumX += p.x;
    sumY += p.y;
    sumXY += p.x * p.y;
    sumX2 += p.x * p.x;
    sumY2 += p.y * p.y;
  }

  const denominator = n * sumX2 - sumX * sumX;
  if (denominator === 0) {
    return { slope: 0, intercept: sumY / n, r2: 0 };
  }

  const slope = (n * sumXY - sumX * sumY) / denominator;
  const intercept = (sumY - slope * sumX) / n;

  // Correlation coefficient squared (r^2)
  const yMean = sumY / n;
  let ssTotal = 0;
  let ssRes = 0;
  for (const p of points) {
    const predicted = slope * p.x + intercept;
    ssTotal += Math.pow(p.y - yMean, 2);
    ssRes += Math.pow(p.y - predicted, 2);
  }
  const r2 = ssTotal === 0 ? 1 : Math.max(0, 1 - ssRes / ssTotal);

  return { slope, intercept, r2 };
}

/**
 * Main predictive inventory replenishment engine.
 * Computes past 90 days sales velocity, weekly regression slope,
 * safety buffer, target stock, and procurement budget for each medicine.
 */
export async function generateReplenishmentForecasts(
  sellerId: string,
  options?: {
    leadTimeDays?: number;
    safetyFactor?: number;
  }
): Promise<ReplenishmentSummary> {
  const leadTimeDays = options?.leadTimeDays ?? 7;
  const safetyFactor = options?.safetyFactor ?? 1.25;

  const now = new Date();
  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(now.getDate() - 90);

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  // 1. Fetch all medicines for this seller with their batches
  const medicines = await prisma.medicine.findMany({
    where: { seller_id: sellerId },
    include: {
      batches: {
        orderBy: { purchase_date: "desc" },
      },
    },
    orderBy: { name: "asc" },
  });

  // 2. Fetch all sales within past 90 days with sale_items
  const sales90 = await prisma.sale.findMany({
    where: {
      seller_id: sellerId,
      sale_date: { gte: ninetyDaysAgo },
    },
    include: {
      sale_items: {
        include: {
          batch: true,
        },
      },
    },
    orderBy: { sale_date: "asc" },
  });

  // Count expiring soon batches (< 45 days)
  let expiringBatchesCount = 0;
  for (const med of medicines) {
    for (const b of med.batches) {
      if (b.quantity_available > 0) {
        const daysToExpiry = Math.ceil(
          (new Date(b.expiry_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysToExpiry <= 45) {
          expiringBatchesCount++;
        }
      }
    }
  }

  const forecasts: MedicineReplenishmentForecast[] = [];

  for (const med of medicines) {
    // Current stock on hand across all batches
    const currentStock = med.batches.reduce(
      (sum, b) => sum + b.quantity_available,
      0
    );

    // Latest purchase price and MRP
    const latestBatch = med.batches[0];
    const latestPurchasePrice = latestBatch?.purchase_price ?? 0;
    const latestMrp = latestBatch?.mrp ?? 0;

    // Filter sales for this medicine
    let totalSalesLast30Days = 0;
    // Map weekly sales across the 12-13 weeks in 90 days
    const weeklyBuckets: { [weekIdx: number]: number } = {};
    for (let w = 1; w <= 12; w++) {
      weeklyBuckets[w] = 0;
    }

    for (const s of sales90) {
      const saleDate = new Date(s.sale_date);
      const isLast30 = saleDate >= thirtyDaysAgo;

      for (const item of s.sale_items) {
        if (item.batch?.medicine_id === med.id) {
          const qty = item.quantity;
          if (isLast30) {
            totalSalesLast30Days += qty;
          }

          // Calculate week index from 90 days ago (1 to 12)
          const diffDays = Math.max(
            0,
            Math.floor(
              (saleDate.getTime() - ninetyDaysAgo.getTime()) / (1000 * 60 * 60 * 24)
            )
          );
          const weekIdx = Math.min(12, Math.max(1, Math.floor(diffDays / 7) + 1));
          weeklyBuckets[weekIdx] = (weeklyBuckets[weekIdx] || 0) + qty;
        }
      }
    }

    // Daily Velocity = Sales Last 30 Days / 30
    const dailyVelocity = parseFloat((totalSalesLast30Days / 30).toFixed(2));

    // Linear regression on weekly sales aggregates
    const regressionPoints = Object.entries(weeklyBuckets).map(([week, qty]) => ({
      x: parseInt(week, 10),
      y: qty,
    }));

    const { slope: weeklySlope } = calculateLinearRegression(regressionPoints);

    // Trend slope evaluation
    let trendDirection: "RISING" | "FALLING" | "STABLE" = "STABLE";
    if (weeklySlope > 0.35) {
      trendDirection = "RISING";
    } else if (weeklySlope < -0.35) {
      trendDirection = "FALLING";
    }

    // Trend adjustment: 30 days is ~4.3 weeks
    // Predicted 30-Day Demand = (Daily Velocity * 30) + (slope * 4.3)
    const baseDemand = dailyVelocity * 30;
    const trendAdjustment = weeklySlope * 4.3;
    const predicted30DayDemand = Math.max(
      0,
      Math.round(baseDemand + trendAdjustment)
    );

    // Safety Buffer = Lead Time * Daily Velocity * safetyFactor
    const calculatedBuffer = Math.ceil(
      leadTimeDays * Math.max(dailyVelocity, 0.5) * safetyFactor
    );
    const safetyBuffer = Math.max(med.min_stock_threshold, calculatedBuffer);

    // Replenishment Formula:
    // Target Stock = (Predicted 30-Day Demand) + Safety Buffer - Current On-Hand Stock
    const targetStock = predicted30DayDemand + safetyBuffer - currentStock;
    const recommendedOrderQty = Math.max(0, Math.ceil(targetStock));
    const estimatedBudget = parseFloat(
      (recommendedOrderQty * latestPurchasePrice).toFixed(2)
    );

    // Stockout Risk assessment
    let stockoutRisk: "CRITICAL" | "MODERATE" | "HEALTHY" = "HEALTHY";
    if (currentStock <= med.min_stock_threshold || currentStock === 0) {
      stockoutRisk = "CRITICAL";
    } else if (currentStock < safetyBuffer) {
      stockoutRisk = "MODERATE";
    }

    forecasts.push({
      medicineId: med.id,
      medicineName: med.name,
      genericName: med.generic_name,
      category: med.category,
      unit: med.unit,
      currentStock,
      minThreshold: med.min_stock_threshold,
      latestPurchasePrice,
      latestMrp,
      leadTimeDays,
      salesLast30Days: totalSalesLast30Days,
      dailyVelocity,
      weeklySlope: parseFloat(weeklySlope.toFixed(2)),
      trendDirection,
      stockoutRisk,
      predicted30DayDemand,
      safetyBuffer,
      targetStock,
      recommendedOrderQty,
      estimatedBudget,
    });
  }

  // Sort by highest replenishment priority (critical stock and highest recommended order)
  forecasts.sort((a, b) => {
    if (a.stockoutRisk === "CRITICAL" && b.stockoutRisk !== "CRITICAL") return -1;
    if (b.stockoutRisk === "CRITICAL" && a.stockoutRisk !== "CRITICAL") return 1;
    return b.recommendedOrderQty - a.recommendedOrderQty;
  });

  const totalOrdersRecommended = forecasts.filter(
    (f) => f.recommendedOrderQty > 0
  ).length;

  const totalEstimatedBudget = parseFloat(
    forecasts.reduce((sum, f) => sum + f.estimatedBudget, 0).toFixed(2)
  );

  const criticalStockCount = forecasts.filter(
    (f) => f.stockoutRisk === "CRITICAL"
  ).length;

  return {
    forecasts,
    totalMedicinesAnalyzed: forecasts.length,
    totalOrdersRecommended,
    totalEstimatedBudget,
    criticalStockCount,
    expiringStockBatchesCount: expiringBatchesCount,
  };
}
