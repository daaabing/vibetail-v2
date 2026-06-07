
-- profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.profiles TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles are viewable by everyone"
  ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can delete own profile"
  ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- updated_at helper
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- cocktails table
CREATE TABLE public.cocktails (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  cocktail_name TEXT NOT NULL,
  original_mood TEXT NOT NULL DEFAULT '',
  selected_flavors TEXT[] NOT NULL DEFAULT '{}',
  custom_preference TEXT NOT NULL DEFAULT '',
  flavor_profile TEXT NOT NULL DEFAULT '',
  tastes_like TEXT NOT NULL DEFAULT '',
  ingredients TEXT[] NOT NULL DEFAULT '{}',
  recipe TEXT NOT NULL DEFAULT '',
  roast TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  image_data TEXT,
  image_url TEXT,
  lang TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX cocktails_user_id_idx ON public.cocktails(user_id);
CREATE INDEX cocktails_created_at_idx ON public.cocktails(created_at DESC);

GRANT SELECT ON public.cocktails TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.cocktails TO authenticated;
GRANT ALL ON public.cocktails TO service_role;

ALTER TABLE public.cocktails ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cocktails are viewable by everyone"
  ON public.cocktails FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create cocktails"
  ON public.cocktails FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own cocktails"
  ON public.cocktails FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own cocktails"
  ON public.cocktails FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_cocktails_updated_at
  BEFORE UPDATE ON public.cocktails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
