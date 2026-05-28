-- postgres schema definition

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(100) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS accounts (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    account_type VARCHAR(50) NOT NULL DEFAULT 'checking',
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    balance_updated_at VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS income_sources (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    gross_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    net_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    frequency VARCHAR(50) NOT NULL DEFAULT 'biweekly',
    next_pay_date VARCHAR(50),
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS income_allocations (
    id VARCHAR(100) PRIMARY KEY,
    income_source_id VARCHAR(100) NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
    account_id VARCHAR(100) NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    allocation_type VARCHAR(50) NOT NULL DEFAULT 'percent',
    allocation_value DECIMAL(12, 2) NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS income_events (
    id VARCHAR(100) PRIMARY KEY,
    income_source_id VARCHAR(100) REFERENCES income_sources(id) ON DELETE SET NULL,
    amount DECIMAL(12, 2) NOT NULL,
    received_date VARCHAR(50) NOT NULL,
    is_bonus INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    account_id VARCHAR(100) REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS expense_categories (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    color VARCHAR(50) NOT NULL DEFAULT '#6366f1',
    icon VARCHAR(50) NOT NULL DEFAULT '📁'
);

CREATE TABLE IF NOT EXISTS expenses (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id VARCHAR(100) NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    due_day_of_month INTEGER,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    frequency VARCHAR(50) DEFAULT 'monthly',
    account_id VARCHAR(100) REFERENCES accounts(id) ON DELETE SET NULL,
    notes TEXT,
    url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS debts (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    balance DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    interest_rate DECIMAL(6, 3) NOT NULL DEFAULT 0.0,
    minimum_payment DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    amount_due_immediately DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    account_id VARCHAR(100) REFERENCES accounts(id) ON DELETE SET NULL,
    due_day_of_month INTEGER,
    debt_type VARCHAR(50) NOT NULL DEFAULT 'other',
    debt_quality VARCHAR(50) NOT NULL DEFAULT 'neutral',
    url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    payment_strategy VARCHAR(50) NOT NULL DEFAULT 'minimum'
);

CREATE TABLE IF NOT EXISTS envelopes (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    category_id VARCHAR(100) REFERENCES expense_categories(id) ON DELETE SET NULL,
    budgeted_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    spent_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    account_id VARCHAR(100) REFERENCES accounts(id) ON DELETE SET NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS envelope_transactions (
    id VARCHAR(100) PRIMARY KEY,
    envelope_id VARCHAR(100) NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL,
    description TEXT,
    transaction_date TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS wants (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    estimated_cost DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    priority VARCHAR(50) NOT NULL DEFAULT 'medium',
    notes TEXT,
    url TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    purchased_at VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS bonus_plans (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    income_event_id VARCHAR(100) REFERENCES income_events(id) ON DELETE SET NULL,
    total_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    strategy VARCHAR(50) NOT NULL DEFAULT 'snowball',
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS bonus_plan_allocations (
    id VARCHAR(100) PRIMARY KEY,
    bonus_plan_id VARCHAR(100) NOT NULL REFERENCES bonus_plans(id) ON DELETE CASCADE,
    allocation_type VARCHAR(50) NOT NULL,
    reference_id VARCHAR(100),
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sandbox_instances (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(user_id, month, year)
);

CREATE TABLE IF NOT EXISTS sandbox_items (
    id VARCHAR(100) PRIMARY KEY,
    instance_id VARCHAR(100) NOT NULL REFERENCES sandbox_instances(id) ON DELETE CASCADE,
    item_type VARCHAR(50) NOT NULL,
    item_ref_id VARCHAR(100) NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 0,
    amount_override DECIMAL(12, 2),
    account_id VARCHAR(100) REFERENCES accounts(id) ON DELETE SET NULL,
    name VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS committed_payoff_plan (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy VARCHAR(50) NOT NULL DEFAULT 'snowball',
    extra_payment DECIMAL(12, 2) NOT NULL DEFAULT 0.0,
    target_months INTEGER,
    excluded_debt_ids TEXT,
    committed_at TIMESTAMP NOT NULL DEFAULT NOW()
);
