<template>
  <div class="login-page">
    <div class="login-bg" />

    <div class="login-card">
      <!-- Logo -->
      <div class="login-brand">
        <div class="login-bird">
          <img src="/pivert.jpg" alt="Pivert" class="login-bird-img" />
        </div>
        <h1 class="login-title">La Maison<br /><em>des Piverts</em></h1>
      </div>

      <!-- Étape 1 : Email -->
      <Transition name="step" mode="out-in">
        <div v-if="etape === 'email'" key="email" class="login-step">
          <p class="login-subtitle">Connecte-toi avec ton adresse e-mail pour accéder à la maison</p>

          <div class="field-group">
            <label class="field-label">Adresse e-mail</label>
            <input
              ref="inputEmail"
              v-model="email"
              type="email"
              inputmode="email"
              autocomplete="email"
              class="field-input"
              placeholder="prenom@exemple.fr"
              :disabled="loading"
              @keydown.enter="envoyerCode"
            />
          </div>

          <button class="btn-primary" :disabled="loading || !email.trim()" @click="envoyerCode">
            <span v-if="loading" class="btn-spinner">⏳</span>
            <span v-else>Envoyer le code →</span>
          </button>

          <p v-if="erreur" class="login-error">{{ erreur }}</p>
        </div>
      </Transition>

      <!-- Étape 2 : OTP -->
      <Transition name="step" mode="out-in">
        <div v-if="etape === 'otp'" key="otp" class="login-step">
          <p class="login-subtitle">
            Code envoyé à <strong>{{ email }}</strong>.<br />Entre le code à 8 chiffres reçu par e-mail.
          </p>

          <!-- Grille 8 cases OTP -->
          <div class="otp-grid">
            <input
              v-for="(_, i) in otpDigits"
              :key="i"
              :ref="el => { if (el) otpRefs[i] = el }"
              v-model="otpDigits[i]"
              type="text"
              inputmode="numeric"
              maxlength="1"
              autocomplete="one-time-code"
              class="otp-input"
              :class="{ filled: otpDigits[i] }"
              @input="onOtpInput(i, $event)"
              @keydown="onOtpKeydown(i, $event)"
              @paste="onOtpPaste($event)"
            />
          </div>

          <button class="btn-primary" :disabled="loading || otpCode.length < 8" @click="verifierCode">
            <span v-if="loading" class="btn-spinner">⏳</span>
            <span v-else>Se connecter ✓</span>
          </button>

          <button class="btn-ghost" :disabled="loading || resendCooldown > 0" @click="envoyerCode">
            {{ resendCooldown > 0 ? `Renvoyer (${resendCooldown}s)` : 'Renvoyer le code' }}
          </button>

          <p v-if="erreur" class="login-error">{{ erreur }}</p>
          <p class="login-hint">Vérifie aussi tes spams. Le code est valide 10 minutes.</p>
        </div>
      </Transition>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase.js'

const router = useRouter()

// ── État ──
const etape        = ref('email')
const email        = ref('')
const loading      = ref(false)
const erreur       = ref('')
const resendCooldown = ref(0)
let cooldownTimer  = null

const inputEmail   = ref(null)
const otpRefs      = ref([])
const otpDigits    = ref(Array(8).fill(''))
const otpCode      = computed(() => otpDigits.value.join(''))

onMounted(() => {
  nextTick(() => inputEmail.value?.focus())
  // Si déjà connecté → rediriger
  supabase.auth.getSession().then(({ data }) => {
    if (data.session) router.replace('/inventaire')
  })
})
onUnmounted(() => clearInterval(cooldownTimer))

// ── Envoi OTP ──
async function envoyerCode() {
  erreur.value = ''
  const addr = email.value.trim()
  if (!addr) return
  loading.value = true
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: addr,
      options: { shouldCreateUser: true },
    })
    if (error) throw error
    etape.value = 'otp'
    otpDigits.value = Array(8).fill('')
    lancerCooldown()
    nextTick(() => otpRefs.value[0]?.focus())
  } catch (e) {
    erreur.value = e.message || 'Erreur lors de l\'envoi du code.'
  } finally {
    loading.value = false
  }
}

// ── Vérification OTP ──
async function verifierCode() {
  erreur.value = ''
  if (otpCode.value.length < 8) return
  loading.value = true
  try {
    const { data, error } = await supabase.auth.verifyOtp({
      email: email.value.trim(),
      token: otpCode.value,
      type: 'email',
    })
    if (error) throw error

    // Partage de session iOS : persiste via cookie côté supabase-js
    // onAuthStateChange dans useAuth.js prend le relais automatiquement
    await router.replace('/inventaire')
  } catch (e) {
    erreur.value = 'Code incorrect ou expiré. Vérifie et réessaie.'
    // Vide les cases et refocus la première
    otpDigits.value = Array(8).fill('')
    nextTick(() => otpRefs.value[0]?.focus())
  } finally {
    loading.value = false
  }
}

// ── Saisie OTP ──
function onOtpInput(i, e) {
  const val = e.target.value.replace(/\D/g, '')
  otpDigits.value[i] = val.slice(-1)
  if (val && i < 7) {
    nextTick(() => otpRefs.value[i + 1]?.focus())
  }
  if (otpCode.value.length === 8) verifierCode()
}

