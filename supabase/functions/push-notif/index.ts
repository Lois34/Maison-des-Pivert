// Supabase Edge Function - Notifications de péremption
// Appelée quotidiennement par GitHub Actions
// Deno runtime — Implémentation Web Push native SANS npm:web-push

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PUBLIC_KEY  = 'BGiwV75qIldzegVA3UlJpovjYZ9mKlSXOjLp9jn9hkuM82ZC1m1Gan1UaeIwAP9mDZCqQaKtJsRdTDboDfRY818'
const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const FUNCTION_SECRET   = Deno.env.get('FUNCTION_SECRET')!
const SUPABASE_URL      = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SRK      = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const VAPID_SUBJECT     = 'mailto:corinne.pivert@gmail.com'

// ─── Helpers base64url ────────────────────────────────────────────────────────

function b64uDecode(str: string): Uint8Array {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - str.length % 4)
  return Uint8Array.from(
    atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad),
    c => c.charCodeAt(0)
  )
}

function b64uEncode(bytes: Uint8Array): string {
  let bin = ''
  for (const b of bytes) bin += String.fromCharCode(b)
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((s, a) => s + a.length, 0)
  const out = new Uint8Array(total)
  let offset = 0
  for (const a of arrays) { out.set(a, offset); offset += a.length }
  return out
}

// ─── HKDF manuel (Extract + Expand séparés) ──────────────────────────────────

async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', salt, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, ikm))
}

async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    'raw', prk, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  )
  const out = new Uint8Array(length)
  let prev = new Uint8Array(0)
  let offset = 0
  for (let i = 1; offset < length; i++) {
    const data = concat(prev, info, new Uint8Array([i]))
    prev = new Uint8Array(await crypto.subtle.sign('HMAC', key, data))
    const chunk = prev.slice(0, Math.min(prev.length, length - offset))
    out.set(chunk, offset)
    offset += chunk.length
  }
  return out
}

// ─── VAPID JWT (RFC 8292) ─────────────────────────────────────────────────────

async function createVapidAuthHeader(endpoint: string): Promise<string> {
  const url = new URL(endpoint)
  const audience = `${url.protocol}//${url.host}`
  const exp = Math.floor(Date.now() / 1000) + 43200 // valable 12h

  const enc = new TextEncoder()
  const headerB64  = b64uEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })))
  const payloadB64 = b64uEncode(enc.encode(JSON.stringify({ aud: audience, exp, sub: VAPID_SUBJECT })))
  const signingInput = `${headerB64}.${payloadB64}`

  // Import de la clé privée VAPID (raw EC P-256 → JWK)
  const pubBytes  = b64uDecode(VAPID_PUBLIC_KEY)   // 65 octets : 0x04 + x(32) + y(32)
  const privBytes = b64uDecode(VAPID_PRIVATE_KEY)  // 32 octets

  const jwk = {
    kty: 'EC', crv: 'P-256', ext: true,
    x: b64uEncode(pubBytes.slice(1, 33)),
    y: b64uEncode(pubBytes.slice(33, 65)),
    d: b64uEncode(privBytes),
  }

  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
  const sig = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(signingInput))
  )

  const token = `${signingInput}.${b64uEncode(sig)}`
  return `vapid t=${token},k=${VAPID_PUBLIC_KEY}`
}

// ─── Chiffrement Web Push (RFC 8291 — aes128gcm) ─────────────────────────────

