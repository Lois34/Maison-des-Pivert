<template>
  <main class="recettes-view">

    <!-- Header -->
    <div class="recettes-topbar">
      <h2 class="recettes-heading">Recettes</h2>
      <button class="btn-suggerer" :disabled="loadingIA" @click="ouvrirWizard">
        <span v-if="loadingIA" class="btn-suggerer-spinner">{{ iaEmoji }}</span>
        <span v-else>✨ Suggérer</span>
      </button>
    </div>

    <!-- Skeleton -->
    <div v-if="loading" class="skeleton-grid">
      <div v-for="i in 4" :key="i" class="skeleton-card" />
    </div>

    <!-- Vide -->
    <div v-else-if="recettes.length === 0" class="recettes-empty">
      <span class="empty-icon">📖</span>
      <p class="empty-title">Aucune recette pour l'instant</p>
      <p class="empty-sub">Appuyez sur + pour ajouter la première</p>
    </div>

    <!-- Grille -->
    <div v-else class="recettes-grid">
      <div
        v-for="r in recettes"
        :key="r.id"
        class="recette-card"
        @click="ouvrirDetail(r)"
      >
        <div class="recette-card-img-wrap">
          <img v-if="r.image_url" :src="r.image_url" :alt="r.nom" class="recette-card-img" loading="lazy" />
          <div v-else class="recette-card-placeholder">🍽️</div>
        </div>
        <div class="recette-card-body">
          <p class="recette-card-nom">{{ r.nom }}</p>
          <p v-if="r.description" class="recette-card-desc">{{ r.description }}</p>
        </div>
      </div>
    </div>

    <!-- FAB -->
    <button class="fab" @click="ouvrirFormulaire(null)" aria-label="Nouvelle recette">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <!-- ══════════ MODAL WIZARD IA ══════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="wizardOuvert" class="modal-overlay" @click.self="fermerWizard">
          <div class="modal-sheet">
            <div class="modal-handle" />

            <!-- Barre de navigation wizard -->
            <div class="wizard-nav">
              <button v-if="wizardStep > 1" class="wizard-back" @click="wizardPrecedent">←</button>
              <div v-else class="wizard-back-placeholder" />
              <div class="wizard-dots">
                <span
                  v-for="i in WIZARD_TOTAL"
                  :key="i"
                  class="wizard-dot"
                  :class="{ active: i <= wizardStep }"
                />
              </div>
              <button class="wizard-close" @click="fermerWizard">×</button>
            </div>

            <!-- Étape 1 : Repas -->
            <div v-if="wizardStep === 1" class="wizard-page">
              <p class="wizard-question">C'est pour quel repas ?</p>
              <div class="wizard-choices grid-2">
                <button v-for="c in repasChoix" :key="c.value" class="wizard-choice" @click="choisir('repas', c.value)">
                  <span class="wc-emoji">{{ c.emoji }}</span>{{ c.label }}
                </button>
              </div>
              <button class="btn-peu-importe" @click="choisir('repas', null)">Peu importe →</button>
            </div>

            <!-- Étape 2 : Style -->
            <div v-if="wizardStep === 2" class="wizard-page">
              <p class="wizard-question">Tu veux cuisiner ou quelque chose de rapide ?</p>
              <div class="wizard-choices grid-2">
                <button class="wizard-choice" @click="choisir('style', 'Recette complète')"><span class="wc-emoji">👨‍🍳</span>Cuisiner</button>
                <button class="wizard-choice" @click="choisir('style', 'Rapide moins de 20 minutes')"><span class="wc-emoji">⚡</span>Sur le pouce<br><small>moins de 20 min</small></button>
              </div>
              <button class="btn-peu-importe" @click="choisir('style', null)">Peu importe →</button>
            </div>

            <!-- Étape 3 : Envie -->
            <div v-if="wizardStep === 3" class="wizard-page">
              <p class="wizard-question">Une envie particulière ?</p>
              <div class="wizard-choices grid-2">
                <button v-for="c in envieChoix" :key="c.value" class="wizard-choice" @click="choisir('envie', c.value)">
                  <span class="wc-emoji">{{ c.emoji }}</span>{{ c.label }}
                </button>
              </div>
              <button class="btn-peu-importe" @click="choisir('envie', null)">Peu importe →</button>
            </div>

            <!-- Étape 4 : Personnes -->
            <div v-if="wizardStep === 4" class="wizard-page">
              <p class="wizard-question">Pour combien de personnes ?</p>
              <div class="wizard-choices grid-3">
                <button class="wizard-choice" @click="choisir('personnes', '1 personne')"><span class="wc-emoji">👤</span>1</button>
                <button class="wizard-choice" @click="choisir('personnes', '2 personnes')"><span class="wc-emoji">👥</span>2</button>
                <button class="wizard-choice" @click="choisir('personnes', '4 personnes ou plus')"><span class="wc-emoji">👨‍👩‍👧‍👦</span>4+</button>
              </div>
              <button class="btn-peu-importe" @click="choisir('personnes', null)">Peu importe →</button>
            </div>

            <!-- Étape 5 : Ingrédient principal + Générer -->
            <div v-if="wizardStep === 5" class="wizard-page">
              <p class="wizard-question">Un ingrédient principal souhaité ?</p>
              <div class="wizard-ingredient-wrap">
                <input
                  v-model="wizardIngredient"
                  type="text"
                  class="field-input"
                  placeholder="Ex : Poulet, Pâtes, Saumon…"
                  autocomplete="off"
                  @keydown.enter="genererRecetteIA"
                />
                <p class="wizard-hint">Laisse vide si pas de préférence</p>
              </div>
              <button class="btn-generer" @click="genererRecetteIA">✨ Générer ma recette</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════ LOADER IA ══════════ -->
    <Teleport to="body">
      <Transition name="loader-ia">
        <div v-if="loadingIA" class="loader-ia-overlay">
          <div class="loader-ia-card">
            <div class="loader-ia-emoji">{{ iaEmoji }}</div>
            <p class="loader-ia-texte">{{ iaMessage }}</p>
            <div class="loader-ia-dots">
              <span /><span /><span />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════ MODAL FORMULAIRE ══════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="formOuvert" class="modal-overlay modal-overlay--scroll" @click.self="fermerFormulaire">
          <div class="modal-sheet modal-sheet--tall">
            <div class="modal-handle" />
            <div class="modal-header-row">
              <h3 class="modal-title">{{ titreModal }}</h3>
              <button class="wizard-close" @click="fermerFormulaire">×</button>
            </div>

            <div class="field-group">
              <label class="field-label">Nom de la recette *</label>
              <input ref="inputNom" v-model="form.nom" type="text" class="field-input" placeholder="Ex : Poulet rôti croustillant" />
            </div>

            <div class="field-group">
              <label class="field-label">Description courte</label>
              <input v-model="form.description" type="text" class="field-input" placeholder="Ex : Léger et savoureux" />
            </div>

            <!-- Photo -->
            <div class="field-group">
              <label class="field-label">Photo</label>
              <label class="upload-label">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                {{ photoLabel }}
                <input type="file" accept="image/*" capture="environment" class="input-hidden" @change="onPhotoChange" />
              </label>
            </div>

            <div class="field-group">
              <label class="field-label">Ingrédients</label>
              <textarea v-model="form.ingredients" class="field-textarea" rows="4" placeholder="1 poulet entier&#10;2 cs d'huile d'olive&#10;Sel, poivre, paprika" />
            </div>

            <div class="field-group">
              <label class="field-label">Instructions</label>
              <textarea v-model="form.instructions" class="field-textarea" rows="5" placeholder="1. Préchauffer l'air fryer à 180°C&#10;2. Badigeonner le poulet d'huile…" />
            </div>

            <!-- Air Fryers -->
            <div class="airfryer-section">
              <p class="airfryer-section-title">🔥 Réglages air fryer</p>
              <div v-for="af in AIRFRYERS" :key="af.key" class="airfryer-bloc">
                <p class="airfryer-bloc-titre">{{ af.label }}</p>
                <div class="airfryer-row">
                  <div>
                    <label class="airfryer-label">Mode</label>
                    <input v-model="form.airfryers[af.key].mode" type="text" class="field-input field-input--sm" placeholder="Air Fry" :list="'modes-' + af.key" />
                    <datalist :id="'modes-' + af.key">
                      <option v-for="m in af.modes" :key="m" :value="m" />
                    </datalist>
                  </div>
                  <div>
                    <label class="airfryer-label">Temp °C</label>
                    <input v-model.number="form.airfryers[af.key].temperature" type="number" class="field-input field-input--sm" placeholder="180" min="40" max="240" />
                  </div>
                  <div>
                    <label class="airfryer-label">Durée min</label>
                    <input v-model.number="form.airfryers[af.key].duree" type="number" class="field-input field-input--sm" placeholder="20" min="1" max="180" />
                  </div>
                </div>
              </div>
            </div>

            <div class="modal-actions">
              <button class="btn-cancel" @click="fermerFormulaire">Annuler</button>
              <button class="btn-save" :disabled="sauvegarde" @click="sauvegarder">
                {{ sauvegarde ? '⏳ En cours…' : (modeEdition ? '✏️ Modifier' : '➕ Ajouter') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- ══════════ MODAL DÉTAIL ══════════ -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="detailOuvert && recetteActive" class="modal-overlay modal-overlay--scroll" @click.self="fermerDetail">
          <div class="modal-sheet modal-sheet--tall">
            <div class="modal-handle" />
            <button class="wizard-close detail-close" @click="fermerDetail">×</button>

            <img v-if="recetteActive.image_url" :src="recetteActive.image_url" :alt="recetteActive.nom" class="detail-img" />
            <div v-else class="detail-img-placeholder">🍽️</div>

            <h3 class="detail-nom">{{ recetteActive.nom }}</h3>
            <p v-if="recetteActive.description" class="detail-desc">{{ recetteActive.description }}</p>

            <div v-if="recetteActive.ingredients" class="detail-section">
              <p class="detail-section-title">Ingrédients</p>
              <pre class="detail-text">{{ recetteActive.ingredients }}</pre>
            </div>

            <div v-if="recetteActive.instructions" class="detail-section">
              <p class="detail-section-title">Instructions</p>
              <pre class="detail-text">{{ recetteActive.instructions }}</pre>
            </div>

            <div v-if="afRenseignes.length" class="detail-section">
              <p class="detail-section-title">Réglages air fryer</p>
              <div v-for="af in afRenseignes" :key="af.key" class="af-detail-card">
                <p class="af-detail-nom">{{ af.label }}</p>
                <div class="af-detail-info">
                  <span v-if="af.cuisson.mode">🔧 {{ af.cuisson.mode }}</span>
                  <span v-if="af.cuisson.temperature">🌡️ {{ af.cuisson.temperature }}°C</span>
                  <span v-if="af.cuisson.duree">⏱️ {{ af.cuisson.duree }} min</span>
                </div>
              </div>
            </div>

            <div class="detail-actions">
              <button class="btn-save" @click="fermerDetail(); ouvrirFormulaire(recetteActive)">✏️ Modifier</button>
              <label class="btn-photo">
                📷 {{ recetteActive.image_url ? 'Changer la photo' : 'Ajouter une photo' }}
                <input type="file" accept="image/*" capture="environment" class="input-hidden" @change="uploaderPhotoDetail" />
              </label>
              <button class="btn-delete" @click="supprimer(recetteActive.id)">🗑️</button>
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
import { ref, computed, onMounted, nextTick } from 'vue'
import { supabase } from '../services/supabase.js'

// ── Constantes ──
const AIRFRYERS = [
  { key: 'ninja_combi',  label: 'Ninja Combi 12-en-1', modes: ['Air Fry','Bake','Roast','Grill','Steam Air Fry','Combi Steam Bake','Reheat','Dehydrate'] },
  { key: 'philips',      label: 'Philips classique',    modes: ['Air Fry','Bake','Roast','Grill','Reheat','Dehydrate'] },
  { key: 'ninja_crispi', label: 'Ninja Crispi',         modes: ['Air Fry','Bake','Roast','Grill','Reheat','Dehydrate'] },
]
const WIZARD_TOTAL = 5
const repasChoix = [
  { emoji: '🌅', label: 'Petit déjeuner', value: 'Petit déjeuner' },
  { emoji: '☀️', label: 'Déjeuner',       value: 'Déjeuner' },
  { emoji: '🌙', label: 'Dîner',          value: 'Dîner' },
  { emoji: '🍪', label: 'Goûter',         value: 'Goûter' },
]
const ENVIES_STANDARD = [
  { emoji: '🍽️', label: 'Classique',   value: 'Classique et réconfortant' },
  { emoji: '🥗',  label: 'Végétarien', value: 'Végétarien' },
  { emoji: '🌶️', label: 'Épicé',       value: 'Épicé et relevé' },
  { emoji: '🥙',  label: 'Léger',      value: 'Léger et diététique' },
]
const ENVIES_SUCRE = [
  { emoji: '🍽️', label: 'Classique', value: 'Classique et réconfortant' },
  { emoji: '🍬',  label: 'Sucré',    value: 'Sucré et gourmand' },
  { emoji: '🥙',  label: 'Léger',    value: 'Léger et diététique' },
  { emoji: '⚡',  label: 'Rapide',   value: 'Rapide à préparer' },
]
const IA_MODELS = [
  'google/gemma-4-31b-it:free',
  'google/gemma-4-26b-a4b-it:free',
  'deepseek/deepseek-chat-v3-0324:free',
  'deepseek/deepseek-r1-0528:free',
  'meta-llama/llama-3.1-8b-instruct:free',
  'qwen/qwen-2.5-72b-instruct:free',
  'nvidia/nemotron-3-super-120b-a12b:free',
]
const IA_EMOJIS = ['🍳','🥘','🍗','🥗','🧆','🍜','🥙','🫕']

// ── État ──
const recettes       = ref([])
const loading        = ref(true)
const formOuvert     = ref(false)
const detailOuvert   = ref(false)
const wizardOuvert   = ref(false)
const loadingIA      = ref(false)
const sauvegarde     = ref(false)
const toast          = ref('')
const toastTimer     = ref(null)
const modeEdition    = ref(false)
const idEdition      = ref(null)
const recetteActive  = ref(null)
const inputNom       = ref(null)
const iaEmoji        = ref('🍳')
const iaEmojiTimer   = ref(null)
const iaMessage      = ref('Je prépare ta recette…')
const IA_MESSAGES    = [
  'Je prépare ta recette…',
  'Je fouille le garde-manger…',
  'Je consulte les étoiles culinaires…',
  'Je mijote les idées…',
  'Presque prête…',
]

// Wizard
const wizardStep      = ref(1)
const wizardData      = ref({})
const wizardIngredient = ref('')
const envieChoix      = ref(ENVIES_STANDARD)

// Form
const formVide = () => ({
  nom: '', description: '', ingredients: '', instructions: '',
  photoFile: null,
  airfryers: Object.fromEntries(AIRFRYERS.map(af => [af.key, { mode: '', temperature: '', duree: '' }]))
})
const form = ref(formVide())
const photoLabel = ref('📷 Prendre ou choisir une photo')

// ── Dérivés ──
const titreModal = computed(() => {
  if (form.value._ia) return '✨ Recette suggérée par l\'IA'
  return modeEdition.value ? 'Modifier la recette' : 'Nouvelle recette'
})

const afRenseignes = computed(() => {
  if (!recetteActive.value?.cuisson) return []
  return AIRFRYERS
    .filter(af => {
      const c = recetteActive.value.cuisson[af.key]
      return c && (c.mode || c.temperature || c.duree)
    })
    .map(af => ({ ...af, cuisson: recetteActive.value.cuisson[af.key] }))
})

// ── Supabase ──
async function charger() {
  loading.value = true
  const { data } = await supabase.from('recettes').select('*').order('created_at', { ascending: false })
  recettes.value = data || []
  loading.value = false
}

async function sauvegarder() {
  const nom = form.value.nom.trim()
  if (!nom) { afficherToast('⚠️ Le nom est obligatoire'); return }
  sauvegarde.value = true
  try {
    let image_url = modeEdition.value
      ? (recettes.value.find(r => r.id === idEdition.value)?.image_url || null)
      : null

    if (form.value.photoFile) {
      const file = form.value.photoFile
      const name = `recettes/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g,'_')}`
      await supabase.storage.from('photos').upload(name, file)
      image_url = supabase.storage.from('photos').getPublicUrl(name).data.publicUrl
    }

    const cuisson = {}
    AIRFRYERS.forEach(af => {
      const af_ = form.value.airfryers[af.key]
      if (af_.mode || af_.temperature || af_.duree) {
        cuisson[af.key] = {
          mode: af_.mode || null,
          temperature: af_.temperature || null,
          duree: af_.duree || null,
        }
      }
    })

    const payload = {
      nom,
      description: form.value.description.trim() || null,
      ingredients: form.value.ingredients.trim() || null,
      instructions: form.value.instructions.trim() || null,
      image_url,
      cuisson,
    }

    if (modeEdition.value) {
      await supabase.from('recettes').update(payload).eq('id', idEdition.value)
      afficherToast('✅ Recette modifiée !')
    } else {
      await supabase.from('recettes').insert([payload])
      afficherToast('✅ Recette ajoutée !')
    }
    fermerFormulaire()
    await charger()
  } catch (e) {
    afficherToast('❌ Erreur : ' + e.message)
  } finally {
    sauvegarde.value = false
  }
}

async function supprimer(id) {
  if (!confirm('Supprimer cette recette ?')) return
  await supabase.from('recettes').delete().eq('id', id)
  fermerDetail()
  afficherToast('🗑️ Recette supprimée')
  await charger()
}

async function uploaderPhotoDetail(e) {
  const file = e.target.files?.[0]
  if (!file || !recetteActive.value) return
  e.target.value = ''
  afficherToast('⏳ Upload en cours…')
  try {
    const name = `recettes/${recetteActive.value.id}_${Date.now()}.jpg`
    const compressed = await compresserImage(file, 800, 0.75)
    await supabase.storage.from('photos').upload(name, compressed, { contentType: 'image/jpeg' })
    const url = supabase.storage.from('photos').getPublicUrl(name).data.publicUrl
    await supabase.from('recettes').update({ image_url: url }).eq('id', recetteActive.value.id)
    recetteActive.value = { ...recetteActive.value, image_url: url }
    const r = recettes.value.find(r => r.id === recetteActive.value.id)
    if (r) r.image_url = url
    afficherToast('📷 Photo ajoutée !')
  } catch (err) {
    afficherToast('❌ Erreur upload : ' + err.message)
  }
}

// ── Modals ──
function ouvrirFormulaire(recette = null) {
  detailOuvert.value = false
  modeEdition.value = !!recette
  idEdition.value = recette?.id || null
  photoLabel.value = '📷 Prendre ou choisir une photo'
  if (recette) {
    form.value = {
      nom: recette.nom || '',
      description: recette.description || '',
      ingredients: recette.ingredients || '',
      instructions: recette.instructions || '',
      photoFile: null,
      airfryers: Object.fromEntries(
        AIRFRYERS.map(af => [
          af.key,
          { mode: recette.cuisson?.[af.key]?.mode || '', temperature: recette.cuisson?.[af.key]?.temperature || '', duree: recette.cuisson?.[af.key]?.duree || '' }
        ])
      )
    }
  } else {
    form.value = formVide()
  }
  formOuvert.value = true
  nextTick(() => inputNom.value?.focus())
}

function fermerFormulaire() { formOuvert.value = false }

function ouvrirDetail(recette) {
  recetteActive.value = recette
  detailOuvert.value = true
}
function fermerDetail() { detailOuvert.value = false }

function onPhotoChange(e) {
  const file = e.target.files?.[0]
  if (!file) return
  form.value.photoFile = file
  photoLabel.value = '✅ ' + file.name
}

// ── Wizard ──
function ouvrirWizard() {
  wizardData.value = {}
  wizardStep.value = 1
  wizardIngredient.value = ''
  envieChoix.value = ENVIES_STANDARD
  wizardOuvert.value = true
}
function fermerWizard() { wizardOuvert.value = false }

function choisir(field, value) {
  if (value !== null) wizardData.value[field] = value
  if (field === 'repas') {
    envieChoix.value = ['Petit déjeuner','Goûter'].includes(value) ? ENVIES_SUCRE : ENVIES_STANDARD
  }
  if (wizardStep.value < WIZARD_TOTAL) wizardStep.value++
}

function wizardPrecedent() {
  if (wizardStep.value > 1) wizardStep.value--
}

// ── IA ──
async function genererRecetteIA() {
  fermerWizard()
  loadingIA.value = true
  iaMessage.value = IA_MESSAGES[0]
  let idx = 0, msgIdx = 0
  iaEmojiTimer.value = setInterval(() => {
    idx = (idx + 1) % IA_EMOJIS.length
    iaEmoji.value = IA_EMOJIS[idx]
    msgIdx = (msgIdx + 1) % IA_MESSAGES.length
    iaMessage.value = IA_MESSAGES[msgIdx]
  }, 1800)

  try {
    const { data: inventaire } = await supabase.from('inventaire').select('nom').order('created_at', { ascending: false }).limit(40)
    const ingredients = (inventaire || []).map(i => i.nom)
    // Mélange aléatoire
    for (let i = ingredients.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [ingredients[i], ingredients[j]] = [ingredients[j], ingredients[i]]
    }
    const listeIngredients = ingredients.length ? ingredients.join(', ') : 'ingrédients variés du placard'
    const { repas, style, envie, personnes } = wizardData.value
    const ingredientPrincipal = wizardIngredient.value.trim()

    const contraintes = []
    if (repas)              contraintes.push(`- Type de repas : ${repas}`)
    if (style)              contraintes.push(`- Style : ${style}`)
    if (envie)              contraintes.push(`- Ambiance : ${envie}`)
    if (personnes)          contraintes.push(`- Pour : ${personnes}`)
    if (ingredientPrincipal) contraintes.push(`- Ingrédient principal obligatoire : ${ingredientPrincipal}`)
    contraintes.push(`- Sois original et varié, ne propose pas toujours le même ingrédient principal`)
    contraintes.push(`- Utilise tout ou partie de ces ingrédients disponibles : ${listeIngredients}`)

    const prompt = `Tu es un assistant culinaire créatif. Propose UNE recette adaptée à l'air fryer.

Contraintes :
${contraintes.join('\n')}

Réponds UNIQUEMENT en JSON valide avec exactement ces champs :
{
  "nom": "Nom de la recette",
  "description": "Courte description appétissante (1 phrase)",
  "ingredients": "liste des ingrédients avec quantités, un par ligne",
  "instructions": "étapes numérotées, une par ligne",
  "cuisson": {
    "ninja_combi": { "mode": "Air Fry", "temperature": 180, "duree": 25 },
    "philips": { "mode": "Air Fry", "temperature": 180, "duree": 25 },
    "ninja_crispi": { "mode": "Air Fry", "temperature": 180, "duree": 25 }
  }
}`

    let recette = null
    for (const model of IA_MODELS) {
      try {
        const res = await fetch('/.netlify/functions/ia-proxy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
        })
        if (!res.ok) continue
        const data = await res.json()
        const raw = data.choices?.[0]?.message?.content || ''
        const match = raw.match(/\{[\s\S]*\}/)
        if (!match) continue
        recette = JSON.parse(match[0])
        break
      } catch { continue }
    }

    if (!recette) throw new Error('Les serveurs IA gratuits sont surchargés 😅 Réessaie dans 1 à 2 minutes.')

    // Pré-remplir formulaire
    form.value = {
      _ia: true,
      nom: recette.nom || '',
      description: recette.description || '',
      ingredients: recette.ingredients || '',
      instructions: recette.instructions || '',
      photoFile: null,
      airfryers: Object.fromEntries(
        AIRFRYERS.map(af => [af.key, {
          mode: recette.cuisson?.[af.key]?.mode || '',
          temperature: recette.cuisson?.[af.key]?.temperature || '',
          duree: recette.cuisson?.[af.key]?.duree || '',
        }])
      )
    }
    modeEdition.value = false
    idEdition.value = null
    photoLabel.value = '📷 Prendre ou choisir une photo'
    formOuvert.value = true
    afficherToast('✨ Recette générée ! Vérifie et sauvegarde.')
  } catch (e) {
    afficherToast('❌ ' + e.message)
  } finally {
    clearInterval(iaEmojiTimer.value)
    loadingIA.value = false
  }
}

// ── Utilitaires ──
function afficherToast(msg) {
  toast.value = msg
  clearTimeout(toastTimer.value)
  toastTimer.value = setTimeout(() => { toast.value = '' }, 2800)
}

async function compresserImage(file, maxW, quality) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxW / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      canvas.toBlob(b => b ? resolve(b) : reject(new Error('compression failed')), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('load failed')) }
    img.src = url
  })
}

