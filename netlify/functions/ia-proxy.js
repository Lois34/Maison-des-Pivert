const { getAuthenticatedFoyer, checkQuota, incrementQuota, reponse429 } = require('./_auth')

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' }
  }

  // 1. Authentification JWT → foyer_id sécurisé côté serveur
  const auth = await getAuthenticatedFoyer(event)
  if (auth.error) {
    return {
      statusCode: auth.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: auth.error })
    }
  }

  // Extraire `type` du body (non transmis à OpenRouter)
  const body = JSON.parse(event.body)
  const { type, ...openrouterBody } = body

  // 2. Vérifier le quota pour les appels typés (vision ou recette)
  let quota = null
  if (type === 'vision' || type === 'recette') {
    quota = await checkQuota(auth.foyerId, type, auth.token)
    if (!quota.ok) {
      const label = type === 'vision' ? 'scans IA' : 'générations de recettes'
      return reponse429(quota, label)
    }
  }

  const key = process.env.OPENROUTER_KEY
  if (!key) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'OPENROUTER_KEY non configurée sur le serveur' }),
    }
  }

  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 12000)
    let res
    try {
      res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://kaleidoscopic-biscotti-2e7cab.netlify.app',
          'X-Title': 'La Maison des Piverts',
        },
        body: JSON.stringify(openrouterBody),
        signal: controller.signal,
      })
    } finally {
      clearTimeout(timer)
    }

    const data = await res.json()

    // 3. Incrémenter uniquement si l'appel IA a réussi (statut 200)
    if (res.ok && quota) {
      await incrementQuota(type, auth.token)
    }

    return {
      statusCode: res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }
  } catch (err) {
    const isTimeout = err.name === 'AbortError'
    return {
      statusCode: isTimeout ? 504 : 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: isTimeout ? 'Modèle trop lent, essaie le suivant' : err.message }),
    }
  }
}
