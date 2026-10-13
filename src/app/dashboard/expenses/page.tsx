"use client";

import { useEffect, useState } from "react";
import {
  Receipt,
  Plus,
  DollarSign,
  Calendar,
  Tag,
  Building,
  Zap,
  Users,
  AlertOctagon,
  Trash2,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ExpenseItem {
  id: string;
  category: string;
  title: string;
  amount: number;
  expense_date: string;
  created_at: string;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<ExpenseItem[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    category: "RENT",
    amount: "",
    expense_date: new Date().toISOString().slice(0, 10),
  });
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/expenses");
      if (res.ok) {
        const json = await res.json();
        setExpenses(json.expenses);
        setTotalExpenses(json.total);
      }
    } catch (err) {
      console.error("Failed to load expenses", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to log expense.");

      setIsModalOpen(false);
      setFormData({
        title: "",
        category: "RENT",
        amount: "",
        expense_date: new Date().toISOString().slice(0, 10),
      });
      fetchExpenses();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to submit.");
    } finally {
      setSubmitting(false);
    }
  };

  const categoryIcons: { [key: string]: any } = {
    RENT: Building,
    UTILITIES: Zap,
    STAFF_SALARY: Users,
    INVENTORY_WRITEOFF: AlertOctagon,
    OPERATIONAL: Tag,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Operating Expenses & Overhead
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Track pharmacy overheads and expired inventory write-offs for accurate Net Profit calculation
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Log Operating Expense
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Total Operational Costs
          </span>
          <div className="mt-2 text-2xl font-bold text-rose-400">
            {formatCurrency(totalExpenses)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Deducted from Gross Profit</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Expense Records
          </span>
          <div className="mt-2 text-2xl font-bold text-white">
            {expenses.length} Entries
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Rent, electricity, salaries, write-offs</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <span className="text-xs font-semibold text-slate-400 uppercase">
            Inventory Write-offs
          </span>
          <div className="mt-2 text-2xl font-bold text-amber-400">
            {formatCurrency(
              expenses
                .filter((e) => e.category === "INVENTORY_WRITEOFF")
                .reduce((sum, e) => sum + e.amount, 0)
            )}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Expired batch losses written off</p>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Expense Title</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold">Date</th>
                <th className="py-3.5 px-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    Loading expenses...
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-12 text-center text-slate-500">
                    No operating expenses logged yet.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const Icon = categoryIcons[exp.category] || Tag;
                  return (
                    <tr key={exp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{exp.title}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700">
                          <Icon className="h-3 w-3 text-emerald-400" />
                          {exp.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {formatDate(exp.expense_date)}
                      </td>
                      <td className="py-3.5 px-4 text-right font-bold text-rose-400 text-base">
                        -{formatCurrency(exp.amount)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Log Expense */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Log Operating Expense</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Electricity & Refrigerator Backup"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="RENT">Commercial Rent / Shop Lease</option>
                  <option value="UTILITIES">Electricity, Water & Cooling</option>
                  <option value="STAFF_SALARY">Staff / Pharmacist Salary</option>
                  <option value="INVENTORY_WRITEOFF">Expired Inventory Write-off</option>
                  <option value="OPERATIONAL">Packaging, Bags & Miscellaneous</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="2500"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold text-base"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Expense Date *</label>
                <input
                  type="date"
                  required
                  value={formData.expense_date}
                  onChange={(e) =>
                    setFormData({ ...formData, expense_date: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow"
                >
                  {submitting ? "Saving..." : "Log Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
