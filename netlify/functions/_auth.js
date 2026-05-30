// _auth.js — helper partagé entre ia-vision et ia-proxy
// Utilise le JWT de l'utilisateur pour toutes les requêtes Supabase
// (évite le problème de format sb_secret_* incompatible avec Bearer JWT)

const SUPABASE_URL  = process.env.VITE_SUPABASE_URL
const SUPABASE_ANON = process.env.VITE_SUPABASE_ANON_KEY

const MAX_VISION   = 50
const MAX_RECETTES = 20

// ── 1. Vérifier le JWT et retourner le foyer_id ──────────────────────────────
async function getAuthenticatedFoyer(event) {
  const token = event.headers['authorization']?.replace('Bearer ', '').trim()
  if (!token) return { error: 'Non authentifié', status: 401 }

  // Valider le JWT auprès de Supabase
  const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
    headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON }
  })
  if (!userRes.ok) return { error: 'Token invalide ou expiré', status: 401 }
  const user = await userRes.json()
  if (!user?.id) return { error: 'Token invalide', status: 401 }

  // Récupérer foyer_id avec le JWT de l'utilisateur
  // La policy RLS profiles_select_own autorise id = auth.uid()
  const profileRes = await fetch(
    `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=foyer_id`,
    { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON } }
  )
  const profiles = await profileRes.json()
  const foyerId = profiles[0]?.foyer_id
  if (!foyerId) return { error: 'Aucun foyer associé à ce compte', status: 403 }

  return { foyerId, token }
}

// ── 2. Vérifier le quota du foyer pour ce mois-ci ────────────────────────────
async function checkQuota(foyerId, type, token) {
  const mois  = new Date().toISOString().slice(0, 7)
  const champ = type === 'vision' ? 'nb_vision' : 'nb_recettes'
  const max   = type === 'vision' ? MAX_VISION : MAX_RECETTES

  // RLS quotas_select_own filtre automatiquement par foyer du JWT
  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/quotas_ia?foyer_id=eq.${foyerId}&mois=eq.${mois}&select=${champ}`,
    { headers: { 'Authorization': `Bearer ${token}`, 'apikey': SUPABASE_ANON } }
  )
  const rows = await res.json()
  const count = rows[0]?.[champ] || 0
  return { ok: count < max, count, max, mois }
}

// ── 3. Incrémenter le compteur atomiquement ───────────────────────────────────
// La fonction SQL incrementer_quota_ia() utilise get_my_foyer_id() en interne
// → le foyer est déduit du JWT, impossible de falsifier
async function incrementQuota(type, token) {
  await fetch(`${SUPABASE_URL}/rest/v1/rpc/incrementer_quota_ia`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'apikey': SUPABASE_ANON,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ p_type: type })
  })
}

// ── Réponse 429 standardisée ─────────────────────────────────────────────────
function reponse429(quota, typeLabel) {
  const prochain = new Date()
  prochain.setMonth(prochain.getMonth() + 1)
  prochain.setDate(1)
  const dateReset = prochain.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
  return {
    statusCode: 429,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      error: 'quota_depasse',
      message: `Vous avez utilisé vos ${quota.max} ${typeLabel} ce mois-ci 🌿 Le compteur se réinitialisera le ${dateReset}.`,
      count: quota.count,
      max: quota.max
    })
  }
}

module.exports = { getAuthenticatedFoyer, checkQuota, incrementQuota, reponse429 }
