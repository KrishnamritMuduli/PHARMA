"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Pill,
  LayoutDashboard,
  Boxes,
  ShoppingCart,
  BookOpen,
  BrainCircuit,
  Receipt,
  UserCheck,
  LogOut,
  AlertTriangle,
  Menu,
  X,
  ShieldCheck,
} from "lucide-react";

interface SellerProfile {
  id: string;
  pharmacy_name: string;
  email: string;
  license_number: string | null;
  gst_number: string | null;
  phone: string | null;
  address: string | null;
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [expiringCount, setExpiringCount] = useState(0);

  useEffect(() => {
    async function loadData() {
      try {
        const [meRes, batchesRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch("/api/batches?status=expiring_soon"),
        ]);

        if (!meRes.ok) {
          router.replace("/login");
          return;
        }

        const meData = await meRes.json();
        setSeller(meData.seller);

        if (batchesRes.ok) {
          const batchesData = await batchesRes.json();
          setExpiringCount(batchesData.counts?.expiring_soon || 0);
        }
      } catch (e) {
        router.replace("/login");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      localStorage.removeItem("pharma_token");
      router.push("/login");
    } catch {
      router.push("/login");
    }
  };

  const navItems = [
    {
      label: "P&L Analytics",
      href: "/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Inventory & Batches",
      href: "/dashboard/inventory",
      icon: Boxes,
      badge: expiringCount > 0 ? `${expiringCount} Alert` : undefined,
      badgeColor: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    },
    {
      label: "Point of Sale (FIFO)",
      href: "/dashboard/pos",
      icon: ShoppingCart,
    },
    {
      label: "Credit Ledger (Khata)",
      href: "/dashboard/credit-ledger",
      icon: BookOpen,
    },
    {
      label: "ML Replenishment",
      href: "/dashboard/replenishment",
      icon: BrainCircuit,
      badge: "AI",
      badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    },
    {
      label: "Operating Expenses",
      href: "/dashboard/expenses",
      icon: Receipt,
    },
    {
      label: "Pharmacy Profile",
      href: "/dashboard/profile",
      icon: UserCheck,
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-400 text-sm font-medium">Authenticating Pharmacy Tenant...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row">
      {/* Sidebar for Desktop */}
      <aside className="no-print hidden md:flex md:w-64 bg-slate-900/90 border-r border-slate-800 flex-col justify-between shrink-0 h-screen sticky top-0 z-40">
        <div className="flex flex-col h-full">
          {/* Logo Header */}
          <div className="p-5 border-b border-slate-800/80 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
              <Pill className="h-5 w-5" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-bold text-base text-white tracking-tight leading-tight truncate">
                {seller?.pharmacy_name || "PharmaPulse"}
              </h1>
              <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-medium">
                <ShieldCheck className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {seller?.license_number || "Licensed Retail"}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="flex-1 p-3 space-y-1.5 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/70"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4.5 w-4.5 ${isActive ? "text-white" : "text-slate-400"}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        item.badgeColor || "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User Profile Footer */}
          <div className="p-4 border-t border-slate-800/80 bg-slate-950/40">
            <div className="flex items-center justify-between">
              <div className="overflow-hidden mr-2">
                <p className="text-xs font-semibold text-slate-200 truncate">
                  {seller?.email}
                </p>
                <p className="text-[10px] text-slate-500">Multi-Tenant Store</p>
              </div>
              <button
                onClick={handleLogout}
                title="Logout"
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <header className="no-print md:hidden bg-slate-900 border-b border-slate-800 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
            <Pill className="h-4 w-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white truncate max-w-[180px]">
              {seller?.pharmacy_name}
            </h2>
            <p className="text-[10px] text-emerald-400">{seller?.license_number}</p>
          </div>
        </div>

        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-slate-400 hover:text-white"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="no-print md:hidden bg-slate-900 border-b border-slate-800 p-4 space-y-2 z-50">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive ? "bg-emerald-600 text-white" : "text-slate-300 hover:bg-slate-800"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
          <button
            onClick={handleLogout}
            className="w-full mt-2 text-left flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-slate-800"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      )}

      {/* Main Content Pane */}
      <main className="flex-1 min-w-0 bg-slate-950 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {children}
      </main>
    </div>
  );
}
