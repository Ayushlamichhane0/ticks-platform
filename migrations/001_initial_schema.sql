CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT,
  demo_balance NUMERIC DEFAULT 100000.00,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS trades (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  symbol TEXT,
  amount NUMERIC,
  price NUMERIC,
  side TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