function onOtpKeydown(i, e) {
  if (e.key === 'Backspace' && !otpDigits.value[i] && i > 0) {
    otpDigits.value[i - 1] = ''
    nextTick(() => otpRefs.value[i - 1]?.focus())
  }
}

function onOtpPaste(e) {
  const text = (e.clipboardData || window.clipboardData).getData('text').replace(/\D/g, '')
  if (!text) return
  e.preventDefault()
  const chars = text.slice(0, 8).split('')
  chars.forEach((c, i) => { if (i < 8) otpDigits.value[i] = c })
  const next = Math.min(chars.length, 7)
  nextTick(() => otpRefs.value[next]?.focus())
  if (text.length >= 8) verifierCode()
}

// ── Cooldown renvoi ──
function lancerCooldown() {
  resendCooldown.value = 60
  clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    resendCooldown.value--
    if (resendCooldown.value <= 0) clearInterval(cooldownTimer)
  }, 1000)
}
</script>

<style scoped>
.login-page {
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: calc(env(safe-area-inset-top, 0px) + 24px) 20px calc(env(safe-area-inset-bottom, 0px) + 24px);
  position: relative;
  overflow: hidden;
}

/* Fond forêt */
.login-bg {
  position: fixed;
  inset: 0;
  background: linear-gradient(160deg, var(--moss) 0%, #1a3015 55%, #0f1d0b 100%);
  z-index: 0;
}
.login-bg::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 80% 10%, rgba(255,255,255,0.05) 0%, transparent 45%),
    radial-gradient(circle at 10% 90%, rgba(90,143,80,0.12) 0%, transparent 50%);
}

/* Carte */
.login-card {
  position: relative;
  z-index: 1;
  width: 100%;
  max-width: 400px;
  background: var(--cream);
  border-radius: var(--r-xl);
  padding: 36px 28px 32px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.35);
}

/* Brand */
.login-brand {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  margin-bottom: 28px;
}
.login-bird {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  border: 3px solid rgba(42,77,32,0.18);
  box-shadow: 0 4px 18px rgba(42,77,32,0.2);
  overflow: hidden;
}
.login-bird-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}
.login-title {
  font-family: var(--font-display);
  font-size: 1.45rem;
  font-weight: 500;
  color: var(--ink);
  text-align: center;
  line-height: 1.2;
  margin: 0;
}
.login-title em {
  font-style: italic;
  font-weight: 300;
  color: var(--moss);
}

/* Step */
.login-step { display: flex; flex-direction: column; gap: 0; }
.login-subtitle {
  font-family: var(--font-ui);
  font-size: 0.88rem;
  color: var(--stone);
  text-align: center;
  line-height: 1.5;
  margin: 0 0 20px;
}
.login-subtitle strong { color: var(--ink); }

/* Champs */
.field-group { margin-bottom: 16px; }
.field-label {
  display: block;
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--stone);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}
.field-input {
  width: 100%;
  background: var(--parchment);
  border: 1.5px solid var(--sand);
  border-radius: var(--r-md);
  padding: 13px 16px;
  font-family: var(--font-ui);
  font-size: 1rem;
  color: var(--ink);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.field-input:focus { border-color: var(--leaf); }
.field-input:disabled { opacity: 0.6; }

/* Boutons */
.btn-primary {
  width: 100%;
  padding: 14px;
  background: var(--moss);
  color: white;
  border: none;
  border-radius: var(--r-md);
  font-family: var(--font-ui);
  font-size: 0.98rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, transform 0.15s;
  margin-top: 4px;
}
.btn-primary:not(:disabled):hover { background: var(--moss-hover); }
.btn-primary:not(:disabled):active { transform: scale(0.98); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost {
  width: 100%;
  padding: 11px;
  background: transparent;
  border: 1.5px solid var(--sand);
  border-radius: var(--r-md);
  color: var(--stone);
  font-family: var(--font-ui);
  font-size: 0.88rem;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: border-color 0.2s;
}
.btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-ghost:not(:disabled):hover { border-color: var(--leaf); color: var(--moss); }
.btn-spinner { display: inline-block; animation: pulse 1s infinite; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }

/* OTP grid */
.otp-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 6px;
  margin: 0 0 20px;
}
.otp-input {
  width: 100%;
  aspect-ratio: 1;
  text-align: center;
  font-family: var(--font-ui);
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
  background: var(--parchment);
  border: 1.5px solid var(--sand);
  border-radius: var(--r-sm);
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  caret-color: var(--moss);
  padding: 0;
}
.otp-input:focus { border-color: var(--leaf); background: white; }
.otp-input.filled { border-color: var(--moss); background: var(--sage-pale); }

/* Messages */
.login-error {
  font-family: var(--font-ui);
  font-size: 0.82rem;
  color: var(--danger);
  text-align: center;
  margin: 10px 0 0;
  font-weight: 600;
}
.login-hint {
  font-family: var(--font-ui);
  font-size: 0.76rem;
  color: var(--stone-light);
  text-align: center;
  margin: 8px 0 0;
  line-height: 1.5;
}

/* Transition entre étapes */
.step-enter-active, .step-leave-active { transition: all 0.22s ease; }
.step-enter-from { opacity: 0; transform: translateX(18px); }
.step-leave-to  { opacity: 0; transform: translateX(-18px); }
</style>
