<template>
  <main class="courses-view">
    <!-- Header zone -->
    <div class="courses-topbar">
      <div class="courses-meta">
        <h2 class="courses-heading">Courses</h2>
        <p v-if="courses.length" class="courses-progress">
          {{ achetesCount }} / {{ courses.length }} acheté{{ achetesCount > 1 ? 's' : '' }}
        </p>
      </div>
      <div class="topbar-actions">
        <button
          v-if="achetesCount > 0"
          class="btn-toggle-achetes"
          :class="{ active: showAchetes }"
          @click="showAchetes = !showAchetes"
          :title="showAchetes ? 'Masquer les achetés' : 'Voir les achetés'"
        >
          <template v-if="showAchetes">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
            Masquer
          </template>
          <template v-else>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
            {{ achetesCount }} acheté{{ achetesCount > 1 ? 's' : '' }}
          </template>
        </button>
        <button
          v-if="achetesCount > 0 && showAchetes"
          class="btn-reset"
          @click="reinitialiser"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/></svg>
          Tout décocher
        </button>
      </div>
    </div>

    <!-- Barre de progression -->
    <div v-if="courses.length" class="progress-bar-wrap">
      <div class="progress-bar-track">
        <div class="progress-bar-fill" :style="{ width: progressPct + '%' }" />
      </div>
    </div>

    <!-- Liste vide -->
    <div v-if="!loading && courses.length === 0" class="courses-empty">
      <div class="empty-icon">🛒</div>
      <p class="empty-title">La liste est vide !</p>
      <p class="empty-sub">Appuyez sur + pour ajouter un article</p>
    </div>

    <!-- Skeleton loader -->
    <div v-if="loading" class="skeleton-list">
      <div v-for="i in 4" :key="i" class="skeleton-item" />
    </div>

    <!-- Groupes par magasin -->
    <div v-if="!loading && courses.length" class="courses-list">
      <template v-for="(groupe, magasin) in parMagasin" :key="magasin">
        <div v-if="magasin" class="group-header">
          <span class="group-icon">🏪</span>
          {{ magasin }}
        </div>
        <TransitionGroup name="item" tag="div">
          <div
            v-for="item in groupe"
            :key="item.id"
            class="course-item"
            :class="{ achete: item.achete }"
          >
            <button
              class="checkbox"
              :class="{ checked: item.achete }"
              @click="toggleAchete(item)"
              :aria-label="item.achete ? 'Décocher' : 'Cocher'"
            >
              <svg v-if="item.achete" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            </button>

            <div class="course-body" @click="ouvrirEdition(item)">
              <span class="course-nom">{{ item.nom }}</span>
              <div class="course-meta">
                <span class="course-qty">×{{ item.quantite || 1 }}</span>
                <span v-if="item.magasin" class="course-store">{{ item.magasin }}</span>
              </div>
            </div>

            <button class="btn-del" @click.stop="supprimer(item)" aria-label="Supprimer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4h6v2"/></svg>
            </button>
          </div>
        </TransitionGroup>
      </template>
    </div>

    <!-- FAB -->
    <button class="fab" @click="ouvrirAjout" aria-label="Ajouter un article">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <!-- Modal ajout / édition -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="modalOuvert" class="modal-overlay" :style="keyboardY ? { bottom: `${keyboardY}px` } : {}" @click.self="fermerModal">
          <div class="modal-sheet" role="dialog" aria-modal="true">
            <div class="modal-handle" />
            <h3 class="modal-title">{{ modeEdition ? "Modifier l'article" : 'Ajouter un article' }}</h3>

            <div class="field-group">
              <label class="field-label">Article</label>
              <div class="autocomplete-wrap">
                <input
                  ref="inputNom"
                  v-model="form.nom"
                  type="text"
                  class="field-input"
                  placeholder="Ex : Lait, Pain…"
                  autocomplete="off"
                  @focus="acFocus='nom'"
                  @blur="acBlur('nom')"
                  @keydown.enter="sauvegarder"
                />
                <ul v-if="acFocus==='nom' && acNoms.length" class="ac-dropdown">
                  <li v-for="n in acNoms" :key="n" @mousedown.prevent="form.nom=n; acFocus=null">{{ n }}</li>
                </ul>
              </div>
            </div>

            <div class="field-row">
              <div class="field-group field-group--half">
                <label class="field-label">Quantité</label>
                <input
                  v-model.number="form.quantite"
                  type="number"
                  min="1"
                  class="field-input"
                />
              </div>
              <div class="field-group field-group--half">
                <label class="field-label">Magasin (optionnel)</label>
                <div class="autocomplete-wrap">
                  <input
                    v-model="form.magasin"
                    type="text"
                    class="field-input"
                    placeholder="Ex : Leclerc…"
                    autocomplete="off"
                    @focus="acFocus='magasin'"
                    @blur="acBlur('magasin')"
                  />
                  <ul v-if="acFocus==='magasin' && acMagasins.length" class="ac-dropdown">
                    <li v-for="m in acMagasins" :key="m" @mousedown.prevent="form.magasin=m; acFocus=null">{{ m }}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn-cancel" @click="fermerModal">Annuler</button>
              <button class="btn-save" :disabled="sauvegarde" @click="sauvegarder">
                <span v-if="sauvegarde">⏳</span>
                <span v-else>{{ modeEdition ? '🔄 Mettre à jour' : '🛒 Ajouter' }}</span>
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Teleport to="body">
      <Transition name="toast">
        <div v-if="toast" class="toast">{{ toast }}</div>
      </Transition>
    </Teleport>
  </main>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { supabase } from '../services/supabase.js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

