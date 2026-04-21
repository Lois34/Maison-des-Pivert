// Supabase Edge Function - Notification ajout liste de courses
// Appelée depuis le frontend quand un article est ajouté
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = 'BGiwV75qIldzegVA3UlJpovjYZ9mKlSXOjLp9jn9hkuM82ZC1m1Gan1UaeIwAP9mDZCqQaKtJsRdTDboDfRY818'
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS })
  }

  if (req.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405, headers: CORS })
  }

  let nom: string
  let caller_device_id: string | undefined
  try {
    const body = await req.json()
    nom = body.nom
    caller_device_id = body.device_id
  } catch {
    return new Response(JSON.stringify({ error: 'JSON invalide' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  if (!nom) {
    return new Response(JSON.stringify({ error: 'nom requis' }), {
      status: 400,
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  const { data: subscriptions } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth, device_id')

  if (!subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Aucun abonné' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  const targets = caller_device_id
    ? subscriptions.filter(s => s.device_id !== caller_device_id)
    : subscriptions

  if (targets.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Pas d\'autre abonné' }), {
      headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  webpush.setVapidDetails(
    'mailto:corinne.pivert@gmail.com',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  )

  const payload = JSON.stringify({
    title: '🛒 Liste de courses',
    body: `Nouvel article ajouté : ${nom}`,
    icon: '/pivert.png',
    tag: 'courses-pivert',
  })

  let sent = 0
  const toDelete: string[] = []

  for (const sub of targets) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (e: any) {
      if (e.statusCode === 410) {
        toDelete.push(sub.endpoint)
      }
    }
  }

  if (toDelete.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', toDelete)
  }

  return new Response(JSON.stringify({ sent }), {
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
})