onMounted(charger)
</script>

<style scoped>
.recettes-view {
  padding: 20px 16px calc(90px + env(safe-area-inset-bottom, 0px));
  max-width: 600px;
  margin: 0 auto;
}

/* ── Top bar ── */
.recettes-topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.recettes-heading {
  font-family: var(--font-display);
  font-size: 1.35rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}
.btn-suggerer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  color: white;
  border: none;
  border-radius: var(--r-pill);
  font-family: var(--font-ui);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(124,58,237,0.35);
  transition: all 0.2s;
}
.btn-suggerer:hover { box-shadow: 0 6px 20px rgba(124,58,237,0.45); transform: translateY(-1px); }
.btn-suggerer:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
.btn-suggerer-spinner { font-size: 1.1rem; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Skeleton ── */
.skeleton-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.skeleton-card {
  height: 160px;
  border-radius: var(--r-md);
  background: linear-gradient(90deg, var(--sand-light) 25%, var(--sand) 50%, var(--sand-light) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

/* ── Vide ── */
.recettes-empty { text-align: center; padding: 60px 20px 40px; }
.empty-icon { font-size: 3rem; display: block; margin-bottom: 12px; }
.empty-title { font-family: var(--font-display); font-size: 1.05rem; font-weight: 600; color: var(--ink); }
.empty-sub { font-family: var(--font-ui); font-size: 0.85rem; color: var(--stone); margin-top: 5px; }

/* ── Grille ── */
.recettes-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}
.recette-card {
  background: var(--cream);
  border: 1px solid rgba(42,77,32,0.08);
  border-radius: var(--r-md);
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: var(--shadow-xs);
}
.recette-card:active { transform: scale(0.97); }
.recette-card-img-wrap { width: 100%; height: 110px; overflow: hidden; background: var(--sand-light); }
.recette-card-img { width: 100%; height: 100%; object-fit: cover; display: block; }
.recette-card-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  background: var(--sand-light);
}
.recette-card-body { padding: 10px 12px 12px; }
.recette-card-nom {
  font-family: var(--font-ui);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0 0 3px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.recette-card-desc {
  font-family: var(--font-ui);
  font-size: 0.74rem;
  color: var(--stone);
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
}

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

/* ── Modal base ── */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(28,26,18,0.45);
  backdrop-filter: blur(3px);
  z-index: 600;
  display: flex;
  align-items: flex-end;
}
.modal-overlay--scroll { align-items: flex-end; }

.modal-sheet {
  width: 100%;
  max-width: 600px;
  margin: 0 auto;
  background: var(--cream);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  padding: 14px 20px calc(24px + env(safe-area-inset-bottom, 0px));
  box-shadow: var(--shadow-lg);
  max-height: 92vh;
  overflow-y: auto;
}
.modal-sheet--tall { max-height: 94vh; }

.modal-handle {
  width: 36px;
  height: 4px;
  background: var(--sand);
  border-radius: 2px;
  margin: 0 auto 18px;
  flex-shrink: 0;
}
.modal-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 18px;
}
.modal-title {
  font-family: var(--font-display);
  font-size: 1.15rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0;
}

