<template>
  <div class="setup-page">
    <div class="setup-inner">

      <div class="setup-header">
        <div class="setup-logo">🌿</div>
        <h1 class="setup-title">La Maison des Piverts</h1>
        <p class="setup-subtitle">Pour commencer, configurez votre foyer</p>
      </div>

      <!-- Écran de succès après création -->
      <div v-if="etape === 'succes'" class="succes-card">
        <div class="succes-icon">🏡</div>
        <h2 class="succes-titre">Foyer créé !</h2>
        <p class="succes-texte">
          Partagez ce code avec vos proches<br>pour qu'ils vous rejoignent :
        </p>
        <div class="code-bloc">
          <span class="code-valeur">{{ codeInvitation }}</span>
          <button class="btn-copier" @click="copierCode" :title="copie ? 'Copié !' : 'Copier'">
            {{ copie ? '✓' : '📋' }}
          </button>
        </div>
        <p class="code-info">Vous pourrez retrouver ce code dans vos paramètres.</p>
        <button class="btn-primary" @click="continuer">Entrer dans mon foyer</button>
      </div>

      <!-- Choix initial -->
      <div v-else class="choix-liste">

        <!-- Carte Créer -->
        <div class="choix-card" :class="{ ouvert: mode === 'creer' }">
          <button class="choix-header" @click="basculer('creer')">
            <span class="choix-icon">🏡</span>
            <div class="choix-textes">
              <span class="choix-titre">Créer mon foyer</span>
              <span class="choix-desc">Nouveau départ — invitez vos proches ensuite</span>
            </div>
            <span class="chevron">{{ mode === 'creer' ? '▲' : '▼' }}</span>
          </button>

          <div v-if="mode === 'creer'" class="choix-form">
            <input
              v-model="nomFoyer"
              type="text"
              placeholder="Nom de votre foyer (ex : Famille Dupont)"
              class="input-foyer"
              maxlength="50"
              autofocus
              @keyup.enter="creerFoyer"
            />
            <p v-if="erreur" class="msg-erreur">{{ erreur }}</p>
            <button
              class="btn-primary"
              :disabled="!nomFoyer.trim() || loading"
              @click="creerFoyer"
            >
              {{ loading ? 'Création en cours…' : 'Créer le foyer' }}
            </button>
          </div>
        </div>

        <!-- Carte Rejoindre -->
        <div class="choix-card" :class="{ ouvert: mode === 'rejoindre' }">
          <button class="choix-header" @click="basculer('rejoindre')">
            <span class="choix-icon">🔑</span>
            <div class="choix-textes">
              <span class="choix-titre">Rejoindre un foyer</span>
              <span class="choix-desc">Saisissez le code d'invitation d'un proche</span>
            </div>
            <span class="chevron">{{ mode === 'rejoindre' ? '▲' : '▼' }}</span>
          </button>

          <div v-if="mode === 'rejoindre'" class="choix-form">
            <input
              v-model="codeInput"
              type="text"
              placeholder="Code d'invitation (ex : AB12CD34)"
              class="input-foyer input-code"
              maxlength="8"
              autocomplete="off"
              @keyup.enter="rejoindreFoyer"
            />
            <p v-if="erreur" class="msg-erreur">{{ erreur }}</p>
            <button
              class="btn-primary"
              :disabled="codeInput.length < 6 || loading"
              @click="rejoindreFoyer"
            >
              {{ loading ? 'Vérification…' : 'Rejoindre le foyer' }}
            </button>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase.js'
import { user, profile, fetchProfile } from '../composables/useAuth.js'

const router = useRouter()

const mode          = ref(null)
const etape         = ref(null)
const nomFoyer      = ref('')
const codeInput     = ref('')
const codeInvitation = ref('')
const erreur        = ref('')
const loading       = ref(false)
const copie         = ref(false)

function basculer(val) {
  erreur.value = ''
  mode.value = mode.value === val ? null : val
}

