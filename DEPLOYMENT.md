# PharmaPulse Deployment Guide: GitHub & Vercel

This guide provides step-by-step instructions to push **PharmaPulse** to **GitHub** and deploy it to **Vercel** with a production PostgreSQL database.

---

## Part 1: Publish to GitHub

### Step 1: Create a New GitHub Repository
1. Go to [github.com/new](https://github.com/new).
2. Set **Repository name** to: `pharmapulse` (or any name you prefer).
3. Choose **Public** or **Private**.
4. **Do NOT** initialize with a README, .gitignore, or license (these are already configured in this project).
5. Click **Create repository**.

### Step 2: Link Remote & Push
In your PowerShell / terminal inside this project directory (`C:\Users\DELL\.gemini\antigravity\scratch\pharma-pulse`), run:

```bash
# 1. Rename branch to main (if not already)
git branch -M main

# 2. Add your GitHub repository as remote (replace YOUR_USERNAME and YOUR_REPO)
git remote add origin https://github.com/YOUR_USERNAME/pharmapulse.git

# 3. Push to GitHub
git push -u origin main
```

---

## Part 2: Deploy to Vercel

Vercel is a serverless environment. For production persistence, use a hosted PostgreSQL database (such as **Vercel Postgres (Neon)**, **Supabase**, or **Neon.tech**).

### Step 1: Switch Prisma Schema to PostgreSQL
Before deploying to Vercel, switch Prisma to target PostgreSQL:

```bash
npm run db:postgres
git add prisma/schema.prisma
git commit -m "Configure Prisma datasource for PostgreSQL (Vercel)"
git push origin main
```

*(Note: Whenever you want to switch back to local SQLite dev, just run `npm run db:sqlite`)*

---

### Step 2: Import Project on Vercel
1. Log in to [vercel.com](https://vercel.com).
2. Click **Add New...** -> **Project**.
3. Under **Import Git Repository**, find your `pharmapulse` repo and click **Import**.
4. Leave **Framework Preset** as **Next.js**.

---

### Step 3: Add a PostgreSQL Database on Vercel

#### Option A: 1-Click Vercel Postgres (Recommended)
1. In your Vercel Dashboard, navigate to the **Storage** tab.
2. Click **Create Database** -> select **Postgres** (powered by Neon).
3. Name your store (e.g., `pharmapulse-db`), accept terms, and click **Create**.
4. Click **Connect to Project** and select your `pharmapulse` project.
5. Vercel will automatically inject `POSTGRES_PRISMA_URL` and `DATABASE_URL` into your project environment variables!

#### Option B: Using Supabase or Neon.tech
If you already have a PostgreSQL connection string from [neon.tech](https://neon.tech) or [supabase.com](https://supabase.com):
1. In Vercel Project Settings -> **Environment Variables**, add:
   - `DATABASE_URL`: `postgresql://user:password@host/database?sslmode=require`
   - `JWT_SECRET`: Any random 32-character string (e.g., `pharma-pulse-secret-prod-2026-secure-jwt`)

---

### Step 4: Configure Environment Variables in Vercel
In the **Environment Variables** section of your Vercel deployment:
- `JWT_SECRET`: `your-secure-random-jwt-secret-string-here`
- `DATABASE_URL`: *(automatically populated if using Vercel Postgres, or paste your Supabase/Neon connection URL)*

---

### Step 5: Deploy & Migrate Database

1. Click **Deploy**. Vercel will build and deploy your app.
2. Once deployed, push your database schema to production. In your local terminal:

```bash
# Push schema to your cloud database
npx prisma db push

# (Optional) Seed demo medicines, batches, sales, and borrowers
node scripts/seed.mjs
```

---

## 🎯 Production Checklist

- [x] `.gitignore` ignores `.env`, `dev.db`, and `node_modules`
- [x] `package.json` includes `"postinstall": "prisma generate"`
- [x] Build script runs `prisma generate && next build`
- [x] Strict tenant isolation by `seller_id`
- [x] Database switching scripts (`npm run db:postgres` and `npm run db:sqlite`)
