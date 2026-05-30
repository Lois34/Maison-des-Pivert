-- Correctifs push_subscriptions (session 30/05/2026)
-- 1. GRANT UPDATE manquant (l'upsert échouait silencieusement sans lui)
-- 2. GRANT SELECT + politique lecture (requis par PostgREST pour le RETURNING interne)
-- 3. Suppression du trigger on_todo_insert → notify-taches (envoyait à tout le monde sans filtrage)
--    Le frontend appelle déjà notify-courses (v5) avec device_id pour le filtrage correct

GRANT UPDATE ON TABLE public.push_subscriptions TO anon, authenticated;

GRANT SELECT ON TABLE public.push_subscriptions TO anon, authenticated;

CREATE POLICY "Lecture publique" ON public.push_subscriptions
  FOR SELECT TO anon, authenticated
  USING (true);

-- Trigger supprimé : doublonnait les notifications tâches sans filtrage expéditeur
DROP TRIGGER IF EXISTS on_todo_insert ON public.liste_todo;
DROP FUNCTION IF EXISTS trigger_notify_taches();
