
-- ============================================================
-- Menu Onboarding & Drink Matching System
-- ============================================================

-- Enums
CREATE TYPE public.menu_status AS ENUM ('draft', 'published', 'paused');
CREATE TYPE public.menu_item_availability AS ENUM ('active', 'sold_out', 'hidden');

-- ---------- merchants ----------
CREATE TABLE public.merchants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  logo_url TEXT,
  cover_image_url TEXT,
  short_intro TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.merchants TO anon, authenticated;
GRANT ALL ON public.merchants TO service_role;
ALTER TABLE public.merchants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active merchants" ON public.merchants
  FOR SELECT USING (is_active = TRUE);

CREATE TRIGGER trg_merchants_updated_at
  BEFORE UPDATE ON public.merchants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- merchant_access_tokens ----------
CREATE TABLE public.merchant_access_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  label TEXT,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_mat_merchant ON public.merchant_access_tokens(merchant_id);
GRANT ALL ON public.merchant_access_tokens TO service_role;
ALTER TABLE public.merchant_access_tokens ENABLE ROW LEVEL SECURITY;
-- No anon/authenticated policies — service_role only.

-- ---------- menus ----------
CREATE TABLE public.menus (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  merchant_id UUID NOT NULL REFERENCES public.merchants(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  status public.menu_status NOT NULL DEFAULT 'draft',
  short_intro TEXT,
  cover_image_url TEXT,
  enabled_game_ids TEXT[] NOT NULL DEFAULT '{}',
  game_display_order TEXT[] NOT NULL DEFAULT '{}',
  published_version_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (merchant_id, slug)
);
CREATE INDEX idx_menus_merchant ON public.menus(merchant_id);
CREATE INDEX idx_menus_status ON public.menus(status);
GRANT SELECT ON public.menus TO anon, authenticated;
GRANT ALL ON public.menus TO service_role;
ALTER TABLE public.menus ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published menus" ON public.menus
  FOR SELECT USING (
    status = 'published'
    AND EXISTS (
      SELECT 1 FROM public.merchants m
      WHERE m.id = merchant_id AND m.is_active = TRUE
    )
  );

CREATE TRIGGER trg_menus_updated_at
  BEFORE UPDATE ON public.menus
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- menu_items (draft/live availability) ----------
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT,
  alcoholic BOOLEAN NOT NULL DEFAULT TRUE,
  base_spirit TEXT,
  flavor_tags TEXT[] NOT NULL DEFAULT '{}',
  mood_tags TEXT[] NOT NULL DEFAULT '{}',
  dimensions JSONB NOT NULL DEFAULT '{}'::jsonb,
  allergens TEXT[] NOT NULL DEFAULT '{}',
  recommendation_priority INT NOT NULL DEFAULT 0,
  availability_status public.menu_item_availability NOT NULL DEFAULT 'active',
  original_language TEXT NOT NULL DEFAULT 'en',
  translations JSONB NOT NULL DEFAULT '{}'::jsonb,
  section TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_items_menu ON public.menu_items(menu_id);
CREATE INDEX idx_items_availability ON public.menu_items(menu_id, availability_status);
GRANT SELECT ON public.menu_items TO anon, authenticated;
GRANT ALL ON public.menu_items TO service_role;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
-- Anon can read items only for a published menu (so sold_out/hidden updates land immediately).
CREATE POLICY "Anyone can view items of published menus" ON public.menu_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.menus mn
      JOIN public.merchants mc ON mc.id = mn.merchant_id
      WHERE mn.id = menu_id
        AND mn.status = 'published'
        AND mc.is_active = TRUE
    )
  );

CREATE TRIGGER trg_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- menu_versions (immutable snapshots) ----------
CREATE TABLE public.menu_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  snapshot JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (menu_id, version_number)
);
CREATE INDEX idx_versions_menu ON public.menu_versions(menu_id);
GRANT SELECT ON public.menu_versions TO anon, authenticated;
GRANT ALL ON public.menu_versions TO service_role;
ALTER TABLE public.menu_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view published menu versions" ON public.menu_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.menus mn
      WHERE mn.id = menu_id AND mn.status = 'published'
    )
  );

