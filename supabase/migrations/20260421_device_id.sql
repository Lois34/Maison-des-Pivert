-- Migration : ajout device_id dans push_subscriptions
-- Permet d'identifier l'appareil expéditeur pour ne pas se notifier soi-même

ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS device_id TEXT;