/* ── Wizard ── */
.wizard-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.wizard-back, .wizard-close {
  background: none;
  border: none;
  font-size: 1.3rem;
  cursor: pointer;
  color: var(--stone);
  padding: 4px 8px;
  line-height: 1;
}
.wizard-back-placeholder { width: 36px; }
.wizard-dots { display: flex; gap: 6px; }
.wizard-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sand);
  transition: background 0.2s;
}
.wizard-dot.active { background: #7c3aed; }

.wizard-page { padding-top: 4px; }
.wizard-question {
  font-family: var(--font-display);
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--ink);
  text-align: center;
  margin: 18px 0 20px;
  line-height: 1.4;
}
.wizard-choices { display: grid; gap: 12px; }
.wizard-choices.grid-2 { grid-template-columns: 1fr 1fr; }
.wizard-choices.grid-3 { grid-template-columns: 1fr 1fr 1fr; }
.wizard-choice {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 16px 8px;
  background: var(--parchment);
  border: 1.5px solid var(--sand);
  border-radius: var(--r-md);
  font-family: var(--font-ui);
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink);
  cursor: pointer;
  transition: all 0.18s;
  text-align: center;
  line-height: 1.3;
}
.wizard-choice:active { border-color: #7c3aed; background: #f5f0ff; transform: scale(0.96); }
.wizard-choice small { font-size: 0.7rem; color: var(--stone); font-weight: 400; }
.wc-emoji { font-size: 1.7rem; }

.wizard-ingredient-wrap { margin: 8px 0 18px; }
.wizard-hint { font-family: var(--font-ui); font-size: 0.78rem; color: var(--stone); text-align: center; margin-top: 7px; }
.btn-generer {
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #7c3aed, #5b21b6);
  color: white;
  border: none;
  border-radius: var(--r-md);
  font-family: var(--font-ui);
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(124,58,237,0.35);
  transition: all 0.2s;
}
.btn-generer:hover { box-shadow: 0 6px 20px rgba(124,58,237,0.45); }

.btn-peu-importe {
  width: 100%;
  margin-top: 14px;
  padding: 11px;
  background: transparent;
  border: 1.5px solid var(--sand);
  border-radius: var(--r-md);
  color: var(--stone);
  font-family: var(--font-ui);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.btn-peu-importe:hover { border-color: var(--stone-light); color: var(--ink); }

/* ── Formulaire ── */
.field-group { margin-bottom: 14px; }
.field-label {
  display: block;
  font-family: var(--font-ui);
  font-size: 0.7rem;
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
  font-size: 0.92rem;
  color: var(--ink);
  outline: none;
  transition: border-color 0.2s;
  box-sizing: border-box;
}
.field-input--sm { padding: 8px 10px; font-size: 0.85rem; }
.field-input:focus { border-color: var(--leaf); }
.field-textarea {
  width: 100%;
  background: var(--parchment);
  border: 1.5px solid var(--sand);
  border-radius: var(--r-md);
  padding: 11px 14px;
  font-family: var(--font-ui);
  font-size: 0.88rem;
  color: var(--ink);
  outline: none;
  resize: vertical;
  transition: border-color 0.2s;
  box-sizing: border-box;
  line-height: 1.5;
}
.field-textarea:focus { border-color: var(--leaf); }

.upload-label {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 14px;
  background: var(--parchment);
  border: 1.5px dashed var(--sand);
  border-radius: var(--r-md);
  font-family: var(--font-ui);
  font-size: 0.88rem;
  color: var(--stone);
  cursor: pointer;
  transition: border-color 0.2s;
}
.upload-label:hover { border-color: var(--leaf); }
.input-hidden { display: none; }

/* AirFryer */
.airfryer-section { margin-top: 18px; margin-bottom: 6px; }
.airfryer-section-title {
  font-family: var(--font-ui);
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--stone);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 10px;
}
.airfryer-bloc { margin-bottom: 12px; }
.airfryer-bloc-titre {
  font-family: var(--font-ui);
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--moss);
  margin-bottom: 6px;
}
.airfryer-row { display: grid; grid-template-columns: 1fr 80px 80px; gap: 8px; }
.airfryer-label {
  display: block;
  font-family: var(--font-ui);
  font-size: 0.68rem;
  color: var(--stone);
  margin-bottom: 3px;
}