async function buildEncryptedBody(
  message: string,
  p256dh: string,
  authSecret: string
): Promise<Uint8Array> {
  const enc = new TextEncoder()
  const plaintext = enc.encode(message)

  const subPubBytes  = b64uDecode(p256dh)      // 65 octets
  const subAuthBytes = b64uDecode(authSecret)  // 16 octets

  // Paire de clés ECDH éphémère côté serveur
  const senderKP = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  )
  const senderPubRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', senderKP.publicKey)
  ) // 65 octets

  // Import de la clé publique de l'abonné
  const subPub = await crypto.subtle.importKey(
    'raw', subPubBytes, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  )

  // Secret ECDH partagé
  const ecdhSecret = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: subPub }, senderKP.privateKey, 256)
  )

  // Sel aléatoire (16 octets)
  const salt = crypto.getRandomValues(new Uint8Array(16))

  // PRK_key = HKDF-Extract(salt=subAuth, ikm=ecdhSecret)
  const prkKey = await hkdfExtract(subAuthBytes, ecdhSecret)

  // key_info = "WebPush: info\x00" || subPubKey || senderPubKey
  const keyInfo = concat(enc.encode('WebPush: info\x00'), subPubBytes, senderPubRaw)

  // ikm = HKDF-Expand(prk=prkKey, info=keyInfo, len=32)
  const ikm = await hkdfExpand(prkKey, keyInfo, 32)

  // prk = HKDF-Extract(salt=salt, ikm=ikm)
  const prk = await hkdfExtract(salt, ikm)

  // CEK   = HKDF-Expand(prk, "Content-Encoding: aes128gcm\x00", 16)
  // Nonce = HKDF-Expand(prk, "Content-Encoding: nonce\x00",     12)
  const cek   = await hkdfExpand(prk, enc.encode('Content-Encoding: aes128gcm\x00'), 16)
  const nonce = await hkdfExpand(prk, enc.encode('Content-Encoding: nonce\x00'), 12)

  // Chiffrement AES-128-GCM  (plaintext + délimiteur 0x02)
  const aesKey = await crypto.subtle.importKey('raw', cek, { name: 'AES-GCM' }, false, ['encrypt'])
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aesKey,
      concat(plaintext, new Uint8Array([0x02]))
    )
  )

  // En-tête du record : salt(16) + rs(4 big-endian=4096) + idlen(1=65) + senderPub(65)
  const rsView = new DataView(new ArrayBuffer(4))
  rsView.setUint32(0, 4096, false)

  return concat(
    salt,
    new Uint8Array(rsView.buffer),
    new Uint8Array([65]),
    senderPubRaw,
    ciphertext
  )
}

// ─── Envoi d'une notification push ───────────────────────────────────────────

async function sendPush(endpoint: string, p256dh: string, auth: string, payload: string): Promise<number> {
  const [body, authHeader] = await Promise.all([
    buildEncryptedBody(payload, p256dh, auth),
    createVapidAuthHeader(endpoint),
  ])

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization':    authHeader,
      'Content-Type':     'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'TTL':              '86400',
    },
    body,
  })
  return res.status
}

// ─── Handler principal ────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // Vérification du secret d'appel
  const auth = req.headers.get('Authorization')
  if (!FUNCTION_SECRET || auth !== `Bearer ${FUNCTION_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SRK)

  // Seuil : aujourd'hui + 7 jours
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const seuil = new Date(today)
  seuil.setDate(seuil.getDate() + 7)
  const todayStr = today.toISOString().split('T')[0]
  const seuilStr = seuil.toISOString().split('T')[0]

  // Articles proches de la péremption
  const { data: items, error: itemsError } = await supabase
    .from('inventaire')
    .select('nom, date_peremption')
    .not('date_peremption', 'is', null)
    .lte('date_peremption', seuilStr)

  if (itemsError) {
    return new Response(JSON.stringify({ error: itemsError.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    })
  }

  if (!items || items.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Rien à signaler' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Abonnés push
  const { data: subscriptions, error: subError } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')

  if (subError || !subscriptions || subscriptions.length === 0) {
    return new Response(JSON.stringify({ sent: 0, message: 'Aucun abonné' }), {
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Construction du message
  const expires = items.filter(i => i.date_peremption <  todayStr)
  const bientot = items.filter(i => i.date_peremption >= todayStr)
  const titre = `⚠️ ${items.length} objet${items.length > 1 ? 's' : ''} à vérifier`
  const lignes: string[] = []
  if (expires.length > 0) lignes.push(`Expirés : ${expires.map(i => i.nom).join(', ')}`)
  if (bientot.length > 0) lignes.push(`Expire bientôt : ${bientot.map(i => i.nom).join(', ')}`)

  const payload = JSON.stringify({ title: titre, body: lignes.join('\n'), icon: '/pivert.png' })

  let sent = 0
  const toDelete: string[] = []

  for (const sub of subscriptions) {
    try {
      const status = await sendPush(sub.endpoint, sub.p256dh, sub.auth, payload)
      if (status === 200 || status === 201) {
        sent++
      } else if (status === 410 || status === 404) {
        // Abonnement expiré → à supprimer
        toDelete.push(sub.endpoint)
      } else {
        console.warn(`Push endpoint ${sub.endpoint} → HTTP ${status}`)
      }
    } catch (e) {
      console.error('Erreur envoi push :', e)
    }
  }

  // Nettoyage des abonnements invalides
  if (toDelete.length > 0) {
    await supabase.from('push_subscriptions').delete().in('endpoint', toDelete)
  }

  return new Response(JSON.stringify({ sent, total_items: items.length }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
