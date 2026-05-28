-- sqlite schema definition

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL DEFAULT 'checking',
    balance REAL NOT NULL DEFAULT 0.0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    balance_updated_at TEXT
);

CREATE TABLE IF NOT EXISTS income_sources (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    gross_amount REAL NOT NULL DEFAULT 0.0,
    net_amount REAL NOT NULL DEFAULT 0.0,
    frequency TEXT NOT NULL DEFAULT 'biweekly',
    next_pay_date TEXT,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS income_allocations (
    id TEXT PRIMARY KEY,
    income_source_id TEXT NOT NULL REFERENCES income_sources(id) ON DELETE CASCADE,
    account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    allocation_type TEXT NOT NULL DEFAULT 'percent',
    allocation_value REAL NOT NULL DEFAULT 0.0
);

CREATE TABLE IF NOT EXISTS income_events (
    id TEXT PRIMARY KEY,
    income_source_id TEXT REFERENCES income_sources(id) ON DELETE SET NULL,
    amount REAL NOT NULL,
    received_date TEXT NOT NULL,
    is_bonus INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS expense_categories (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT NOT NULL DEFAULT '📁'
);

CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id TEXT NOT NULL REFERENCES expense_categories(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    amount REAL NOT NULL DEFAULT 0.0,
    due_day_of_month INTEGER,
    is_recurring INTEGER NOT NULL DEFAULT 0,
    frequency TEXT DEFAULT 'monthly',
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    notes TEXT,
    url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS debts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    balance REAL NOT NULL DEFAULT 0.0,
    interest_rate REAL NOT NULL DEFAULT 0.0,
    minimum_payment REAL NOT NULL DEFAULT 0.0,
    amount_due_immediately REAL NOT NULL DEFAULT 0.0,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    due_day_of_month INTEGER,
    debt_type TEXT NOT NULL DEFAULT 'other',
    debt_quality TEXT NOT NULL DEFAULT 'neutral',
    url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    payment_strategy TEXT NOT NULL DEFAULT 'minimum'
);

CREATE TABLE IF NOT EXISTS envelopes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    category_id TEXT REFERENCES expense_categories(id) ON DELETE SET NULL,
    budgeted_amount REAL NOT NULL DEFAULT 0.0,
    spent_amount REAL NOT NULL DEFAULT 0.0,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS envelope_transactions (
    id TEXT PRIMARY KEY,
    envelope_id TEXT NOT NULL REFERENCES envelopes(id) ON DELETE CASCADE,
    amount REAL NOT NULL,
    description TEXT,
    transaction_date TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS wants (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    estimated_cost REAL NOT NULL DEFAULT 0.0,
    priority TEXT NOT NULL DEFAULT 'medium',
    notes TEXT,
    url TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    purchased_at TEXT
);

CREATE TABLE IF NOT EXISTS bonus_plans (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    income_event_id TEXT REFERENCES income_events(id) ON DELETE SET NULL,
    total_amount REAL NOT NULL DEFAULT 0.0,
    strategy TEXT NOT NULL DEFAULT 'snowball',
    notes TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS bonus_plan_allocations (
    id TEXT PRIMARY KEY,
    bonus_plan_id TEXT NOT NULL REFERENCES bonus_plans(id) ON DELETE CASCADE,
    allocation_type TEXT NOT NULL,
    reference_id TEXT,
    amount REAL NOT NULL DEFAULT 0.0,
    order_index INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS sandbox_instances (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    month INTEGER NOT NULL,
    year INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(user_id, month, year)
);

CREATE TABLE IF NOT EXISTS sandbox_items (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL REFERENCES sandbox_instances(id) ON DELETE CASCADE,
    item_type TEXT NOT NULL,
    item_ref_id TEXT NOT NULL,
    is_paid INTEGER NOT NULL DEFAULT 0,
    amount_override REAL,
    account_id TEXT REFERENCES accounts(id) ON DELETE SET NULL,
    name TEXT
);

CREATE TABLE IF NOT EXISTS committed_payoff_plan (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    strategy TEXT NOT NULL DEFAULT 'snowball',
    extra_payment REAL NOT NULL DEFAULT 0.0,
    target_months INTEGER,
    excluded_debt_ids TEXT,
    committed_at TEXT NOT NULL DEFAULT (datetime('now'))
);
