"use client";

import { useEffect, useState } from "react";
import {
  BrainCircuit,
  Download,
  Printer,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Package,
  DollarSign,
  ShieldAlert,
  Sliders,
  CheckCircle2,
  FileSpreadsheet,
  FileText,
  Building,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface MedicineForecast {
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
  salesLast30Days: number;
  dailyVelocity: number;
  weeklySlope: number;
  trendDirection: "RISING" | "FALLING" | "STABLE";
  stockoutRisk: "CRITICAL" | "MODERATE" | "HEALTHY";
  predicted30DayDemand: number;
  safetyBuffer: number;
  targetStock: number;
  recommendedOrderQty: number;
  estimatedBudget: number;
}

interface ReplenishmentResponse {
  summary: {
    forecasts: MedicineForecast[];
    totalMedicinesAnalyzed: number;
    totalOrdersRecommended: number;
    totalEstimatedBudget: number;
    criticalStockCount: number;
    expiringStockBatchesCount: number;
  };
  seller: {
    pharmacy_name: string;
    license_number: string | null;
    gst_number: string | null;
    phone: string | null;
    address: string | null;
  };
}

export default function ReplenishmentPage() {
  const [data, setData] = useState<ReplenishmentResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [leadTime, setLeadTime] = useState(7);
  const [riskFilter, setRiskFilter] = useState<"ALL" | "CRITICAL" | "ORDERS_ONLY">("ALL");
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);

  const fetchForecasts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/replenishment?leadTime=${leadTime}`);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load replenishment forecasts", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecasts();
  }, [leadTime]);

  const handleDownloadCsv = () => {
    window.open(`/api/replenishment?format=csv&leadTime=${leadTime}`, "_blank");
  };

  const handlePrintPo = () => {
    window.print();
  };

  const forecasts = data?.summary.forecasts || [];

  const filteredForecasts = forecasts.filter((f) => {
    if (riskFilter === "CRITICAL") return f.stockoutRisk === "CRITICAL";
    if (riskFilter === "ORDERS_ONLY") return f.recommendedOrderQty > 0;
    return true;
  });

  const poItems = forecasts.filter((f) => f.recommendedOrderQty > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
              <BrainCircuit className="h-4 w-4" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Predictive Replenishment Engine
            </h1>
          </div>
          <p className="text-sm text-slate-400 mt-1">
            Linear demand regression ($y = mx + b$), sales velocity run-rates, and dynamic stock target calculations
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={handleDownloadCsv}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700/80 transition-all flex items-center gap-1.5 shadow"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={() => setIsPoModalOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-1.5"
          >
            <Printer className="h-4 w-4" />
            Generate Purchase Order (PO)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      {data && (
        <div className="no-print grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Procurement Budget Required
            </span>
            <div className="mt-2 text-2xl font-bold text-emerald-400">
              {formatCurrency(data.summary.totalEstimatedBudget)}
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              For {data.summary.totalOrdersRecommended} recommended items
            </p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Critical Stock SKUs
            </span>
            <div className="mt-2 text-2xl font-bold text-rose-400">
              {data.summary.criticalStockCount} Medicines
            </div>
            <p className="text-[11px] text-slate-400 mt-1">At or below safety threshold</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Catalog Analyzed
            </span>
            <div className="mt-2 text-2xl font-bold text-white">
              {data.summary.totalMedicinesAnalyzed} SKUs
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Past 90-day regression window</p>
          </div>

          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Lead Time Setting
            </span>
            <div className="mt-2 text-2xl font-bold text-cyan-400">
              {leadTime} Days
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="text-[11px] text-slate-400">Adjust:</span>
              {[5, 7, 10, 14].map((d) => (
                <button
                  key={d}
                  onClick={() => setLeadTime(d)}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    leadTime === d
                      ? "bg-cyan-500 text-white font-bold"
                      : "bg-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter Selector */}
      <div className="no-print flex items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setRiskFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              riskFilter === "ALL" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            All Medicines ({forecasts.length})
          </button>
          <button
            onClick={() => setRiskFilter("ORDERS_ONLY")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              riskFilter === "ORDERS_ONLY" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Needs Reorder ({poItems.length})
          </button>
          <button
            onClick={() => setRiskFilter("CRITICAL")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              riskFilter === "CRITICAL" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Critical Stock
          </button>
        </div>

        <div className="text-xs text-slate-400 hidden sm:block">
          Formula: <span className="font-mono text-emerald-400">Target Stock = (30d Demand) + Safety Buffer - On-Hand</span>
        </div>
      </div>

      {/* Forecast Table */}
      <div className="no-print bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Medicine Name</th>
                <th className="py-3.5 px-4 font-semibold">Current Stock</th>
                <th className="py-3.5 px-4 font-semibold">Daily Velocity</th>
                <th className="py-3.5 px-4 font-semibold">Weekly Slope (m)</th>
                <th className="py-3.5 px-4 font-semibold">Projected 30d Demand</th>
                <th className="py-3.5 px-4 font-semibold">Safety Buffer</th>
                <th className="py-3.5 px-4 font-semibold">Recommended Order</th>
                <th className="py-3.5 px-4 font-semibold text-right">Est. Budget</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    Running regression algorithms and velocity analysis...
                  </td>
                </tr>
              ) : filteredForecasts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
                    No medicines match the selected filter.
                  </td>
                </tr>
              ) : (
                filteredForecasts.map((f) => {
                  return (
                    <tr key={f.medicineId} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{f.medicineName}</div>
                        <div className="text-xs text-slate-400">
                          {f.genericName || f.category || "General"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-bold text-base ${
                              f.stockoutRisk === "CRITICAL"
                                ? "text-rose-400"
                                : f.stockoutRisk === "MODERATE"
                                ? "text-amber-400"
                                : "text-slate-200"
                            }`}
                          >
                            {f.currentStock}
                          </span>
                          <span className="text-xs text-slate-400">{f.unit}</span>
                        </div>
                        <div className="text-[10px] text-slate-500">
                          Min threshold: {f.minThreshold}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-white">
                          {f.dailyVelocity}
                        </span>
                        <span className="text-xs text-slate-400"> /day</span>
                        <div className="text-[10px] text-slate-500">
                          {f.salesLast30Days} sold in 30d
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          {f.trendDirection === "RISING" && (
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
                          )}
                          {f.trendDirection === "FALLING" && (
                            <TrendingDown className="h-3.5 w-3.5 text-rose-400" />
                          )}
                          {f.trendDirection === "STABLE" && (
                            <Minus className="h-3.5 w-3.5 text-slate-400" />
                          )}
                          <span
                            className={`text-xs font-semibold ${
                              f.trendDirection === "RISING"
                                ? "text-emerald-400"
                                : f.trendDirection === "FALLING"
                                ? "text-rose-400"
                                : "text-slate-300"
                            }`}
                          >
                            {f.weeklySlope > 0 ? `+${f.weeklySlope}` : f.weeklySlope}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-500 capitalize">
                          {f.trendDirection.toLowerCase()} trend
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-cyan-300">
                          {f.predicted30DayDemand} {f.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="text-xs text-slate-300">
                          +{f.safetyBuffer} {f.unit}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        {f.recommendedOrderQty > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            +{f.recommendedOrderQty} {f.unit}
                          </span>
                        ) : (
                          <span className="text-xs text-slate-500">Stock Adequate</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <span className="font-bold text-white">
                          {formatCurrency(f.estimatedBudget)}
                        </span>
                        <div className="text-[10px] text-slate-400">
                          @ ₹{f.latestPurchasePrice}/{f.unit}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Printable View: Purchase Order (PO) */}
      {isPoModalOpen && data && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
            {/* Modal Header controls */}
            <div className="no-print flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-emerald-400" />
                <h3 className="text-lg font-bold text-white">Purchase Order Document Preview</h3>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrintPo}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shadow"
                >
                  <Printer className="h-4 w-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setIsPoModalOpen(false)}
                  className="text-slate-400 hover:text-white text-base px-2 py-1 font-bold"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div className="print-card bg-white text-slate-900 p-8 rounded-xl shadow space-y-6 text-sm">
              {/* Header Letterhead */}
              <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
                    {data.seller.pharmacy_name}
                  </h2>
                  <p className="text-xs text-slate-600 mt-1 max-w-sm">
                    {data.seller.address || "Main Market Street"}
                  </p>
                  <p className="text-xs text-slate-600">
                    Phone: {data.seller.phone || "+91 98765 43210"}
                  </p>
                  <p className="text-xs font-semibold text-slate-800">
                    Drug License: {data.seller.license_number || "DL-REG-2026"} | GST: {data.seller.gst_number || "07AAAAA0000A1Z5"}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded">
                    Official Purchase Order
                  </span>
                  <p className="text-xs text-slate-600 mt-2">
                    PO Ref: <span className="font-mono font-bold">PO-{new Date().toISOString().slice(0, 10).replace(/-/g, "")}-AI</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Date: <span className="font-semibold">{formatDate(new Date())}</span>
                  </p>
                  <p className="text-xs text-slate-600">
                    Replenishment Horizon: <span className="font-semibold">Upcoming 30 Days</span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border border-slate-200">
                  <thead className="bg-slate-100 border-b border-slate-200 text-slate-700 font-bold uppercase">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Medicine Name & Formulation</th>
                      <th className="py-2.5 px-3">Current Stock</th>
                      <th className="py-2.5 px-3">Predicted Demand</th>
                      <th className="py-2.5 px-3">Order Qty</th>
                      <th className="py-2.5 px-3">Est. Unit Cost</th>
                      <th className="py-2.5 px-3 text-right">Subtotal (INR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {poItems.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-6 text-center text-slate-500">
                          Current stock levels are optimal. No reorders needed!
                        </td>
                      </tr>
                    ) : (
                      poItems.map((item, index) => (
                        <tr key={item.medicineId} className="hover:bg-slate-50">
                          <td className="py-2 px-3 text-slate-500 font-mono">{index + 1}</td>
                          <td className="py-2 px-3">
                            <span className="font-bold text-slate-900">{item.medicineName}</span>
                            <div className="text-[10px] text-slate-500">{item.genericName}</div>
                          </td>
                          <td className="py-2 px-3">{item.currentStock} {item.unit}</td>
                          <td className="py-2 px-3">{item.predicted30DayDemand} {item.unit}</td>
                          <td className="py-2 px-3 font-bold text-slate-900 text-sm">
                            {item.recommendedOrderQty} {item.unit}
                          </td>
                          <td className="py-2 px-3 font-mono">₹{item.latestPurchasePrice.toFixed(2)}</td>
                          <td className="py-2 px-3 text-right font-bold font-mono text-slate-900">
                            ₹{item.estimatedBudget.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  <tfoot className="bg-slate-50 border-t-2 border-slate-300 font-bold text-xs">
                    <tr>
                      <td colSpan={4} className="py-3 px-3 uppercase text-slate-600">
                        Total Procurement Requisition Items: {poItems.length}
                      </td>
                      <td className="py-3 px-3 font-bold text-slate-900">
                        {poItems.reduce((sum, it) => sum + it.recommendedOrderQty, 0)} units
                      </td>
                      <td className="py-3 px-3 text-slate-600">Total Est. Cost:</td>
                      <td className="py-3 px-3 text-right text-sm font-black text-slate-900">
                        {formatCurrency(data.summary.totalEstimatedBudget)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Approval Footer */}
              <div className="pt-8 grid grid-cols-2 gap-8 border-t border-slate-200 text-xs">
                <div>
                  <p className="font-semibold text-slate-700">Special Instructions / Terms:</p>
                  <p className="text-slate-500 text-[11px] mt-1">
                    1. Deliver all stock with minimum 18-month remaining shelf-life.<br />
                    2. Maintain cold-chain storage (2°C - 8°C) where applicable.<br />
                    3. Attach manufacturer batch test certificates upon delivery.
                  </p>
                </div>
                <div className="text-right flex flex-col justify-end">
                  <div className="border-b border-slate-400 w-48 ml-auto mb-2" />
                  <p className="font-bold text-slate-900">Authorized Pharmacist Signature</p>
                  <p className="text-[11px] text-slate-500">Apex Life Pharmacy & Wellness</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
