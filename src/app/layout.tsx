import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PharmaPulse | Pharmacy & Medicine Management System",
  description:
    "Production-grade Pharmacy Management System with SQL database, automated financial analytics, FIFO inventory, borrower credit ledger, and ML replenishment engine.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased selection:bg-brand-500 selection:text-white">
        {children}
      </body>
    </html>
  );
}