// — État —
const courses = ref([])
const loading = ref(true)
const modalOuvert = ref(false)
const modeEdition = ref(false)
const idEdition = ref(null)
const sauvegarde = ref(false)
const toast = ref('')
const toastTimer = ref(null)
const inputNom = ref(null)

const form = ref({ nom: '', quantite: 1, magasin: '' })
const showAchetes = ref(false)
const keyboardY = ref(0)

// — Dérivés —
const achetesCount = computed(() => courses.value.filter(c => c.achete).length)
const progressPct = computed(() =>
  courses.value.length ? Math.round((achetesCount.value / courses.value.length) * 100) : 0
)

const parMagasin = computed(() => {
  const map = {}
  const visibles = showAchetes.value
    ? courses.value
    : courses.value.filter(c => !c.achete)
  const triees = [...visibles].sort((a, b) => {
    if (a.achete !== b.achete) return a.achete ? 1 : -1
    return a.nom.localeCompare(b.nom, 'fr')
  })
  triees.forEach(c => {
    const key = c.magasin || ''
    if (!map[key]) map[key] = []
    map[key].push(c)
  })
  // Clé vide en premier, puis tri alpha
  return Object.fromEntries(
    Object.entries(map).sort(([a], [b]) => {
      if (a === '') return -1
      if (b === '') return 1
      return a.localeCompare(b, 'fr')
    })
  )
})

const acFocus = ref(null)
function acBlur(champ) {
  setTimeout(() => { if (acFocus.value === champ) acFocus.value = null }, 150)
}

const acNoms = computed(() => {
  const v = form.value.nom.toLowerCase()
  return [...new Set(courses.value.map(c => c.nom))]
    .filter(n => n.toLowerCase().includes(v) && n !== form.value.nom)
    .slice(0, 6)
})
const acMagasins = computed(() => {
  const v = form.value.magasin.toLowerCase()
  return [...new Set(courses.value.filter(c => c.magasin).map(c => c.magasin))]
    .filter(m => m.toLowerCase().includes(v) && m !== form.value.magasin)
    .slice(0, 6)
})

// — Supabase —
async function charger() {
  loading.value = true
  const { data } = await supabase
    .from('liste_courses')
    .select('*')
    .order('achete', { ascending: true })
    .order('nom', { ascending: true })
  courses.value = data || []
  loading.value = false
}

