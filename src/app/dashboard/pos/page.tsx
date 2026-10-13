"use client";

import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Search,
  Plus,
  Minus,
  Trash2,
  CheckCircle2,
  CreditCard,
  Banknote,
  Smartphone,
  Printer,
  AlertCircle,
  Clock,
  Layers,
  User,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Medicine {
  id: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  unit: string;
  total_stock: number;
  latest_mrp: number;
  batches: Array<{
    id: string;
    batch_number: string;
    quantity_available: number;
    expiry_date: string;
    purchase_price: number;
    mrp: number;
  }>;
}

interface Borrower {
  id: string;
  full_name: string;
  phone: string;
  credit_limit: number;
  current_balance: number;
  status: string;
}

interface CartItem {
  medicineId: string;
  medicineName: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  availableStock: number;
}

interface FifoBatchAllocation {
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  purchasePrice: number;
  cogs: number;
}

interface FifoQuote {
  allocations: Array<{
    medicineId: string;
    medicineName: string;
    requestedQuantity: number;
    batches: FifoBatchAllocation[];
    subtotal: number;
    subtotalCogs: number;
  }>;
  totalAmount: number;
  totalCogs: number;
}

export default function PosPage() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMode, setPaymentMode] = useState<"CASH" | "ONLINE" | "CREDIT">("CASH");
  const [selectedBorrowerId, setSelectedBorrowerId] = useState("");
  const [fifoQuote, setFifoQuote] = useState<FifoQuote | null>(null);
  const [loading, setLoading] = useState(true);
  const [checkingOut, setCheckingOut] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [completedSale, setCompletedSale] = useState<any | null>(null);

  // Fetch catalog and borrowers
  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [medRes, borRes] = await Promise.all([
        fetch("/api/medicines"),
        fetch("/api/borrowers"),
      ]);

      if (medRes.ok) {
        const medData = await medRes.json();
        setMedicines(medData.medicines);
      }
      if (borRes.ok) {
        const borData = await borRes.json();
        setBorrowers(borData.borrowers);
      }
    } catch (err) {
      console.error("Failed to load POS data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  // Whenever cart changes, fetch FIFO allocation quote
  useEffect(() => {
    if (cart.length === 0) {
      setFifoQuote(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/sales/fifo-quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: cart.map((c) => ({
              medicineId: c.medicineId,
              quantity: c.quantity,
              unitPrice: c.unitPrice,
            })),
          }),
        });
        if (res.ok) {
          const quote = await res.json();
          setFifoQuote(quote);
          setErrorMsg(null);
        } else {
          const err = await res.json();
          setErrorMsg(err.error);
        }
      } catch (e) {
        // network issue
      }
    }, 200);

    return () => clearTimeout(timer);
  }, [cart]);

  const addToCart = (med: Medicine) => {
    if (med.total_stock <= 0) return;

    setErrorMsg(null);
    setCart((prev) => {
      const existing = prev.find((item) => item.medicineId === med.id);
      if (existing) {
        if (existing.quantity >= med.total_stock) {
          setErrorMsg(`Cannot add more than available stock (${med.total_stock}) for ${med.name}`);
          return prev;
        }
        return prev.map((item) =>
          item.medicineId === med.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [
        ...prev,
        {
          medicineId: med.id,
          medicineName: med.name,
          unit: med.unit,
          quantity: 1,
          unitPrice: med.latest_mrp || 50,
          availableStock: med.total_stock,
        },
      ];
    });
  };

  const updateQuantity = (medicineId: string, delta: number) => {
    setErrorMsg(null);
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.medicineId === medicineId) {
            const newQty = item.quantity + delta;
            if (newQty > item.availableStock) {
              setErrorMsg(`Only ${item.availableStock} units available.`);
              return item;
            }
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (medicineId: string) => {
    setCart((prev) => prev.filter((item) => item.medicineId !== medicineId));
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMode === "CREDIT" && !selectedBorrowerId) {
      setErrorMsg("Please select a borrower customer for Store Credit (Udhar) checkout.");
      return;
    }

    setCheckingOut(true);
    setErrorMsg(null);

    try {
      const res = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((c) => ({
            medicineId: c.medicineId,
            quantity: c.quantity,
            unitPrice: c.unitPrice,
          })),
          payment_mode: paymentMode,
          borrower_id: paymentMode === "CREDIT" ? selectedBorrowerId : undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Checkout failed");
      }

      setCompletedSale(json.sale);
      setCart([]);
      setFifoQuote(null);
      // Reload stock levels
      loadInitialData();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to process checkout.");
    } finally {
      setCheckingOut(false);
    }
  };

  const filteredMedicines = medicines.filter((m) => {
    const q = searchTerm.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.generic_name && m.generic_name.toLowerCase().includes(q)) ||
      (m.category && m.category.toLowerCase().includes(q))
    );
  });

  const cartTotalAmount = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);

  const selectedBorrower = borrowers.find((b) => b.id === selectedBorrowerId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Point of Sale & FIFO Checkout
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            Real-time FIFO batch deduction by earliest expiry date & multi-mode settlement
          </p>
        </div>
      </div>

      {errorMsg && (
        <div className="p-3.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Main Grid: Medicine Catalog on Left, Checkout Cart on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Catalog (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="relative">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search medicine catalog to add to cart..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[620px] overflow-y-auto pr-1">
            {filteredMedicines.map((med) => {
              const inStock = med.total_stock > 0;
              const earliestExpiryBatch = med.batches[0];

              return (
                <div
                  key={med.id}
                  onClick={() => inStock && addToCart(med)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    inStock
                      ? "bg-slate-900/80 border-slate-800 hover:border-emerald-500/50 hover:bg-slate-800/60 cursor-pointer"
                      : "bg-slate-950/60 border-slate-900 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-white text-sm leading-snug">
                        {med.name}
                      </h4>
                      <p className="text-xs text-slate-400">
                        {med.generic_name || "General"}
                      </p>
                    </div>
                    <span className="font-bold text-emerald-400 text-sm whitespace-nowrap">
                      {formatCurrency(med.latest_mrp)}
                    </span>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <span className={`font-semibold ${inStock ? "text-slate-300" : "text-rose-400"}`}>
                      {inStock ? `${med.total_stock} ${med.unit} on hand` : "Out of Stock"}
                    </span>
                    {earliestExpiryBatch && (
                      <span className="text-[11px] text-amber-400/90 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        FIFO: {formatDate(earliestExpiryBatch.expiry_date)}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Checkout Cart & Live FIFO Engine (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-emerald-400" />
                <h3 className="font-bold text-white text-base">Current Cart ({cart.length})</h3>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-slate-400 hover:text-rose-400 transition-colors"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {/* Cart Items List */}
            {cart.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                Cart is empty. Select medicines from the catalog.
              </div>
            ) : (
              <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                {cart.map((item) => (
                  <div
                    key={item.medicineId}
                    className="p-3 bg-slate-950/70 border border-slate-800/80 rounded-xl flex items-center justify-between"
                  >
                    <div className="overflow-hidden mr-2">
                      <p className="text-xs font-semibold text-white truncate">
                        {item.medicineName}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {formatCurrency(item.unitPrice)} / {item.unit}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                        <button
                          onClick={() => updateQuantity(item.medicineId, -1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-white">
                          {item.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(item.medicineId, 1)}
                          className="p-1 text-slate-400 hover:text-white"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="text-xs font-bold text-emerald-400 min-w-[60px] text-right">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </span>

                      <button
                        onClick={() => removeFromCart(item.medicineId)}
                        className="text-slate-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Live FIFO Batch Allocation Preview Box */}
            {fifoQuote && fifoQuote.allocations.length > 0 && (
              <div className="p-3.5 bg-emerald-950/30 border border-emerald-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5" /> Live FIFO Batch Deduction Plan
                  </span>
                  <span>Est. COGS: {formatCurrency(fifoQuote.totalCogs)}</span>
                </div>
                <div className="space-y-1 text-[11px] text-slate-300 max-h-28 overflow-y-auto pr-1">
                  {fifoQuote.allocations.map((alloc) => (
                    <div key={alloc.medicineId} className="border-b border-emerald-900/40 pb-1">
                      <span className="font-medium text-white">{alloc.medicineName}:</span>
                      {alloc.batches.map((b) => (
                        <div key={b.batchId} className="ml-2 text-slate-400 flex justify-between">
                          <span>
                            Deduct {b.quantity} from {b.batchNumber} (Exp: {formatDate(b.expiryDate)})
                          </span>
                          <span>Cost: ₹{b.purchasePrice}/unit</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payment Mode Selection */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Payment Method
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMode("CASH")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    paymentMode === "CASH"
                      ? "bg-emerald-600 border-emerald-500 text-white shadow"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Banknote className="h-3.5 w-3.5" /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("ONLINE")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    paymentMode === "ONLINE"
                      ? "bg-emerald-600 border-emerald-500 text-white shadow"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Smartphone className="h-3.5 w-3.5" /> Online (UPI)
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMode("CREDIT")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition-all ${
                    paymentMode === "CREDIT"
                      ? "bg-amber-600 border-amber-500 text-white shadow"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <CreditCard className="h-3.5 w-3.5" /> Credit (Udhar)
                </button>
              </div>
            </div>

            {/* Borrower Selection if CREDIT mode */}
            {paymentMode === "CREDIT" && (
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-xl space-y-2 text-xs">
                <label className="font-semibold text-amber-400 flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5" /> Select Khata / Borrower Customer *
                </label>
                <select
                  value={selectedBorrowerId}
                  onChange={(e) => setSelectedBorrowerId(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-2 text-white"
                >
                  <option value="">-- Choose Customer --</option>
                  {borrowers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.full_name} ({b.phone}) — Outstanding: ₹{b.current_balance} (Limit: ₹{b.credit_limit})
                    </option>
                  ))}
                </select>

                {selectedBorrower && (
                  <div className="text-[11px] text-slate-300 pt-1 flex justify-between">
                    <span>Credit Limit: ₹{selectedBorrower.credit_limit}</span>
                    <span className="text-amber-400 font-semibold">
                      New Balance: ₹{selectedBorrower.current_balance + cartTotalAmount}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Subtotal & Checkout Button */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between text-base font-bold text-white">
              <span>Total Bill Amount:</span>
              <span className="text-xl text-emerald-400">{formatCurrency(cartTotalAmount)}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkingOut}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {checkingOut ? (
                <span>Executing FIFO Allocation...</span>
              ) : (
                <span>Complete Checkout & Print Bill</span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Modal: Completed Sale / Invoice Receipt */}
      {completedSale && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
            <div className="text-center space-y-1">
              <div className="inline-flex h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 items-center justify-center mb-1">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white">Sale Recorded & Stock Deducted</h3>
              <p className="text-xs text-slate-400">Invoice #{completedSale.invoice_number}</p>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="flex justify-between text-slate-400">
                <span>Date & Time:</span>
                <span className="text-white">{new Date(completedSale.sale_date).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Payment Mode:</span>
                <span className="text-emerald-400 font-semibold">{completedSale.payment_mode}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Total Amount Paid:</span>
                <span className="text-white font-bold text-sm">
                  {formatCurrency(completedSale.total_amount)}
                </span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>FIFO Cost of Goods (COGS):</span>
                <span className="text-slate-300">{formatCurrency(completedSale.total_cogs)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setCompletedSale(null)}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl"
              >
                Start Next Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
