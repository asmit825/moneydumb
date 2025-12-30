# MONEY_DUMB // Financial Command Center

![Version](https://img.shields.io/badge/version-1.0.0-green.svg)
![Status](https://img.shields.io/badge/status-active-success.svg)
![License](https://img.shields.io/badge/license-MIT-blue.svg)

**MONEY_DUMB** is a retro-styled, mobile-optimized personal finance dashboard designed to answer one question: *"Am I safe to spend?"* Unlike traditional budget apps that focus on categorization, this system focuses on **Liquidity** and **Cash Flow Coverage**. It subtracts pending bills from current assets to show your true "Safe Balance."

---

## 🚀 Features

### 🟢 Core Functionality
* **Liquidity Monitor:** Real-time calculation of `Total Cash - Pending Bills = Safe Balance`.
* **Coverage Gauge:** Visualizes if your current assets + future income are enough to cover this month's obligations.
* **Unified Expense Log:** Tracks both one-time transactions and recurring bill templates.
* **Projected Inbound:** Logs future income (paychecks) to forecast end-of-month surplus/deficit.

### 📱 Visual & UX
* **Mobile Optimized:** Responsive grid that switches from rigid desktop layouts to flexible mobile stacks.
* **Retro Aesthetic:** Terminal-inspired UI with neon greens, ambers, and monochromatic styling.
* **Visualizations:** CSS-based Donut Charts, Stacked Bars, and Completion Gauges (No heavy chart libraries).

### 🛡️ Security & Sandbox
* **Secure Auth:** Custom authentication using `bcryptjs` hashing and HTTP-only cookies.
* **Sandbox Mode:** Users can click "Enter Sandbox" to generate a temporary, isolated environment with dummy data.
* **Auto-Cleanup:** Sandbox accounts and data are automatically purged from the database after 24 hours.

---

## 🛠️ Tech Stack

* **Framework:** [Next.js 14](https://nextjs.org/) (App Router)
* **Language:** [TypeScript](https://www.typescriptlang.org/)
* **Styling:** [Tailwind CSS](https://tailwindcss.com/)
* **Database:** [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres) (SQL)
* **Deployment:** [Vercel](https://vercel.com/)
* **Reporting:** `xlsx` (Excel Export)

---

## 💾 Database Schema

The system uses a relational PostgreSQL database. Below are the table definitions required to run the app.

```sql
-- 1. USERS
CREATE TABLE users (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

-- 2. BANKS (Assets)
CREATE TABLE banks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL,
  current_balance DECIMAL(12, 2) DEFAULT 0.00
);

-- 3. EXPENSE TYPES (Categories)
CREATE TABLE expense_types (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(50) NOT NULL
);

-- 4. EXPENSES (Bill Queue)
CREATE TABLE expenses (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  type_id UUID REFERENCES expense_types(id) ON DELETE SET NULL,
  name VARCHAR(100) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'not-paid', 'completed', 'template'
  due_date DATE,
  is_recurring BOOLEAN DEFAULT FALSE,
  due_day INTEGER -- Used only if is_recurring = TRUE
);

-- 5. INBOUNDS (Future Income)
CREATE TABLE inbounds (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  bank_id UUID REFERENCES banks(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  date DATE NOT NULL,
  note TEXT
);