async function toggleAchete(item) {
  const newVal = !item.achete
  item.achete = newVal // optimistic
  await supabase.from('liste_courses').update({ achete: newVal }).eq('id', item.id)
}

async function sauvegarder() {
  const nom = form.value.nom.trim()
  if (!nom) { afficherToast('⚠️ Le nom est obligatoire'); return }
  sauvegarde.value = true
  try {
    const payload = {
      nom,
      quantite: form.value.quantite || 1,
      magasin: form.value.magasin.trim() || null,
    }
    if (modeEdition.value) {
      await supabase.from('liste_courses').update(payload).eq('id', idEdition.value)
      afficherToast('✅ Article modifié !')
    } else {
      await supabase.from('liste_courses').insert([{ ...payload, achete: false }])
      afficherToast('✅ Article ajouté !')
      notifierNouvelArticle(nom)
    }
    fermerModal()
    await charger()
  } catch (e) {
    afficherToast('❌ Erreur : ' + e.message)
  } finally {
    sauvegarde.value = false
  }
}

async function supprimer(item) {
  if (!confirm(`Supprimer "${item.nom}" de la liste ?`)) return
  courses.value = courses.value.filter(c => c.id !== item.id)
  await supabase.from('liste_courses').delete().eq('id', item.id)
  afficherToast('🗑️ Article supprimé')
}

async function reinitialiser() {
  if (!confirm('Décocher tous les articles achetés ?')) return
  await supabase.from('liste_courses').update({ achete: false }).eq('achete', true)
  afficherToast('✅ Liste réinitialisée !')
  await charger()
}

// — Modal —
function ouvrirAjout() {
  form.value = { nom: '', quantite: 1, magasin: '' }
  modeEdition.value = false
  idEdition.value = null
  modalOuvert.value = true
  nextTick(() => inputNom.value?.focus())
}

function ouvrirEdition(item) {
  form.value = { nom: item.nom, quantite: item.quantite || 1, magasin: item.magasin || '' }
  modeEdition.value = true
  idEdition.value = item.id
  modalOuvert.value = true
  nextTick(() => inputNom.value?.focus())
}

function fermerModal() {
  modalOuvert.value = false
}

// — Notifications push —
function getDeviceId() {
  let id = localStorage.getItem('pivert_device_id')
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('pivert_device_id', id) }
  return id
}