async function creerFoyer() {
  if (!nomFoyer.value.trim()) return
  erreur.value = ''
  loading.value = true
  const { data, error } = await supabase.rpc('creer_foyer', { p_nom: nomFoyer.value.trim() })
  loading.value = false
  if (error || !data?.success) {
    erreur.value = data?.error || 'Une erreur est survenue, réessayez.'
    return
  }
  codeInvitation.value = data.code_invitation
  profile.value = { ...profile.value, foyer_id: data.foyer_id }
  fetchProfile(user.value.id)
  etape.value = 'succes'
}

async function rejoindreFoyer() {
  erreur.value = ''
  loading.value = true
  const { data, error } = await supabase.rpc('rejoindre_foyer', { p_code: codeInput.value.toUpperCase().trim() })
  loading.value = false
  if (error || !data?.success) {
    erreur.value = data?.error || 'Code invalide, vérifiez et réessayez.'
    return
  }
  profile.value = { ...profile.value, foyer_id: data.foyer_id }
  fetchProfile(user.value.id)
  router.push('/')
}

async function copierCode() {
  await navigator.clipboard.writeText(codeInvitation.value)
  copie.value = true
  setTimeout(() => { copie.value = false }, 2000)
}

function continuer() {
  router.push('/')
}
</script>

<style scoped>
.setup-page {
  min-height: 100dvh;
  background: var(--parchment);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px 16px;
}

.setup-inner {
  width: 100%;
  max-width: 460px;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.setup-header {
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.setup-logo {
  font-size: 2.8rem;
  line-height: 1;
}

.setup-title {
  font-family: var(--font-display);
  font-size: 1.7rem;
  color: var(--moss);
  font-weight: 700;
}

.setup-subtitle {
  font-size: 0.95rem;
  color: var(--stone);
}

/* ── Choix ── */
.choix-liste {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.choix-card {
  background: var(--cream);
  border: 1.5px solid var(--sand);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: var(--shadow-sm);
  transition: border-color 0.2s;
}

.choix-card.ouvert {
  border-color: var(--sage);
}

.choix-header {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  background: none;
  border: none;
  cursor: pointer;
  text-align: left;
}

.choix-icon {
  font-size: 1.6rem;
  flex-shrink: 0;
}

.choix-textes {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.choix-titre {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--moss);
}

.choix-desc {
  font-size: 0.82rem;
  color: var(--stone);
}

.chevron {
  font-size: 0.7rem;
  color: var(--stone-light);
  flex-shrink: 0;
}

.choix-form {
  padding: 0 20px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.input-foyer {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--sand);
  border-radius: var(--r-md);
  font-family: var(--font-ui);
  font-size: 0.95rem;
  background: var(--parchment);
  color: var(--ink);
  outline: none;
  transition: border-color 0.2s;
}

.input-foyer:focus {
  border-color: var(--sage);
}

.input-code {
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-weight: 700;
}

.msg-erreur {
  font-size: 0.85rem;
  color: var(--danger);
}

.btn-primary {
  width: 100%;
  padding: 13px;
  background: var(--moss);
  color: var(--cream);
  border: none;
  border-radius: var(--r-pill);
  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, opacity 0.2s;
}

.btn-primary:hover:not(:disabled) { background: var(--moss-hover); }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }

/* ── Succès ── */
.succes-card {
  background: var(--cream);
  border: 1.5px solid var(--sage);
  border-radius: var(--r-xl);
  padding: 32px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  box-shadow: var(--shadow-md);
  text-align: center;
}

.succes-icon { font-size: 3rem; line-height: 1; }

.succes-titre {
  font-family: var(--font-display);
  font-size: 1.5rem;
  color: var(--moss);
  font-weight: 700;
}

.succes-texte {
  font-size: 0.9rem;
  color: var(--stone);
  line-height: 1.5;
}

.code-bloc {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--sage-pale);
  border: 1.5px solid var(--sage);
  border-radius: var(--r-md);
  padding: 12px 20px;
}

.code-valeur {
  font-family: var(--font-ui);
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: 0.18em;
  color: var(--moss);
}

.btn-copier {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  padding: 4px;
  line-height: 1;
}

.code-info {
  font-size: 0.78rem;
  color: var(--stone-light);
}
</style>
