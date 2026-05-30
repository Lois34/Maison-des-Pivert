import { ref } from 'vue'
import { supabase } from '../services/supabase.js'

export const user = ref(null)
export const profile = ref(null)
export const authReady = ref(false)

const isDraftPreview = window.location.hostname.includes('--') && window.location.hostname.includes('netlify.app')

export async function fetchProfile(userId) {
  if (!userId) { profile.value = null; return }
  const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
  profile.value = data || null
}

export async function initAuth() {
  if (isDraftPreview) {
    user.value = { email: 'preview@test.local', id: 'preview-user' }
    profile.value = { id: 'preview-user', foyer_id: 'preview-foyer', email: 'preview@test.local' }
    authReady.value = true
    return
  }
  const { data } = await supabase.auth.getSession()
  user.value = data.session?.user || null
  await fetchProfile(user.value?.id)
  authReady.value = true

  supabase.auth.onAuthStateChange(async (_, session) => {
    user.value = session?.user || null
    await fetchProfile(user.value?.id)
  })
}

export async function signOut() {
  await supabase.auth.signOut()
  user.value = null
  profile.value = null
}