function notifierNouvelArticle(nom) {
  fetch(`${SUPABASE_URL}/functions/v1/notify-courses`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_KEY}` },
    body: JSON.stringify({ nom, device_id: getDeviceId() })
  }).catch(() => {})
}

// — Toast —
function afficherToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer.value)
  toastTimer.value = setTimeout(() => { toast.value = '' }, 2800)
}

// — Temps réel —
function appliquerChangement(payload) {
  if (payload.eventType === 'UPDATE') {
    const idx = courses.value.findIndex(c => c.id === payload.new.id)
    if (idx !== -1) courses.value[idx] = payload.new
  } else if (payload.eventType === 'INSERT') {
    if (!courses.value.find(c => c.id === payload.new.id)) courses.value.push(payload.new)
  } else if (payload.eventType === 'DELETE') {
    courses.value = courses.value.filter(c => c.id !== payload.old.id)
  }
}

let channel
let vpHandler = null
onMounted(async () => {
  await charger()
  channel = supabase
    .channel('courses_realtime')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'liste_courses' }, appliquerChangement)
    .subscribe()
  if (window.visualViewport) {
    vpHandler = () => {
      keyboardY.value = Math.max(0, window.innerHeight - window.visualViewport.height)
    }
    window.visualViewport.addEventListener('resize', vpHandler)
  }
})

onUnmounted(() => {
  if (channel) supabase.removeChannel(channel)
  clearTimeout(toastTimer.value)
  if (window.visualViewport && vpHandler) window.visualViewport.removeEventListener('resize', vpHandler)
})
</script>

<style scoped>
.courses-view {
  padding: 20px 16px calc(90px + env(safe-area-inset-bottom, 0px));
  max-width: 600px;
  margin: 0 auto;
  min-height: 100vh;
}

/* ── Top bar ── */
.courses-topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 6px;
}

.courses-heading {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

.courses-progress {
  font-family: var(--font-ui);
  font-size: 0.78rem;
  color: var(--stone);
  font-weight: 500;
  margin: 2px 0 0;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.btn-toggle-achetes {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  background: var(--sand-light);
  border: 1.5px solid var(--sand);
  border-radius: var(--r-pill);
  color: var(--stone);
  font-family: var(--font-ui);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.btn-toggle-achetes.active {
  background: var(--sage-pale);
  border-color: var(--leaf);
  color: var(--moss);
}
.btn-toggle-achetes:hover { background: var(--sand); }

.btn-reset {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  background: var(--sand-light);
  border: 1px solid var(--sand);
  border-radius: var(--r-pill);
  color: var(--stone);
  font-family: var(--font-ui);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
  flex-shrink: 0;
}
.btn-reset:hover { background: var(--sand); color: var(--ink); }

/* ── Progress bar ── */
.progress-bar-wrap {
  margin-bottom: 18px;
}
.progress-bar-track {
  height: 4px;
  background: var(--sand);
  border-radius: 2px;
  overflow: hidden;
}
.progress-bar-fill {
  height: 100%;
  background: var(--leaf);
  border-radius: 2px;
  transition: width 0.4s ease;
}

/* ── Empty ── */
.courses-empty {
  text-align: center;
  padding: 60px 20px 40px;
}
.empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
.empty-title {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--ink);
}
.empty-sub {
  font-family: var(--font-ui);
  font-size: 0.85rem;
  color: var(--stone);
  margin-top: 5px;
}

/* ── Skeleton ── */
.skeleton-list { display: flex; flex-direction: column; gap: 10px; }
.skeleton-item {
  height: 64px;
  border-radius: var(--r-md);
  background: linear-gradient(90deg, var(--sand-light) 25%, var(--sand) 50%, var(--sand-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Groupes magasin ── */
.group-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--stone);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 16px 2px 8px;
  border-bottom: 1px solid var(--sand);
  margin-bottom: 8px;
}
.group-icon { font-size: 0.9rem; }

/* ── Item ── */
.course-item {
  display: flex;
  align-items: center;
  gap: 12px;
  background: var(--cream);
  border: 1px solid rgba(42,77,32,0.08);
  border-radius: var(--r-md);
  padding: 14px 12px 14px 14px;
  margin-bottom: 8px;
  box-shadow: var(--shadow-xs);
  transition: opacity 0.3s, background 0.2s;
}
.course-item.achete {
  opacity: 0.42;
  background: var(--parchment);
}

/* Checkbox */
.checkbox {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: 2px solid var(--sand);
  background: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.18s;
  color: white;
  padding: 0;
}
.checkbox.checked {
  background: var(--leaf);
  border-color: var(--leaf);
}
.checkbox:active { transform: scale(0.88); }

/* Body */
.course-body {
  flex: 1;
  min-width: 0;
  cursor: pointer;
}
.course-nom {
  font-family: var(--font-ui);
  font-size: 0.98rem;
  font-weight: 700;
  color: var(--ink);
  display: block;
}
.course-item.achete .course-nom {
  text-decoration: line-through;
  color: var(--stone);
}
.course-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  flex-wrap: wrap;
}
.course-qty {
  font-family: var(--font-ui);
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--stone);
  background: var(--sand-light);
  padding: 1px 7px;
  border-radius: var(--r-pill);
  border: 1px solid var(--sand);
}
.course-store {
  font-family: var(--font-ui);
  font-size: 0.74rem;
  font-weight: 600;
  color: var(--moss);
  background: rgba(42,77,32,0.07);
  padding: 1px 8px;
  border-radius: var(--r-pill);
  border: 1px solid rgba(42,77,32,0.14);
}

/* Supprimer */
.btn-del {
  width: 30px;
  height: 30px;
  border-radius: var(--r-sm);
  border: 1px solid rgba(184,60,60,0.18);
  background: transparent;
  color: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.5;
  transition: all 0.2s;
  flex-shrink: 0;
  padding: 0;
}
.btn-del:hover, .btn-del:active { opacity: 1; background: rgba(184,60,60,0.07); border-color: rgba(184,60,60,0.45); }

/* ── FAB ── */
.fab {
  position: fixed;
  bottom: calc(76px + env(safe-area-inset-bottom, 0px));
  right: 20px;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--moss);
  color: white;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: var(--shadow-fab);
  transition: transform 0.2s, box-shadow 0.2s;
  z-index: 200;
}
.fab:active { transform: scale(0.93); box-shadow: var(--shadow-md); }

/* ── Modal ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(28, 26, 18, 0.45);
  backdrop-filter: blur(3px);
  z-index: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}
.modal-sheet {
  width: 100%;
  max-width: 480px;
  background: var(--cream);
  border-radius: var(--r-xl);
  padding: 24px 20px;
  box-shadow: var(--shadow-lg);
  position: relative;
}
.modal-handle { display: none; }
.modal-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 18px;
}
.autocomplete-wrap { position: relative; }
.ac-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: var(--cream);
  border: 1.5px solid var(--leaf);
  border-radius: var(--r-md);
  box-shadow: var(--shadow-md);
  z-index: 50;
  margin: 0; padding: 4px 0;
  list-style: none;
  max-height: 180px;
  overflow-y: auto;
}
.ac-dropdown li {
  padding: 11px 16px;
  font-family: var(--font-ui);
  font-size: 0.92rem;
  color: var(--ink);
  cursor: pointer;
  transition: background 0.15s;
}
.ac-dropdown li:hover { background: var(--sage-pale); }

.field-group { margin-bottom: 14px; }
.field-row { display: flex; gap: 10px; }
.field-group--half { flex: 1; min-width: 0; }
.field-label {
  display: block;
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--stone);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 5px;
}
.field-input {
  width: 100%;
  background: var(--parchment);
  border: 1.5px solid var(--sand);
  border-radius: var(--r-md);
  padding: 11px 14px;
  font-family: var(--font-ui);
  font-size: 0.95rem;
  color: var(--ink);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.field-input:focus { border-color: var(--leaf); }

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 22px;
  padding-top: 16px;
  border-top: 1px solid var(--sand-light);
}
.btn-cancel {
  flex: 1;
  padding: 13px;
  border-radius: var(--r-md);
  border: 1.5px solid var(--sand);
  background: transparent;
  color: var(--stone);
  font-family: var(--font-ui);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
}
.btn-save {
  flex: 2;
  padding: 13px;
  border-radius: var(--r-md);
  border: none;
  background: var(--moss);
  color: white;
  font-family: var(--font-ui);
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
.btn-save:not(:disabled):hover { background: var(--moss-hover); }

/* ── Toast ── */
.toast {
  position: fixed;
  bottom: calc(88px + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: var(--cream);
  padding: 10px 20px;
  border-radius: var(--r-pill);
  font-family: var(--font-ui);
  font-size: 0.85rem;
  font-weight: 600;
  white-space: nowrap;
  z-index: 700;
  box-shadow: var(--shadow-md);
  pointer-events: none;
}

/* ── Transitions ── */
.item-enter-active, .item-leave-active { transition: all 0.28s ease; }
.item-enter-from { opacity: 0; transform: translateX(-10px); }
.item-leave-to { opacity: 0; transform: translateX(10px); height: 0; margin: 0; padding: 0; }

.modal-enter-active, .modal-leave-active { transition: opacity 0.2s ease; }
.modal-enter-active .modal-sheet, .modal-leave-active .modal-sheet { transition: transform 0.2s ease, opacity 0.2s ease; }
.modal-enter-from { opacity: 0; }
.modal-enter-from .modal-sheet { transform: scale(0.95); opacity: 0; }
.modal-leave-to { opacity: 0; }
.modal-leave-to .modal-sheet { transform: scale(0.95); opacity: 0; }

.toast-enter-active, .toast-leave-active { transition: all 0.22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }
</style>
