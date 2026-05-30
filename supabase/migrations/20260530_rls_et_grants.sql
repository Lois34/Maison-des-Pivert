-- Migration sécurité : activation RLS + politiques + grants explicites
-- Tables créées manuellement sans protection : inventaire, lieux_photos, liste_todo
-- Grants ajoutés sur toutes les tables (requis dès oct. 2026 pour les nouveaux projets)

-- ── inventaire ────────────────────────────────────────────────────────────────
ALTER TABLE public.inventaire ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read/write" ON public.inventaire
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── lieux_photos ──────────────────────────────────────────────────────────────
ALTER TABLE public.lieux_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read/write" ON public.lieux_photos
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── liste_todo ────────────────────────────────────────────────────────────────
ALTER TABLE public.liste_todo ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read/write" ON public.liste_todo
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ── Grants explicites (toutes les tables) ─────────────────────────────────────
-- Requis à partir du 30 oct. 2026 pour que PostgREST/supabase-js puisse accéder
-- aux tables du schéma public dans les nouveaux projets (et futurs projets existants).
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inventaire      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.lieux_photos    TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.liste_todo      TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.liste_courses   TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.recettes        TO anon, authenticated;
-- push_subscriptions : insert uniquement côté client (select/delete via service role uniquement)
GRANT INSERT ON TABLE public.push_subscriptions TO anon, authenticated;
