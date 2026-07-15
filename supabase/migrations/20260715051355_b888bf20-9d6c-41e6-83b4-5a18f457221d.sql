
-- Lock down game_sessions, game_results, recommendations.
-- All writes/reads go through service_role (supabaseAdmin), which bypasses RLS.
-- Public/anon/authenticated should have no direct access.

DROP POLICY IF EXISTS "Anyone can create a game session" ON public.game_sessions;
DROP POLICY IF EXISTS "Anyone can read game sessions" ON public.game_sessions;

DROP POLICY IF EXISTS "Anyone can create a game result" ON public.game_results;
DROP POLICY IF EXISTS "Anyone can read game results" ON public.game_results;

DROP POLICY IF EXISTS "Anyone can create a recommendation" ON public.recommendations;
DROP POLICY IF EXISTS "Anyone can read recommendations" ON public.recommendations;

-- Revoke Data API grants from anon/authenticated so PostgREST refuses direct access.
REVOKE ALL ON public.game_sessions FROM anon, authenticated;
REVOKE ALL ON public.game_results FROM anon, authenticated;
REVOKE ALL ON public.recommendations FROM anon, authenticated;

GRANT ALL ON public.game_sessions TO service_role;
GRANT ALL ON public.game_results TO service_role;
GRANT ALL ON public.recommendations TO service_role;

-- merchant_access_tokens: highly sensitive, service-role only.
-- Add explicit deny policy for anon/authenticated so intent is documented,
-- and ensure no Data API grants exist.
REVOKE ALL ON public.merchant_access_tokens FROM anon, authenticated;
GRANT ALL ON public.merchant_access_tokens TO service_role;

DROP POLICY IF EXISTS "Deny all access to merchant access tokens" ON public.merchant_access_tokens;
CREATE POLICY "Deny all access to merchant access tokens"
  ON public.merchant_access_tokens
  AS RESTRICTIVE
  FOR ALL
  TO anon, authenticated
  USING (false)
  WITH CHECK (false);
