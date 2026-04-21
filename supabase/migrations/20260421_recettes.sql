-- Migration : table recettes partagées avec réglages air fryer
CREATE TABLE IF NOT EXISTS public.recettes (
  id          UUID                      DEFAULT gen_random_uuid() PRIMARY KEY,
  nom         TEXT                      NOT NULL,
  description TEXT,
  ingredients TEXT,
  instructions TEXT,
  image_url   TEXT,
  cuisson     JSONB                     NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ               NOT NULL DEFAULT now()
);

ALTER TABLE public.recettes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read/write" ON public.recettes
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);
