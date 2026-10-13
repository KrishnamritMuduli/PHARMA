"use client";

import { useEffect, useState } from "react";
import {
  Boxes,
  Plus,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowUpDown,
  Tag,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface BatchItem {
  id: string;
  medicine_id: string;
  medicine_name: string;
  generic_name: string | null;
  unit: string;
  batch_number: string;
  manufacturer: string | null;
  quantity_received: number;
  quantity_available: number;
  purchase_price: number;
  mrp: number;
  expiry_date: string;
  purchase_date: string;
  expiry_status: "NORMAL" | "EXPIRING_SOON" | "EXPIRED";
  expiry_label: string;
  days_remaining: number;
}

export default function InventoryPage() {
  const [batches, setBatches] = useState<BatchItem[]>([]);
  const [counts, setCounts] = useState({
    total: 0,
    normal: 0,
    expiring_soon: 0,
    expired: 0,
  });
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<"all" | "expiring_soon" | "expired" | "normal">("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Form State for Intake Log
  const [formData, setFormData] = useState({
    medicine_name: "",
    generic_name: "",
    category: "Analgesic",
    unit: "strips",
    batch_number: "",
    manufacturer: "",
    quantity_received: "",
    purchase_price: "",
    mrp: "",
    expiry_date: "",
    purchase_date: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBatches = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/batches?status=${statusFilter}`);
      if (res.ok) {
        const json = await res.json();
        setBatches(json.batches);
        setCounts(json.counts);
      }
    } catch (err) {
      console.error("Failed to load inventory batches", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBatches();
  }, [statusFilter]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleIntakeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to record batch intake.");
      }

      setIsModalOpen(false);
      // Reset form
      setFormData({
        medicine_name: "",
        generic_name: "",
        category: "Analgesic",
        unit: "strips",
        batch_number: "",
        manufacturer: "",
        quantity_received: "",
        purchase_price: "",
        mrp: "",
        expiry_date: "",
        purchase_date: new Date().toISOString().slice(0, 10),
      });
      fetchBatches();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit batch.");
    } finally {
      setSubmitting(false);
    }
  };

  const filteredBatches = batches.filter((b) => {
    const q = searchTerm.toLowerCase();
    return (
      b.medicine_name.toLowerCase().includes(q) ||
      (b.generic_name && b.generic_name.toLowerCase().includes(q)) ||
      b.batch_number.toLowerCase().includes(q) ||
      (b.manufacturer && b.manufacturer.toLowerCase().includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Inventory & Daily Intake Log
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time batch tracking, FIFO stock levels, and expiry status monitoring
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Log Stock Inflow
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div
          onClick={() => setStatusFilter("all")}
          className={`cursor-pointer bg-slate-900/80 border p-4 rounded-xl transition-all ${
            statusFilter === "all" ? "border-emerald-500" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Total Active Batches</span>
            <Boxes className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-white">{counts.total}</div>
        </div>

        <div
          onClick={() => setStatusFilter("normal")}
          className={`cursor-pointer bg-slate-900/80 border p-4 rounded-xl transition-all ${
            statusFilter === "normal" ? "border-emerald-500" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Normal (&gt; 45 Days)</span>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-400">{counts.normal}</div>
        </div>

        <div
          onClick={() => setStatusFilter("expiring_soon")}
          className={`cursor-pointer bg-slate-900/80 border p-4 rounded-xl transition-all ${
            statusFilter === "expiring_soon" ? "border-amber-500" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Expiring Soon (&lt; 45d)</span>
            <Clock className="h-4 w-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-amber-400">{counts.expiring_soon}</div>
        </div>

        <div
          onClick={() => setStatusFilter("expired")}
          className={`cursor-pointer bg-slate-900/80 border p-4 rounded-xl transition-all ${
            statusFilter === "expired" ? "border-rose-500" : "border-slate-800 hover:border-slate-700"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Expired Batches</span>
            <XCircle className="h-4 w-4 text-rose-400" />
          </div>
          <div className="mt-2 text-2xl font-bold text-rose-400">{counts.expired}</div>
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search medicine, generic formula, batch, or manufacturer..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          <button
            onClick={() => setStatusFilter("all")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "all" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            All
          </button>
          <button
            onClick={() => setStatusFilter("expiring_soon")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "expiring_soon" ? "bg-amber-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Expiring Soon
          </button>
          <button
            onClick={() => setStatusFilter("expired")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "expired" ? "bg-rose-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Expired
          </button>
          <button
            onClick={() => setStatusFilter("normal")}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
              statusFilter === "normal" ? "bg-emerald-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Normal
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Medicine & Formula</th>
                <th className="py-3.5 px-4 font-semibold">Batch & Mfr</th>
                <th className="py-3.5 px-4 font-semibold">Stock (Avail / Recv)</th>
                <th className="py-3.5 px-4 font-semibold">Cost / MRP</th>
                <th className="py-3.5 px-4 font-semibold">Expiry Date</th>
                <th className="py-3.5 px-4 font-semibold">Expiry Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading inventory batches...
                  </td>
                </tr>
              ) : filteredBatches.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No matching inventory batches found.
                  </td>
                </tr>
              ) : (
                filteredBatches.map((batch) => {
                  let badgeColor = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                  if (batch.expiry_status === "EXPIRING_SOON") {
                    badgeColor = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                  } else if (batch.expiry_status === "EXPIRED") {
                    badgeColor = "bg-rose-500/15 text-rose-400 border-rose-500/30";
                  }

                  return (
                    <tr key={batch.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{batch.medicine_name}</div>
                        <div className="text-xs text-slate-400 font-normal">
                          {batch.generic_name || "Standard Compound"}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-xs text-emerald-300 font-medium">
                          {batch.batch_number}
                        </span>
                        <div className="text-xs text-slate-400">{batch.manufacturer || "N/A"}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-bold text-white text-base">
                          {batch.quantity_available}
                        </span>
                        <span className="text-xs text-slate-400 ml-1">
                          / {batch.quantity_received} {batch.unit}
                        </span>
                        {batch.quantity_available === 0 && (
                          <div className="text-[10px] text-rose-400 font-semibold">Out of Stock</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs font-medium text-slate-300">
                          Cost: {formatCurrency(batch.purchase_price)}
                        </div>
                        <div className="text-xs font-semibold text-emerald-400">
                          MRP: {formatCurrency(batch.mrp)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-white font-medium">
                          {formatDate(batch.expiry_date)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Intake: {formatDate(batch.purchase_date)}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border ${badgeColor}`}
                        >
                          {batch.expiry_status === "EXPIRING_SOON" && <Clock className="h-3 w-3" />}
                          {batch.expiry_status === "EXPIRED" && <XCircle className="h-3 w-3" />}
                          {batch.expiry_status === "NORMAL" && <CheckCircle2 className="h-3 w-3" />}
                          {batch.expiry_label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Daily Stock Intake */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Daily Intake Log (Record New Batch)</h3>
                <p className="text-xs text-slate-400">
                  Record supplier stock arriving at pharmacy warehouse
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-lg font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleIntakeSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Medicine Name *</label>
                  <input
                    type="text"
                    name="medicine_name"
                    required
                    value={formData.medicine_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Paracetamol 650mg"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Generic Compound</label>
                  <input
                    type="text"
                    name="generic_name"
                    value={formData.generic_name}
                    onChange={handleInputChange}
                    placeholder="e.g. Paracetamol IP"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Batch Number *</label>
                  <input
                    type="text"
                    name="batch_number"
                    required
                    value={formData.batch_number}
                    onChange={handleInputChange}
                    placeholder="e.g. BAT-2026-401"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Manufacturer</label>
                  <input
                    type="text"
                    name="manufacturer"
                    value={formData.manufacturer}
                    onChange={handleInputChange}
                    placeholder="e.g. Cipla Ltd / Sun Pharma"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Quantity Received *</label>
                  <input
                    type="number"
                    min="1"
                    name="quantity_received"
                    required
                    value={formData.quantity_received}
                    onChange={handleInputChange}
                    placeholder="100"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Packaging Unit</label>
                  <select
                    name="unit"
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="strips">Strips</option>
                    <option value="bottles">Bottles</option>
                    <option value="tablets">Tablets</option>
                    <option value="vials">Vials</option>
                    <option value="sachets">Sachets</option>
                    <option value="tubes">Tubes</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Purchase Price / Unit (Cost) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="purchase_price"
                    required
                    value={formData.purchase_price}
                    onChange={handleInputChange}
                    placeholder="₹ 45.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Selling Price / MRP *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="mrp"
                    required
                    value={formData.mrp}
                    onChange={handleInputChange}
                    placeholder="₹ 70.00"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Expiry Date *</label>
                  <input
                    type="date"
                    name="expiry_date"
                    required
                    value={formData.expiry_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-semibold text-slate-300">Purchase / Inflow Date</label>
                  <input
                    type="date"
                    name="purchase_date"
                    value={formData.purchase_date}
                    onChange={handleInputChange}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow disabled:opacity-50"
                >
                  {submitting ? "Logging Intake..." : "Commit Batch to Inventory"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
