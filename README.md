# PharmaPulse | Enterprise Pharmacy & Medicine Management System

Production-grade Medicine & Pharmacy Management System with an SQL database, automated financial analytics, live First-In, First-Out (FIFO) batch stock deduction, customer store credit ledger (Udhar / Khata), and a predictive machine learning replenishment engine.

---

## 🌟 Key Architecture & Capabilities

### 1. Multi-Tenant Architecture & Authentication
- **Multi-Tenant Isolation:** Strict tenant separation by `seller_id` across all catalog queries, batch stock rows, sales invoices, credit accounts, and ledger transactions.
- **Authentication:** Secure email/password login using JWT tokens and salted bcrypt password hashing (`bcryptjs`).
- **Profile & Compliance:** Pharmacy Name, Drug License Registration Number, GST/Tax ID, Contact Phone, and Physical Operating Address.
- **Demo Mode:** Preloaded demo pharmacy with 60+ days of realistic historical sales, 15 medicines, 21 batches with varying expiry profiles, 5 credit customers with active balances, and operational expenses.

### 2. Daily Purchase & Inventory Management
- **Daily Intake Log:** Record stock arriving from manufacturers (Medicine name, generic compound, batch number, manufacturer, expiry date, purchase price per unit, selling price/MRP, quantity received, purchase date).
- **Live Stock Deduction (FIFO):** Customer checkout automatically queries available batches ordered by `expiry_date ASC` (earliest expiry date first), progressively consuming batches and logging precise cost of goods sold (`cogs`) batch by batch.
- **Expiry Status Tagging:**
  - `Normal`: Expiry date > 45 days away (Emerald badge)
  - `Expiring Soon`: Expiry date $\le$ 45 days away (Amber badge with countdown)
  - `Expired`: Expiry date past today (Rose badge)

### 3. Borrower & Credit Ledger (Udhar / Khata System)
- **Store-Credit Management:** Customer full name, phone number, credit limit (default ₹5,000), and current outstanding balance.
- **Atomic Credit Ledger:** Transactions log medicine taken on store credit and partial/full repayments inside an atomic SQL database transaction.
- **Settlement Workflow:** Track settlement dates, payment methods (`CASH`, `UPI`, `CARD`, `BANK_TRANSFER`), notes, and real-time debtor status transitions (`PENDING`, `PARTIAL`, `SETTLED`).

### 4. Profit & Loss (P&L) Analytics Dashboard
- **Dynamic Time Horizons:** Daily (Today), Weekly (Last 7 Days), Monthly (Last 30 Days), and Custom Date Ranges.
- **Core Financial Metrics:**
  - **Total Revenue:** Cash & online sales + received credit settlement payments.
  - **Cost of Goods Sold (COGS):** Actual batch purchase cost of units sold via FIFO.
  - **Gross Profit & Margin %:** $\text{Total Revenue} - \text{COGS}$.
  - **Net Profit & Margin %:** $\text{Gross Profit} - \text{Operating Expenses} - \text{Expired Stock Write-offs}$.
  - **Unrealized Receivables:** Total pending customer credit balance in borrower ledger.
- **Visual Analytics:**
  - Revenue vs. COGS Area Chart with interactive tooltips.
  - Top 10 Selling Medicines Horizontal Bar Chart.
  - Therapeutic Category Profitability Breakdown.

### 5. Next-Month Inventory Prediction (ML Engine)
- **Goal:** Forecast required procurement volume for each medicine for the upcoming month.
- **Mathematical Formulations:**
  - **Daily Velocity:**
    $$\text{Daily Velocity} = \frac{\text{Sales Last 30 Days}}{30}$$
  - **Weekly Trend Slope ($m$):**
    Linear regression ($y = mx + b$) on weekly aggregated sales across past 60–90 days:
    $$m = \frac{N \sum xy - \sum x \sum y}{N \sum x^2 - (\sum x)^2}$$
    $$\text{Predicted 30-Day Demand} = \max\left(0, (\text{Daily Velocity} \times 30) + (m \times 4.3)\right)$$
  - **Dynamic Safety Buffer:**
    $$\text{Safety Buffer} = \max\left(\text{min\_stock\_threshold}, \lceil \text{Lead Time} \times \text{Daily Velocity} \times 1.25 \rceil\right)$$
  - **Replenishment Target Formula:**
    $$\text{Target Stock} = (\text{Predicted 30-Day Demand}) + \text{Safety Buffer} - \text{Current On-Hand Stock}$$
    $$\text{Recommended Order Qty} = \max\left(0, \lceil \text{Target Stock} \rceil\right)$$
    $$\text{Estimated Procurement Budget} = \text{Recommended Order Qty} \times \text{Latest Purchase Price}$$
- **Procurement Artifacts:**
  - One-click **CSV Export** with all mathematical regression factors.
  - Printable **Purchase Order (PO)** with official pharmacy letterhead, drug license, itemized table, total budget, and authorization signature block.

---

## 🛠️ Relational Database Schema

Included in both PostgreSQL DDL format (`schema.sql`) and Prisma schema (`prisma/schema.prisma`):

1. `sellers` - Multi-tenant store profile and credentials
2. `medicines` - Medicine catalog, generic compound, threshold
3. `medicine_batches` - FIFO batch tracking, purchase price, MRP, expiry date
4. `sales` - Invoices, total amount, total FIFO COGS, payment mode
5. `sale_items` - Itemized sale units linked to batches
6. `borrowers` - Store credit customers, credit limits, balances, debtor status
7. `borrower_transactions` - Atomic credit and repayment ledger
8. `expenses` - Operating overhead and expired inventory write-offs

---

## 🚀 Quickstart & Demo Credentials

### 1. Install & Generate
```bash
npm install
npx prisma db push
node scripts/seed.mjs
```

### 2. Start Application
```bash
npm run dev
```

### 3. Access
Open [http://localhost:3000](http://localhost:3000)

**Demo Pharmacy Login:**
- **Email:** `demo@pharmpulse.com`
- **Password:** `admin123`
*(Or use the 1-click Fill Demo button on the login screen)*
