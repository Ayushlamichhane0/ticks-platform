DROP POLICY IF EXISTS profiles_admin_select ON profiles;
CREATE POLICY profiles_admin_select ON profiles
  FOR SELECT
  USING (current_setting('app.is_admin', true) = 'true');

DROP POLICY IF EXISTS trades_admin_view_as_select ON trades;
CREATE POLICY trades_admin_view_as_select ON trades
  FOR SELECT
  USING (current_setting('app.is_admin', true) = 'true');
