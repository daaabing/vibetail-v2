
CREATE OR REPLACE FUNCTION public.gen_cocktail_public_id()
RETURNS text
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  alphabet text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text;
  i int;
  attempts int := 0;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..10 LOOP
      result := result || substr(alphabet, 1 + floor(random() * 62)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.cocktails WHERE public_id = result);
    attempts := attempts + 1;
    IF attempts > 10 THEN
      RAISE EXCEPTION 'Could not generate unique public_id';
    END IF;
  END LOOP;
  RETURN result;
END;
$$;

ALTER TABLE public.cocktails ADD COLUMN IF NOT EXISTS public_id text;

UPDATE public.cocktails
SET public_id = public.gen_cocktail_public_id()
WHERE public_id IS NULL;

ALTER TABLE public.cocktails ALTER COLUMN public_id SET NOT NULL;
ALTER TABLE public.cocktails ALTER COLUMN public_id SET DEFAULT public.gen_cocktail_public_id();
CREATE UNIQUE INDEX IF NOT EXISTS cocktails_public_id_key ON public.cocktails (public_id);