-- FK from menus.published_version_id → menu_versions.id (deferred to avoid cycle at create)
ALTER TABLE public.menus
  ADD CONSTRAINT menus_published_version_fk
  FOREIGN KEY (published_version_id)
  REFERENCES public.menu_versions(id)
  ON DELETE SET NULL;

-- ---------- game_sessions ----------
CREATE TABLE public.game_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  anonymous_session_id TEXT NOT NULL,
  merchant_id UUID REFERENCES public.merchants(id) ON DELETE SET NULL,
  menu_id UUID REFERENCES public.menus(id) ON DELETE SET NULL,
  menu_version_id UUID REFERENCES public.menu_versions(id) ON DELETE SET NULL,
  game_id TEXT NOT NULL,
  game_version TEXT NOT NULL,
  is_preview BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gs_menu ON public.game_sessions(menu_id);
CREATE INDEX idx_gs_anon ON public.game_sessions(anonymous_session_id);
GRANT INSERT, SELECT ON public.game_sessions TO anon, authenticated;
GRANT ALL ON public.game_sessions TO service_role;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a game session" ON public.game_sessions
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can read game sessions" ON public.game_sessions
  FOR SELECT USING (TRUE);

-- ---------- game_results ----------
CREATE TABLE public.game_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_session_id UUID NOT NULL REFERENCES public.game_sessions(id) ON DELETE CASCADE,
  display_result JSONB NOT NULL DEFAULT '{}'::jsonb,
  match_profile JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gr_session ON public.game_results(game_session_id);
GRANT INSERT, SELECT ON public.game_results TO anon, authenticated;
GRANT ALL ON public.game_results TO service_role;
ALTER TABLE public.game_results ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a game result" ON public.game_results
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can read game results" ON public.game_results
  FOR SELECT USING (TRUE);

-- ---------- recommendations ----------
CREATE TABLE public.recommendations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  game_result_id UUID NOT NULL REFERENCES public.game_results(id) ON DELETE CASCADE,
  menu_id UUID NOT NULL REFERENCES public.menus(id) ON DELETE CASCADE,
  menu_version_id UUID REFERENCES public.menu_versions(id) ON DELETE SET NULL,
  matched_menu_item_id UUID REFERENCES public.menu_items(id) ON DELETE SET NULL,
  score NUMERIC,
  score_breakdown JSONB,
  recommendation_reason TEXT,
  no_match_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_rec_result ON public.recommendations(game_result_id);
GRANT INSERT, SELECT ON public.recommendations TO anon, authenticated;
GRANT ALL ON public.recommendations TO service_role;
ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can create a recommendation" ON public.recommendations
  FOR INSERT WITH CHECK (TRUE);
CREATE POLICY "Anyone can read recommendations" ON public.recommendations
  FOR SELECT USING (TRUE);

-- ============================================================
-- Seed: Double Chicken Please
-- ============================================================
DO $$
DECLARE
  v_merchant_id UUID;
  v_menu_id UUID;
  v_version_id UUID;
