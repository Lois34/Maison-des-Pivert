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

  // 2. Vérifier le quota avant tout appel IA
  const quota = await checkQuota(auth.foyerId, 'vision', auth.token)
  if (!quota.ok) return reponse429(quota, 'scans IA')

  const { image, prompt } = JSON.parse(event.body)
  const geminiKey     = process.env.GEMINI_API_KEY
  const openrouterKey = process.env.OPENROUTER_KEY

  // 3a. Gemini 2.5 Flash en priorité
  if (geminiKey) {
    try {
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), 15000)
      let res
      try {
        res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [
                { inline_data: { mime_type: 'image/jpeg', data: image } },
                { text: prompt }
              ]}]
            }),
            signal: controller.signal
          }
        )
      } finally {
        clearTimeout(timer)
      }
      if (res.ok) {
        const data = await res.json()
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text
        if (text) {
          // 3. Incrémenter uniquement si l'appel IA a réussi
          await incrementQuota('vision', auth.token)
          return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ result: text })
          }
        }
      }
    } catch {}
  }

  // 3b. Fallback OpenRouter
  if (openrouterKey) {
    const MODELS = ['meta-llama/llama-4-scout', 'meta-llama/llama-4-maverick', 'google/gemini-2.5-flash-preview']
    for (const model of MODELS) {
      try {
        const controller = new AbortController()
        const timer = setTimeout(() => controller.abort(), 12000)
        let res
        try {
          res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${openrouterKey}`,
              'Content-Type': 'application/json',
              'HTTP-Referer': 'https://kaleidoscopic-biscotti-2e7cab.netlify.app',
              'X-Title': 'La Maison des Piverts'
            },
            body: JSON.stringify({
              model,
              messages: [{ role: 'user', content: [
                { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${image}` } },
                { type: 'text', text: prompt }
              ]}]
            }),
            signal: controller.signal
          })
        } finally {
          clearTimeout(timer)
        }
        if (res.ok) {
          const data = await res.json()
          const text = data.choices?.[0]?.message?.content
          if (text) {
            // Incrémenter uniquement si l'appel IA a réussi
            await incrementQuota('vision', auth.token)
            return {
              statusCode: 200,
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ result: text })
            }
          }
        }
      } catch {}
    }
  }

  return {
    statusCode: 503,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ error: 'Aucun modèle disponible' })
  }
}
