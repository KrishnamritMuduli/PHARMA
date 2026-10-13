import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export interface ExpiryStatus {
  status: "NORMAL" | "EXPIRING_SOON" | "EXPIRED";
  label: string;
  badgeClass: string;
  daysRemaining: number;
}

export function getExpiryStatus(expiryDate: string | Date): ExpiryStatus {
  const exp = new Date(expiryDate);
  const now = new Date();
  // reset hours to midnight for exact calendar day diff
  exp.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);

  const diffTime = exp.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining <= 0) {
    return {
      status: "EXPIRED",
      label: "Expired",
      badgeClass: "bg-red-500/15 text-red-600 border-red-500/30",
      daysRemaining,
    };
  }

  if (daysRemaining <= 45) {
    return {
      status: "EXPIRING_SOON",
      label: `Expiring Soon (${daysRemaining}d)`,
      badgeClass: "bg-amber-500/15 text-amber-600 border-amber-500/30",
      daysRemaining,
    };
  }

  return {
    status: "NORMAL",
    label: "Normal",
    badgeClass: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30",
    daysRemaining,
  };
}

export function generateInvoiceNumber(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  return `INV-${dateStr}-${randomSuffix}`;
}