BEGIN
  INSERT INTO public.merchants (slug, name, short_intro, is_active)
  VALUES ('double-chicken-please', 'Double Chicken Please',
          'Culinary cocktails in NYC''s Lower East Side.', TRUE)
  RETURNING id INTO v_merchant_id;

  INSERT INTO public.menus (merchant_id, slug, name, status, short_intro,
                            enabled_game_ids, game_display_order)
  VALUES (v_merchant_id, 'main', 'Main Menu', 'draft',
          'Culinary cocktails at Double Chicken Please.',
          ARRAY['vibetail-mood'], ARRAY['vibetail-mood'])
  RETURNING id INTO v_menu_id;

  -- Insert items (matching src/lib/dcp-menu.ts, no prices).
  INSERT INTO public.menu_items (menu_id, name, ingredients, section, alcoholic, sort_order) VALUES
    (v_menu_id, 'Early Bird', ARRAY['Guilder''s Green Tea Gin','Cocchi Americano','apricot','ginger ale','plum salt'], 'Free Range', TRUE, 10),
    (v_menu_id, 'Tipsy Tulip', ARRAY['Grey Goose Vodka','Cointreau','Symphony 6','tana','cranberry','apple'], 'Free Range', TRUE, 20),
    (v_menu_id, 'Cuppa Sunshine', ARRAY['Acqua di Cedro','espresso','yuzu','shiso','Licor 43','agave'], 'Free Range', TRUE, 30),
    (v_menu_id, 'Gilded Orchard', ARRAY['Glenfiddich 15yr','truffle honey','apple','riesling','passionfruit','clarified milk'], 'Free Range', TRUE, 40),
    (v_menu_id, 'Double Bubble', ARRAY['Kinmen Kaoliang','MUYU Jasmine Verte','Hinata Matcha by Kettl','strawberry','oatmilk','tapioca'], 'Free Range', TRUE, 50),
    (v_menu_id, 'Grapefruit with a Grudge', ARRAY['Campari','Aperol','The Pathfinder','caramel','grapefruit','tonic','roasted pecan'], 'Free Range', TRUE, 60),
    (v_menu_id, 'Fxxking Little Brain', ARRAY['Don Fulano Blanco Tequila','Barsol Pisco','banana','coconut','popcorn','walnut'], 'Free Range', TRUE, 70),
    (v_menu_id, 'Holy Shishito', ARRAY['Patrón Silver','Acqua di Cedro','Ayuuk','charred shishito','kabosu','bell pepper','kiwi','wasabi'], 'Free Range', TRUE, 80),
    (v_menu_id, 'Space Dog', ARRAY['Diplomatico Rum','Campari','banana','pineapple','citrus','coffee','taro','clarified milk'], 'Free Range', TRUE, 90),
    (v_menu_id, 'She''s So Old Fashioned', ARRAY['Glenfiddich 12yr Original','MUYU Vetiver Gris','D.O.M. Bénédictine','shiso','palo santo'], 'Free Range', TRUE, 100),
    (v_menu_id, 'DMV', ARRAY['Roku Gin','Altamura Vodka','olive','fennel','makrut lime leaf'], 'Free Range', TRUE, 110),
    (v_menu_id, 'Fireside Tipple', ARRAY['Ilegal Joven Mezcal','Campari','Cocchi Americano','sage','cascara'], 'Free Range', TRUE, 120),
    (v_menu_id, 'Waldorf Salad', ARRAY['Dewar''s 12yr Whiskey','Laphroaig 10yr Whiskey','celery','kale','apple','soda','walnut bitters'], 'The Coop', TRUE, 210),
    (v_menu_id, 'Japanese Cold Noodle', ARRAY['Bacardi Superior Rum','pineapple','cucumber','coconut','lime','sesame oil'], 'The Coop', TRUE, 220),
    (v_menu_id, 'Melon Prosciutto', ARRAY['SG Imo shochu','Grey Goose vodka','jamón','cantaloupe','watermelon','fino sherry','goat cheese','clarified milk'], 'The Coop', TRUE, 230),
    (v_menu_id, 'Papaya Salad', ARRAY['Patrón Silver','peanut','fish sauce','tamarind','kumquat','cherry tomato','coconut','clarified milk'], 'The Coop', TRUE, 240),
    (v_menu_id, 'Cold Pizza', ARRAY['Don Fulano Blanco Tequila','Parmigiano Reggiano','burnt toast','tomato','basil','honey','egg white'], 'The Coop', TRUE, 250),
    (v_menu_id, 'Red Eye Gravy', ARRAY['Teeling Irish Whiskey','coffee butter','corn','walnut','wild mushroom','microwaved coppa'], 'The Coop', TRUE, 260),
    (v_menu_id, 'Thai Curry', ARRAY['Sonbi Gin','Ilegal Joven Mezcal','green curry','lime'], 'The Coop', TRUE, 270),
    (v_menu_id, 'Mango Sticky Rice', ARRAY['Bacardi Reserva Ocho Rum','mango','sticky rice Pu''er tea','wakame','cold brew','coconut'], 'The Coop', TRUE, 280),
    (v_menu_id, 'French Toast', ARRAY['Grey Goose Vodka','roasted barley','brioche','coconut','milk','maple syrup','egg'], 'The Coop', TRUE, 290),
    (v_menu_id, 'Custard Bun', ARRAY['Wakaze Nigori Sake','sparkling wine','koji','salted egg yolk','Pu''er tea','oat milk'], 'The Coop', TRUE, 300),
    (v_menu_id, 'Key Lime Pie', ARRAY['Bombay Sapphire Gin','stonefruit','winter melon','sweet cream','egg white','lime','soda'], 'The Coop', TRUE, 310),
    (v_menu_id, 'Dorayaki', ARRAY['Kavalan Distillery Select Whisky','Suntory Toki Whisky','amontillado sherry','red bean','corn','barley tea','lychee'], 'The Coop', TRUE, 320),
    (v_menu_id, 'DCP House Shot', ARRAY['Ilegal Joven Mezcal','plum','shiso'], 'DCP House Shot', TRUE, 400),
    (v_menu_id, 'Dirty Margarita', ARRAY['Ilegal Joven Mezcal','Cocchi Americano','Italicus','verjus','shiso','olive'], 'Classics?', TRUE, 510),
    (v_menu_id, 'Tomatillo Mojito', ARRAY['Bacardi Superior Rum','tomato vine','tomatillo','mint','makrut lime leaf','soda'], 'Classics?', TRUE, 520),
    (v_menu_id, 'Banana Barley Bamboo', ARRAY['fino & amontillado sherry','Dolin dry vermouth','Savoia Orancio','banana','barley tea'], 'Classics?', TRUE, 530),
    (v_menu_id, 'Earl Grey Vieux Carré', ARRAY['Michter''s Kentucky Straight Rye','Pierre Ferrand Cognac','Italicus','Bénédictine','Earl Grey'], 'Classics?', TRUE, 540),
    (v_menu_id, 'Osmanthus Bronx', ARRAY['Tanqueray No. TEN Gin','Martini Rubino','manzanilla sherry','Savoia Orancio','osmanthus','orange'], 'Classics?', TRUE, 550),
    (v_menu_id, 'Raspberry Espresso Martini', ARRAY['Grey Goose Vodka','SC Imo Shochu','espresso','raspberry','rosemary'], 'Classics?', TRUE, 560);

  -- Publish version 1 snapshot.
  INSERT INTO public.menu_versions (menu_id, version_number, snapshot)
  SELECT v_menu_id, 1, jsonb_build_object(
    'menu', to_jsonb(mn.*),
    'items', COALESCE(jsonb_agg(to_jsonb(mi.*) ORDER BY mi.sort_order), '[]'::jsonb)
  )
  FROM public.menus mn
  LEFT JOIN public.menu_items mi ON mi.menu_id = mn.id
  WHERE mn.id = v_menu_id
  GROUP BY mn.id, mn.merchant_id, mn.slug, mn.name, mn.status, mn.short_intro,
           mn.cover_image_url, mn.enabled_game_ids, mn.game_display_order,
           mn.published_version_id, mn.created_at, mn.updated_at
  RETURNING id INTO v_version_id;

  UPDATE public.menus
     SET status = 'published', published_version_id = v_version_id
   WHERE id = v_menu_id;
END $$;
