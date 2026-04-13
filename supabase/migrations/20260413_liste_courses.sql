-- Migration : Table liste de courses partagée
-- À exécuter dans le SQL Editor de ton projet Supabase

CREATE TABLE IF NOT EXISTS public.liste_courses (
  id          uuid                        DEFAULT gen_random_uuid() PRIMARY KEY,
  nom         text                        NOT NULL,
  quantite    integer                     NOT NULL DEFAULT 1,
  magasin     text,
  achete      boolean                     NOT NULL DEFAULT false,
  created_at  timestamp with time zone    NOT NULL DEFAULT now()
);

-- Sécurité : accès public (même politique que la table inventaire)
ALTER TABLE public.liste_courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read/write" ON public.liste_courses
  FOR ALL
  TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- Activer la réplication temps réel pour la synchronisation instantanée
ALTER PUBLICATION supabase_realtime ADD TABLE public.liste_courses;
