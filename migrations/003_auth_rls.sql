ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS auth_user_id TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_auth_user_id_key
  ON profiles (auth_user_id);

ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS contract_size NUMERIC NOT NULL DEFAULT 1;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE trades FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_authenticated_owner ON profiles;
CREATE POLICY profiles_authenticated_owner ON profiles
  FOR ALL
  USING (auth_user_id = NULLIF(current_setting('app.current_user_id', true), ''))
  WITH CHECK (auth_user_id = NULLIF(current_setting('app.current_user_id', true), ''));

DROP POLICY IF EXISTS trades_authenticated_owner ON trades;
CREATE POLICY trades_authenticated_owner ON trades
  FOR ALL
  USING (
    user_id IN (
      SELECT id
      FROM profiles
      WHERE auth_user_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
  )
  WITH CHECK (
    user_id IN (
      SELECT id
      FROM profiles
      WHERE auth_user_id = NULLIF(current_setting('app.current_user_id', true), '')
    )
  );
