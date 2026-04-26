// Supabase Edge Function - Notifications de péremption
// Appelée quotidiennement par GitHub Actions
// Deno runtime

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import webpush from 'npm:web-push@3.6.7'

const VAPID_PUBLIC = 'BGiwV75qIldzegVA3UlJpovjYZ9mKlSXOjLp9jn9hkuM82ZC1m1Gan1UaeIwAP9mDZCqQaKtJsRdTDboDfRY818'
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
const FUNCTION_SECRET = Deno.env.get('FUNCTION_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

Deno.serve(async (req: Request) => {
  // Verify secret to prevent unauthorized calls
  const auth = req.headers.get('Authorization')
  if (!FUNCTION_SECRET || auth !== `Bearer ${FUNCTION_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Calculate date threshold (items expiring within 7 days)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const seuil = new Date(today)
  seuil.setDate(seuil.getDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const seuilStr = seuil.toISOString().split('T')[0]

  // Get expiring items (expired or expiring within threshold)
  const { data: items, error: itemsError } = await supabase
    .from('inventaire')
    .select('nom, date_peremption')
    .not('date_peremption', 'is', null)
    .lte('date_peremption', seuilStr)

  if (itemsError) {
    return new Response(JSON.stringify({ error: itemsError.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!items || items.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Rien à signaler' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Get all push subscriptions
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (subError || !subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Aucun abonné' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  webpush.setVapidDetails(
    'mailto:contact@maison-des-piverts.fr',
    VAPID_PUBLIC,
    VAPID_PRIVATE
  )

  const expires = items.filter(i => i.date_peremption < todayStr)
  const bientot = items.filter(i => i.date_peremption >= todayStr)

  const titre = `⚠️ ${items.length} objet${items.length > 1 ? 's' : ''} à vérifier`
  const lignes: string[] = []
  if (expires.length > 0) {
    lignes.push(`Expirés : ${expires.map(i => i.nom).join(', ')}`)
  }
  if (bientot.length > 0) {
    lignes.push(`Expire bientôt : ${bientot.map(i => i.nom).join(', ')}`)
  }
  const corps = lignes.join('\n')

  const payload = JSON.stringify({ title: titre, body: corps, icon: '/pivert.png' })

  let sent = 0
  const toDelete: string[] = []

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        payload
      )
      sent++
    } catch (e: any) {
      // 410 = subscription expired/unsubscribed → remove it
      if (e.statusCode === 410) {
        toDelete.push(sub.endpoint)
      }
    }
  }

  // Clean up expired subscriptions
  if (toDelete.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', toDelete)
  }

  return new Response(JSON.stringify({ sent, total_items: items.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
