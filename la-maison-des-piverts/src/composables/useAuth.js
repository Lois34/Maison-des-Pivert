import { ref } from 'vue'
import { supabase } from '../services/supabase.js'

export const user = ref(null)
export const authReady = ref(false)

export async function initAuth() {
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
