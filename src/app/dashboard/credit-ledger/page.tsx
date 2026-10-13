"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  UserPlus,
  Search,
  DollarSign,
  CreditCard,
  CheckCircle2,
  Clock,
  Phone,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  AlertCircle,
  FileText,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Transaction {
  id: string;
  type: "CREDIT" | "PAYMENT";
  payment_method: string;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
}

interface Borrower {
  id: string;
  full_name: string;
  phone: string;
  credit_limit: number;
  current_balance: number;
  status: "PENDING" | "PARTIAL" | "SETTLED";
  transactions?: Transaction[];
}

export default function CreditLedgerPage() {
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [totalReceivables, setTotalReceivables] = useState(0);
  const [activeDebtorsCount, setActiveDebtorsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "PENDING" | "PARTIAL" | "SETTLED">("ALL");

  // Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);

  // Add Customer Form
  const [newCustomer, setNewCustomer] = useState({
    full_name: "",
    phone: "",
    credit_limit: "5000",
    initial_balance: "0",
  });

  // Repayment Settlement Form
  const [paymentForm, setPaymentForm] = useState({
    amount: "",
    payment_method: "UPI",
    notes: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchBorrowers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/borrowers");
      if (res.ok) {
        const data = await res.json();
        setBorrowers(data.borrowers);
        setTotalReceivables(data.totalReceivables);
        setActiveDebtorsCount(data.activeDebtorsCount);
      }
    } catch (err) {
      console.error("Failed to load borrower ledger", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBorrowers();
  }, []);

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/borrowers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newCustomer),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to add customer.");

      setIsAddModalOpen(false);
      setNewCustomer({
        full_name: "",
        phone: "",
        credit_limit: "5000",
        initial_balance: "0",
      });
      fetchBorrowers();
    } catch (err: any) {
      setErrorMsg(err.message || "Error creating customer.");
    } finally {
      setSubmitting(false);
    }
  };

  const openPayModal = (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setPaymentForm({
      amount: borrower.current_balance > 0 ? String(borrower.current_balance) : "",
      payment_method: "UPI",
      notes: "Full/partial settlement",
    });
    setErrorMsg(null);
    setIsPayModalOpen(true);
  };

  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBorrower) return;

    setSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await fetch(`/api/borrowers/${selectedBorrower.id}/transactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "PAYMENT",
          amount: paymentForm.amount,
          payment_method: paymentForm.payment_method,
          notes: paymentForm.notes,
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to record payment.");

      setIsPayModalOpen(false);
      setSelectedBorrower(null);
      fetchBorrowers();
    } catch (err: any) {
      setErrorMsg(err.message || "Payment recording failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const openHistory = async (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    try {
      const res = await fetch(`/api/borrowers/${borrower.id}`);
      if (res.ok) {
        const json = await res.json();
        setSelectedBorrower(json.borrower);
      }
    } catch (e) {
      console.error(e);
    }
    setIsHistoryModalOpen(true);
  };

  const filtered = borrowers.filter((b) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch = b.full_name.toLowerCase().includes(q) || b.phone.includes(q);
    const matchesStatus = filterStatus === "ALL" || b.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Borrower & Credit Ledger (Udhar / Khata)
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Store-credit management, atomic settlement transactions, and debtor balance tracking
          </p>
        </div>

        <button
          onClick={() => {
            setErrorMsg(null);
            setIsAddModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 self-start sm:self-auto"
        >
          <UserPlus className="h-4 w-4" />
          Add Khata Account
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Total Pending Receivables
            </span>
            <div className="h-8 w-8 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-rose-400">
            {formatCurrency(totalReceivables)}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Unrealized cash in market</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Active Debtors
            </span>
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-amber-400">
            {activeDebtorsCount} Accounts
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Pending balance &gt; 0</p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-2xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">
              Total Registered Customers
            </span>
            <div className="h-8 w-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <BookOpen className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-bold text-white">
            {borrowers.length} Customers
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Store credit relationships</p>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search customer by name or phone..."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl text-xs">
          {(["ALL", "PENDING", "PARTIAL", "SETTLED"] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterStatus === st
                  ? "bg-emerald-600 text-white"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Borrowers Table */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-950/60 text-slate-400 text-xs uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Customer</th>
                <th className="py-3.5 px-4 font-semibold">Phone Number</th>
                <th className="py-3.5 px-4 font-semibold">Outstanding Balance</th>
                <th className="py-3.5 px-4 font-semibold">Credit Limit</th>
                <th className="py-3.5 px-4 font-semibold">Debtor Status</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    Loading credit accounts...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    No matching borrower accounts found.
                  </td>
                </tr>
              ) : (
                filtered.map((b) => {
                  let badge = "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
                  if (b.status === "PENDING") {
                    badge = "bg-rose-500/15 text-rose-400 border-rose-500/30";
                  } else if (b.status === "PARTIAL") {
                    badge = "bg-amber-500/15 text-amber-400 border-amber-500/30";
                  }

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-white">{b.full_name}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-xs">
                        {b.phone}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`font-bold text-base ${
                            b.current_balance > 0 ? "text-rose-400" : "text-emerald-400"
                          }`}
                        >
                          {formatCurrency(b.current_balance)}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-400 text-xs">
                        {formatCurrency(b.credit_limit)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border ${badge}`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        {b.current_balance > 0 && (
                          <button
                            onClick={() => openPayModal(b)}
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow transition-all"
                          >
                            Collect Payment
                          </button>
                        )}
                        <button
                          onClick={() => openHistory(b)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-lg transition-all"
                        >
                          View Ledger
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add New Khata / Borrower */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">Add Customer Credit Account</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
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

            <form onSubmit={handleAddCustomer} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.full_name}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, full_name: e.target.value })
                  }
                  placeholder="e.g. Ramesh Kumar"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Phone Number *</label>
                <input
                  type="text"
                  required
                  value={newCustomer.phone}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, phone: e.target.value })
                  }
                  placeholder="e.g. 9811223344"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Credit Limit (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={newCustomer.credit_limit}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, credit_limit: e.target.value })
                  }
                  placeholder="5000"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Initial Opening Balance (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={newCustomer.initial_balance}
                  onChange={(e) =>
                    setNewCustomer({ ...newCustomer, initial_balance: e.target.value })
                  }
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow"
                >
                  {submitting ? "Saving..." : "Create Account"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Collect Payment / Settle */}
      {isPayModalOpen && selectedBorrower && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Record Settlement Payment</h3>
                <p className="text-xs text-slate-400">
                  {selectedBorrower.full_name} ({selectedBorrower.phone})
                </p>
              </div>
              <button
                onClick={() => setIsPayModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center text-xs">
              <span className="text-slate-400">Outstanding Balance:</span>
              <span className="text-rose-400 font-bold text-base">
                {formatCurrency(selectedBorrower.current_balance)}
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSettlePayment} className="space-y-4 text-xs">
              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Payment Amount (₹) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  max={selectedBorrower.current_balance}
                  required
                  value={paymentForm.amount}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, amount: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-bold text-base"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Payment Method *</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, payment_method: e.target.value })
                  }
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  <option value="UPI">UPI (Google Pay / PhonePe / Paytm)</option>
                  <option value="CASH">Cash</option>
                  <option value="CARD">Card / POS Swipe</option>
                  <option value="BANK_TRANSFER">Bank NEFT/IMPS</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-slate-300">Notes / Reference</label>
                <input
                  type="text"
                  value={paymentForm.notes}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, notes: e.target.value })
                  }
                  placeholder="e.g. Received via UPI transaction #48291"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsPayModalOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg shadow"
                >
                  {submitting ? "Settling..." : "Log Payment & Update Balance"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Full Ledger History Statement */}
      {isHistoryModalOpen && selectedBorrower && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl p-6 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white">Customer Khata Statement</h3>
                <p className="text-xs text-slate-400">
                  {selectedBorrower.full_name} — Phone: {selectedBorrower.phone}
                </p>
              </div>
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Current Outstanding:</span>
                <p className="text-lg font-bold text-rose-400 mt-1">
                  {formatCurrency(selectedBorrower.current_balance)}
                </p>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-400">Credit Limit:</span>
                <p className="text-lg font-bold text-slate-200 mt-1">
                  {formatCurrency(selectedBorrower.credit_limit)}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-slate-300 uppercase">
                Atomic Ledger History
              </h4>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {selectedBorrower.transactions && selectedBorrower.transactions.length > 0 ? (
                  selectedBorrower.transactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-lg flex items-center justify-center ${
                            tx.type === "PAYMENT"
                              ? "bg-emerald-500/10 text-emerald-400"
                              : "bg-rose-500/10 text-rose-400"
                          }`}
                        >
                          {tx.type === "PAYMENT" ? (
                            <ArrowDownLeft className="h-4 w-4" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-white">
                            {tx.type === "PAYMENT" ? "Repayment Received" : "Medicine on Credit"}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {formatDate(tx.created_at)} • {tx.payment_method}
                            {tx.notes ? ` • ${tx.notes}` : ""}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`font-bold text-sm ${
                            tx.type === "PAYMENT" ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {tx.type === "PAYMENT" ? "-" : "+"}
                          {formatCurrency(tx.amount)}
                        </span>
                        <div className="text-[10px] text-slate-500 font-medium">
                          Status: {tx.status}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-6 text-slate-500 text-xs">
                    No transactions recorded for this customer yet.
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-800">
              <button
                onClick={() => setIsHistoryModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-200 rounded-lg text-xs font-semibold"
              >
                Close Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
