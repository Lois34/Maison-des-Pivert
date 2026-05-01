import { ref } from 'vue'
import { supabase } from '../services/supabase.js'

export const user = ref(null)
export const authReady = ref(false)

const isDraftPreview = window.location.hostname.includes('--') && window.location.hostname.includes('netlify.app')

export async function initAuth() {
  if (isDraftPreview) {
    user.value = { email: 'preview@test.local', id: 'preview-user' }
    authReady.value = true
    return
  }
  const { data } = await supabase.auth.getSession()
  user.value = data.session?.user || null
  authReady.value = true

  supabase.auth.onAuthStateChange((_, session) => {
    user.value = session?.user || null
  })
}

export async function signOut() {
  await supabase.auth.signOut()
  user.value = null
}
