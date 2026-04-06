-- Table pour stocker les abonnements push des utilisateurs
-- À exécuter dans l'éditeur SQL de Supabase (https://supabase.com/dashboard)

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint    TEXT NOT NULL UNIQUE,
  p256dh      TEXT NOT NULL,
  auth        TEXT NOT NULL,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- Autoriser les insertions/suppressions depuis le client (clé publique)
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tout le monde peut s'abonner"
  ON push_subscriptions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Lecture réservée au service role"
  ON push_subscriptions FOR SELECT
  USING (false);

CREATE POLICY "Suppression réservée au service role"
  ON push_subscriptions FOR DELETE
  USING (false);
