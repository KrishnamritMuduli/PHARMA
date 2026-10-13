"use client";

import { useEffect, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  CreditCard,
  AlertCircle,
  Calendar,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  PieChart as PieIcon,
  ShoppingBag,
} from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  Cell,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

interface PnLData {
  metrics: {
    totalRevenue: number;
    directSalesRevenue: number;
    totalRepaymentsCollected: number;
    creditSalesIssued: number;
    totalCogs: number;
    grossProfit: number;
    grossMargin: number;
    netProfit: number;
    netMargin: number;
    totalOperatingExpenses: number;
    expiredWriteOffs: number;
    unrealizedReceivables: number;
    salesCount: number;
  };
  timeline: Array<{
    date: string;
    revenue: number;
    cogs: number;
    grossProfit: number;
    salesCount: number;
  }>;
  topMedicines: Array<{
    name: string;
    category: string;
    quantity: number;
    revenue: number;
    cogs: number;
    profit: number;
  }>;
  categoryDistribution: Array<{
    category: string;
    revenue: number;
    profit: number;
  }>;
  timeRange: string;
  startDate: string;
  endDate: string;
}

export default function PnLDashboardPage() {
  const [data, setData] = useState<PnLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<"daily" | "weekly" | "monthly" | "custom">("monthly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  const fetchData = async (selectedRange = range) => {
    setLoading(true);
    try {
      let url = `/api/analytics/pnl?range=${selectedRange}`;
      if (selectedRange === "custom" && customStart && customEnd) {
        url += `&startDate=${customStart}&endDate=${customEnd}`;
      }
      const res = await fetch(url);
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load P&L analytics", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

  const handleRangeChange = (newRange: "daily" | "weekly" | "monthly" | "custom") => {
    setRange(newRange);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customStart && customEnd) {
      fetchData("custom");
    }
  };

  const COLORS = ["#10b981", "#06b6d4", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6"];

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Profit & Loss Analytics
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Automated financial health, FIFO cost of goods sold (COGS), and net profitability
          </p>
        </div>

        {/* Range Buttons */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-xl">
          <button
            onClick={() => handleRangeChange("daily")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === "daily"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Today (Daily)
          </button>
          <button
            onClick={() => handleRangeChange("weekly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === "weekly"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Last 7 Days (Weekly)
          </button>
          <button
            onClick={() => handleRangeChange("monthly")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === "monthly"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Last 30 Days (Monthly)
          </button>
          <button
            onClick={() => handleRangeChange("custom")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              range === "custom"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Custom Range
          </button>
        </div>
      </div>

      {/* Custom Date Form if selected */}
      {range === "custom" && (
        <form
          onSubmit={handleCustomSubmit}
          className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex flex-wrap items-center gap-4 text-xs"
        >
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Start Date:</span>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
              required
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400">End Date:</span>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white"
              required
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow"
          >
            Apply Custom Filter
          </button>
        </form>
      )}

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Key Financial KPIs (5 Metric Cards) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* 1. Total Revenue */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Total Revenue
                </span>
                <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                  <DollarSign className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-white tracking-tight">
                  {formatCurrency(data.metrics.totalRevenue)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
                  <span>Cash & Online + Repayments</span>
                </div>
              </div>
            </div>

            {/* 2. COGS (Cost of Goods Sold) */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  COGS (FIFO Cost)
                </span>
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Package className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-200 tracking-tight">
                  {formatCurrency(data.metrics.totalCogs)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Purchase cost of sold units
                </div>
              </div>
            </div>

            {/* 3. Gross Profit & Margin */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Gross Profit
                </span>
                <div className="h-8 w-8 rounded-lg bg-teal-500/10 text-teal-400 flex items-center justify-center">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-emerald-400 tracking-tight">
                  {formatCurrency(data.metrics.grossProfit)}
                </div>
                <div className="text-[11px] text-emerald-400/90 font-medium mt-1">
                  Margin: {data.metrics.grossMargin}%
                </div>
              </div>
            </div>

            {/* 4. Net Profit */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Net Profit
                </span>
                <div className="h-8 w-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Layers className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className={`text-2xl font-bold tracking-tight ${
                  data.metrics.netProfit >= 0 ? "text-emerald-300" : "text-rose-400"
                }`}>
                  {formatCurrency(data.metrics.netProfit)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Net Margin: {data.metrics.netMargin}%
                </div>
              </div>
            </div>

            {/* 5. Unrealized Receivables (Udhar Ledger) */}
            <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Unrealized Receivables
                </span>
                <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
                  <CreditCard className="h-4 w-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-rose-400 tracking-tight">
                  {formatCurrency(data.metrics.unrealizedReceivables)}
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  Outstanding store credit balance
                </div>
              </div>
            </div>
          </div>

          {/* Area Chart: Revenue vs COGS */}
          <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-lg font-bold text-white">Revenue vs. Cost of Goods Sold (COGS)</h3>
                <p className="text-xs text-slate-400">
                  Daily timeline showing sales revenue generated against FIFO inventory acquisition cost
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-medium">
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">Revenue</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-amber-500" />
                  <span className="text-slate-300">COGS</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full bg-teal-400" />
                  <span className="text-slate-300">Gross Profit</span>
                </div>
              </div>
            </div>

            <div className="h-80 w-full pt-4">
              {data.timeline.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                  No sales recorded in this time range.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.timeline} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="colorCogs" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(val) => val.slice(5)}
                    />
                    <YAxis
                      stroke="#64748b"
                      fontSize={11}
                      tickFormatter={(val) => `₹${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#0f172a",
                        borderColor: "#334155",
                        borderRadius: "12px",
                        fontSize: "12px",
                        color: "#ffffff",
                      }}
                      formatter={(val: number) => [`₹${val.toFixed(2)}`]}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      name="Revenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRev)"
                    />
                    <Area
                      type="monotone"
                      dataKey="cogs"
                      name="COGS"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorCogs)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Two-Column Grid: Top 10 Medicines + Margin Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Selling Medicines */}
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Top 10 Selling Medicines</h3>
                  <p className="text-xs text-slate-400">Ranked by unit volume sold in period</p>
                </div>
                <ShoppingBag className="h-5 w-5 text-emerald-400" />
              </div>

              <div className="h-72 w-full pt-2">
                {data.topMedicines.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-slate-500 text-sm">
                    No medicine sales in selected window.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topMedicines}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis type="number" stroke="#64748b" fontSize={11} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        stroke="#64748b"
                        fontSize={10}
                        width={110}
                        tickFormatter={(val) => (val.length > 15 ? `${val.slice(0, 15)}...` : val)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#0f172a",
                          borderColor: "#334155",
                          borderRadius: "12px",
                          fontSize: "12px",
                        }}
                        formatter={(val: number, name: string) => [
                          name === "quantity" ? `${val} units` : `₹${val.toFixed(2)}`,
                          name === "quantity" ? "Volume" : "Revenue",
                        ]}
                      />
                      <Bar dataKey="quantity" name="quantity" fill="#10b981" radius={[0, 4, 4, 0]}>
                        {data.topMedicines.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Profit Margin & Therapeutic Category Breakdown */}
            <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white">Therapeutic Category Profitability</h3>
                  <p className="text-xs text-slate-400">Revenue and gross profit by category</p>
                </div>
                <PieIcon className="h-5 w-5 text-cyan-400" />
              </div>

              <div className="space-y-3 pt-2 max-h-72 overflow-y-auto pr-1">
                {data.categoryDistribution.map((cat, idx) => {
                  const marginPct =
                    cat.revenue > 0 ? Math.round((cat.profit / cat.revenue) * 100) : 0;
                  return (
                    <div
                      key={cat.category}
                      className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="h-3 w-3 rounded-full shrink-0"
                          style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                        />
                        <div>
                          <p className="text-xs font-semibold text-white">{cat.category}</p>
                          <p className="text-[11px] text-slate-400">
                            Revenue: {formatCurrency(cat.revenue)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-emerald-400">
                          {formatCurrency(cat.profit)}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {marginPct}% Margin
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
