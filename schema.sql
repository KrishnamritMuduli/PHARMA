-- ==============================================================================
-- PharmaPulse / Medicine & Pharmacy Management System
-- Production PostgreSQL DDL Migration Script
-- Multi-Tenant Schema with Foreign Keys, Cascades, Indexes, and Constraints
-- ==============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Sellers / Users (Multi-tenant Root)
CREATE TABLE IF NOT EXISTS sellers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pharmacy_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    license_number VARCHAR(100),
    gst_number VARCHAR(100),
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sellers_email ON sellers(email);

-- 2. Medicines Catalog
CREATE TABLE IF NOT EXISTS medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    generic_name VARCHAR(255),
    category VARCHAR(100),
    unit VARCHAR(50) DEFAULT 'strips',
    min_stock_threshold INT DEFAULT 10,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_medicines_seller_id ON medicines(seller_id);
CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_generic_name ON medicines(generic_name);

-- 3. Batches / Stock Inflow (FIFO inventory tracking)
CREATE TABLE IF NOT EXISTS medicine_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    manufacturer VARCHAR(255),
    quantity_received INT NOT NULL CHECK (quantity_received >= 0),
    quantity_available INT NOT NULL CHECK (quantity_available >= 0),
    purchase_price DECIMAL(10,2) NOT NULL CHECK (purchase_price >= 0),
    mrp DECIMAL(10,2) NOT NULL CHECK (mrp >= 0),
    expiry_date DATE NOT NULL,
    purchase_date DATE DEFAULT CURRENT_DATE
);

CREATE INDEX IF NOT EXISTS idx_batches_medicine_expiry ON medicine_batches(medicine_id, expiry_date ASC);
CREATE INDEX IF NOT EXISTS idx_batches_seller_id ON medicine_batches(seller_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry_date ON medicine_batches(expiry_date);

-- 4. Sales Orders
CREATE TABLE IF NOT EXISTS sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
    total_cogs DECIMAL(10,2) NOT NULL CHECK (total_cogs >= 0),
    payment_mode VARCHAR(50) DEFAULT 'CASH', -- 'CASH', 'ONLINE', 'CREDIT'
    sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sales_seller_date ON sales(seller_id, sale_date);
CREATE INDEX IF NOT EXISTS idx_sales_invoice ON sales(invoice_number);

-- 5. Sale Line Items (FIFO batch tracking)
CREATE TABLE IF NOT EXISTS sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES medicine_batches(id) ON DELETE SET NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price DECIMAL(10,2) NOT NULL CHECK (unit_price >= 0),
    cogs DECIMAL(10,2) NOT NULL CHECK (cogs >= 0)
);

CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_batch_id ON sale_items(batch_id);

-- 6. Borrowers / Credit Accounts (Udhar / Khata System)
CREATE TABLE IF NOT EXISTS borrowers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    credit_limit DECIMAL(10,2) DEFAULT 5000.00 CHECK (credit_limit >= 0),
    current_balance DECIMAL(10,2) DEFAULT 0.00 CHECK (current_balance >= 0),
    status VARCHAR(20) DEFAULT 'PENDING', -- 'PENDING', 'PARTIAL', 'SETTLED'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_borrowers_seller_phone ON borrowers(seller_id, phone);

-- 7. Borrower Transactions Ledger
CREATE TABLE IF NOT EXISTS borrower_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    borrower_id UUID NOT NULL REFERENCES borrowers(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    sale_id UUID REFERENCES sales(id) ON DELETE SET NULL,
    type VARCHAR(20) NOT NULL, -- 'CREDIT' or 'PAYMENT'
    payment_method VARCHAR(50) DEFAULT 'CASH', -- 'CASH', 'UPI', 'CARD', 'BANK_TRANSFER'
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    status VARCHAR(20) DEFAULT 'SETTLED', -- 'PENDING', 'PARTIAL', 'SETTLED'
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_borrower_tx_borrower ON borrower_transactions(borrower_id);
CREATE INDEX IF NOT EXISTS idx_borrower_tx_seller ON borrower_transactions(seller_id);
CREATE INDEX IF NOT EXISTS idx_borrower_tx_created ON borrower_transactions(created_at);

-- 8. Operating Expenses (for P&L Net Profit Calculations)
CREATE TABLE IF NOT EXISTS expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id UUID NOT NULL REFERENCES sellers(id) ON DELETE CASCADE,
    category VARCHAR(100) NOT NULL, -- 'RENT', 'UTILITIES', 'STAFF_SALARY', 'INVENTORY_WRITEOFF', 'OPERATIONAL'
    title VARCHAR(255) NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK (amount > 0),
    expense_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_expenses_seller_date ON expenses(seller_id, expense_date);
