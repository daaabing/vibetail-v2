
ALTER TABLE public.menus
  ADD COLUMN IF NOT EXISTS menu_file_url text,
  ADD COLUMN IF NOT EXISTS menu_file_type text;