/* Actions modal */
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

/* ── Détail ── */
.detail-close {
  position: absolute;
  top: 18px;
  right: 16px;
}
.detail-img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: var(--r-md);
  margin-bottom: 14px;
  display: block;
}
.detail-img-placeholder {
  font-size: 3rem;
  text-align: center;
  padding: 24px 0;
  background: var(--sand-light);
  border-radius: var(--r-md);
  margin-bottom: 14px;
}
.detail-nom {
  font-family: var(--font-display);
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--ink);
  margin: 0 0 6px;
}
.detail-desc {
  font-family: var(--font-ui);
  font-size: 0.88rem;
  color: var(--stone);
  margin: 0 0 14px;
  line-height: 1.5;
}
.detail-section { margin-bottom: 16px; }
.detail-section-title {
  font-family: var(--font-ui);
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--moss);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin-bottom: 8px;
}
.detail-text {
  font-family: var(--font-ui);
  font-size: 0.88rem;
  color: var(--ink);
  line-height: 1.65;
  white-space: pre-wrap;
  margin: 0;
}
.af-detail-card {
  background: var(--parchment);
  border-radius: var(--r-sm);
  padding: 10px 12px;
  margin-bottom: 8px;
  border: 1px solid var(--sand);
}
.af-detail-nom {
  font-family: var(--font-ui);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--moss);
  margin-bottom: 5px;
}
.af-detail-info {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  font-family: var(--font-ui);
  font-size: 0.83rem;
  color: var(--ink);
}
.detail-actions {
  display: flex;
  gap: 8px;
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--sand-light);
  flex-wrap: wrap;
}
.btn-photo {
  flex: 2;
  padding: 13px;
  border-radius: var(--r-md);
  border: 1.5px solid var(--sand);
  background: transparent;
  color: var(--stone);
  font-family: var(--font-ui);
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: border-color 0.2s;
}
.btn-photo:hover { border-color: var(--leaf); color: var(--moss); }
.btn-delete {
  padding: 13px 16px;
  border-radius: var(--r-md);
  border: 1.5px solid rgba(184,60,60,0.2);
  background: transparent;
  color: var(--danger);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-delete:hover { background: rgba(184,60,60,0.07); border-color: rgba(184,60,60,0.45); }

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
.modal-enter-active, .modal-leave-active { transition: opacity 0.22s ease; }
.modal-enter-active .modal-sheet, .modal-leave-active .modal-sheet { transition: transform 0.28s cubic-bezier(0.34,1.56,0.64,1); }
.modal-enter-from { opacity: 0; }
.modal-enter-from .modal-sheet { transform: translateY(100%); }
.modal-leave-to { opacity: 0; }
.modal-leave-to .modal-sheet { transform: translateY(100%); }

.toast-enter-active, .toast-leave-active { transition: all 0.22s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(10px); }

/* ── Loader IA ── */
.loader-ia-overlay {
  position: fixed;
  inset: 0;
  z-index: 900;
  background: rgba(20, 10, 40, 0.82);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
}
.loader-ia-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 36px 40px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: var(--r-xl);
  box-shadow: 0 20px 60px rgba(0,0,0,0.4);
  text-align: center;
}
.loader-ia-emoji {
  font-size: 3.2rem;
  animation: swing 1.2s ease-in-out infinite alternate;
  display: block;
  line-height: 1;
}
@keyframes swing {
  from { transform: rotate(-14deg) scale(1); }
  to   { transform: rotate(14deg) scale(1.1); }
}
.loader-ia-texte {
  font-family: var(--font-display);
  font-size: 1.05rem;
  font-weight: 500;
  color: rgba(255,255,255,0.9);
  margin: 0;
  min-width: 200px;
  transition: opacity 0.4s;
}
.loader-ia-dots {
  display: flex;
  gap: 8px;
}
.loader-ia-dots span {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #a78bfa;
  animation: dot-bounce 1.2s ease-in-out infinite;
}
.loader-ia-dots span:nth-child(2) { animation-delay: 0.2s; }
.loader-ia-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes dot-bounce {
  0%, 80%, 100% { transform: translateY(0); opacity: 0.5; }
  40%           { transform: translateY(-8px); opacity: 1; }
}

.loader-ia-enter-active, .loader-ia-leave-active { transition: opacity 0.3s ease; }
.loader-ia-enter-from, .loader-ia-leave-to { opacity: 0; }
</style>
