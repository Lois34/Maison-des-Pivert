<template>
  <div class="inventaire-view">
    <div class="container">

      <!-- Barre de recherche -->
      <div class="search-bar">
        <div class="search-input-wrap">
          <svg class="search-ico" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input v-model="recherche" type="text" placeholder="Rechercher un objet…" />
        </div>
        <select v-model="filtreZone">
          <option value="">Tous les lieux</option>
          <option v-for="zone in zonesUniques" :key="zone" :value="zone">
            {{ cap(zone) }}
          </option>
        </select>
        <div class="vue-toggle">
          <button class="btn-vue" :class="{ active: vue === 'liste' }" @click="vue = 'liste'" title="Vue liste">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
          </button>
          <button class="btn-vue" :class="{ active: vue === 'grille' }" @click="vue = 'grille'" title="Vue grille">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>
          </button>
        </div>
      </div>

      <!-- ── Vue zones ───────────────────────────────────────── -->
      <template v-if="modeAffichage === 'zones'">
        <div class="zones-grid">
          <div
            v-for="zone in zonesUniques"
            :key="zone"
            class="zone-card"
            @click="filtrerParZone(zone)"
          >
            <div class="zone-card-visual">
              <img v-if="lieuxPhotos[zone + '|']" :src="lieuxPhotos[zone + '|']" class="zone-img" />
              <img v-else-if="premiereImageZone(zone)" :src="premiereImageZone(zone)" class="zone-img" />
              <span v-else class="zone-emoji">{{ iconeZone(zone) }}</span>
            </div>
            <div class="zone-card-body">
              <span class="zone-name">{{ cap(zone) }}</span>
              <span class="zone-badge">{{ countZone(zone) }}</span>
            </div>
            <button class="zone-photo-btn" @click.stop="demanderPhotoLieu(zone, '')">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
        </div>
      </template>

      <!-- ── Vue sous-zones ──────────────────────────────────── -->
      <template v-else-if="modeAffichage === 'sous-zones'">
        <button class="btn-retour" @click="filtrerParZone('')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          Retour aux zones
        </button>
        <div class="zones-grid">
          <div class="zone-card zone-card--all" @click="filtrerParSousLieu('__all__')">
            <div class="zone-card-visual"><span class="zone-emoji">📋</span></div>
            <div class="zone-card-body">
              <span class="zone-name">Tout voir</span>
              <span class="zone-badge">{{ countZone(filtreZone) }}</span>
            </div>
          </div>
          <div
            v-for="sl in sousLieuxUniques"
            :key="sl"
            class="zone-card"
            @click="filtrerParSousLieu(sl)"
          >
            <div class="zone-card-visual">
              <img v-if="lieuxPhotos[filtreZone + '|' + sl]" :src="lieuxPhotos[filtreZone + '|' + sl]" class="zone-img" />
              <span v-else class="zone-emoji">{{ iconeSousLieu(sl) }}</span>
            </div>
            <div class="zone-card-body">
              <span class="zone-name">{{ sl }}</span>
              <span class="zone-badge">{{ countSousLieu(sl) }}</span>
            </div>
            <button class="zone-photo-btn" @click.stop="demanderPhotoLieu(filtreZone, sl)">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            </button>
          </div>
        </div>
      </template>

      <!-- ── Vue produits ────────────────────────────────────── -->
      <template v-else>
        <button v-if="filtreZone && !recherche" class="btn-retour"
          @click="filtreSousLieu ? filtrerParSousLieu('') : filtrerParZone('')">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5"/><polyline points="12 19 5 12 12 5"/></svg>
          {{ filtreSousLieu ? 'Sous-lieux' : 'Zones' }}
        </button>

        <p v-if="produitsFiltres.length === 0" class="empty-state">
          <span>🌿</span>Aucun objet trouvé
        </p>

        <!-- Grille -->
        <div v-else-if="vue === 'grille'" class="produits-grid">
          <div
            v-for="item in produitsFiltres"
            :key="item.id"
            class="produit-card"
            :class="{ 'produit-card--pressing': longPressId === item.id }"
            @click="ouvrirModif(item)"
            @touchstart.passive="startLongPress(item)"
            @touchend="cancelLongPress"
            @touchmove="cancelLongPress"
            @mousedown="startLongPress(item)"
            @mouseup="cancelLongPress"
            @mouseleave="cancelLongPress"
          >
            <div class="produit-card-photo">
              <img v-if="item.image_url" :src="item.image_url" loading="lazy" :alt="item.nom" />
              <div v-else class="produit-card-nophoto">
                <span>📦</span>
              </div>
              <span v-if="badgeItem(item)" class="produit-badge" :class="'produit-badge--' + badgeItem(item).cls">
                {{ badgeItem(item).label }}
              </span>
            </div>
            <div class="produit-card-foot">
              <span class="produit-nom">{{ item.nom }}</span>
              <button class="produit-del-btn" @click.stop="supprimer(item.id, item.nom)" aria-label="Supprimer">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4h6v2"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Liste -->
        <div v-else class="produits-list">
          <div
            v-for="item in produitsFiltres"
            :key="item.id"
            class="list-item"
            @click="ouvrirModif(item)"
          >
            <div class="list-item-thumb">
              <img v-if="item.image_url" :src="item.image_url" loading="lazy" :alt="item.nom" />
              <span v-else>📦</span>
            </div>
            <div class="list-item-body">
              <p class="list-item-nom">{{ item.nom }}</p>
              <p class="list-item-loc">{{ cap(item.lieu) }}{{ item.sous_lieu ? ` › ${item.sous_lieu}` : '' }}</p>
              <div class="list-item-meta">
                <span class="qty-pill">×{{ item.quantite || 1 }}</span>
                <span v-if="item.date_peremption" class="date-txt">{{ formatDate(item.date_peremption) }}</span>
                <span v-if="badgeItem(item)" class="exp-badge" :class="'exp-badge--' + badgeItem(item).cls">
                  {{ badgeItem(item).label }}
                </span>
              </div>
            </div>
            <button class="list-del-btn" @click.stop="supprimer(item.id, item.nom)" aria-label="Supprimer">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><polyline points="3,6 5,6 21,6"/><path d="M19,6l-1,14H6L5,6"/><path d="M10,11v6"/><path d="M14,11v6"/><path d="M9,6V4h6v2"/></svg>
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- FAB -->
    <button class="fab" @click="nouveauProduit" aria-label="Ajouter un objet">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
    </button>

    <!-- Input caché photo lieu -->
    <input ref="photoLieuInputRef" type="file" accept="image/*" capture="environment"
      style="display:none" @change="uploaderPhotoLieu" />

    <!-- ── Modal ajout / modification ────────────────────────── -->
    <Teleport to="body">
      <Transition name="modal">
        <div v-if="modalOuvert" class="modal-overlay" @click.self="fermerModal">
          <div class="modal-sheet">
            <div class="modal-handle" />
            <div class="modal-head">
              <h2 class="modal-title">{{ form.id ? "Modifier l'objet" : "Nouvel objet" }}</h2>
              <button class="modal-close" @click="fermerModal">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
            </div>

            <div class="modal-body">
              <div class="field">
                <label>Nom de l'objet</label>
                <div class="field-row">
                  <input v-model="form.nom" type="text" placeholder="Ex : Perceuse" list="list-noms" />
                  <datalist id="list-noms"><option v-for="n in nomsSet" :key="n" :value="n" /></datalist>
                  <button type="button" class="btn-ia" @click="iaPhotoNomRef.click()">✨</button>
                  <input ref="iaPhotoNomRef" type="file" accept="image/*" capture="environment" style="display:none" @change="suggererNomAvecIA" />
                </div>
              </div>

              <div class="field">
                <label>Lieu principal</label>
                <input v-model="form.lieu" type="text" placeholder="Ex : Garage" list="list-lieux" />
                <datalist id="list-lieux"><option v-for="l in zonesUniques" :key="l" :value="cap(l)" /></datalist>
              </div>

              <div class="field">
                <label>Sous-lieu <span class="opt">optionnel</span></label>
                <input v-model="form.sous_lieu" type="text" placeholder="Ex : Étagère du haut" list="list-sous-lieux" />
                <datalist id="list-sous-lieux"><option v-for="sl in sousLieuxSet" :key="sl" :value="sl" /></datalist>
              </div>

              <div class="field-row field-row--half">
                <div class="field">
                  <label>Quantité</label>
                  <input v-model.number="form.quantite" type="number" min="1" />
                </div>
                <div class="field">
                  <label>Péremption <span class="opt">optionnel</span></label>
                  <div class="field-row">
                    <input v-model="form.date_peremption" type="date" style="flex:1" />
                    <button type="button" class="btn-ia" @click="iaPhotoDateRef.click()">✨</button>
                    <input ref="iaPhotoDateRef" type="file" accept="image/*" capture="environment" style="display:none" @change="lireDatePeremptionIA" />
                  </div>
                </div>
              </div>

              <div class="field">
                <label>Photo <span class="opt">optionnel</span></label>
                <div class="photo-upload" @click="photoInputRef.click()">
                  <input ref="photoInputRef" type="file" accept="image/*" capture="environment" style="display:none" @change="majNomFichier" />
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
                  <span>{{ photoLabel }}</span>
                </div>
              </div>

              <button v-if="form.id" class="btn-courses" @click="ajouterDepuisInventaire">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6"/></svg>
                Ajouter à la liste de courses
              </button>
            </div>

            <div class="modal-actions">
              <button v-if="form.id" class="btn-danger" @click="supprimerDepuisModal">Supprimer</button>
              <button class="btn-ghost" @click="fermerModal">Annuler</button>
              <button class="btn-primary" :disabled="saving" @click="sauvegarder">
                {{ saving ? '⏳' : (form.id ? 'Mettre à jour' : 'Ajouter') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Loader IA -->
    <Teleport to="body">
      <Transition name="fade">
        <div v-if="iaLoading" class="ia-loader">
          <div class="ia-loader-card">
            <div class="ia-scan-ring" />
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--moss)" stroke-width="1.5" stroke-linecap="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/><circle cx="12" cy="13" r="4"/></svg>
            <p>Analyse en cours…</p>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast -->
    <Transition name="toast">
      <div v-if="toastVisible" class="toast">{{ toastMsg }}</div>
    </Transition>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../services/supabase.js'

const emit = defineEmits(['update-count'])

// ── State ─────────────────────────────────────────────────────────────────────
const inventaire = ref([])
const lieuxPhotos = ref({})
const recherche = ref('')
const filtreZone = ref('')
const filtreSousLieu = ref('')
const vue = ref('grille')
const modalOuvert = ref(false)
const saving = ref(false)
const iaLoading = ref(false)
const toastMsg = ref('')
const toastVisible = ref(false)
const photoFichier = ref(null)
const photoLabel = ref('📷 Prendre ou choisir une photo')
const longPressId = ref(null)

const photoLieuInputRef = ref(null)
const photoInputRef = ref(null)
const iaPhotoNomRef = ref(null)
const iaPhotoDateRef = ref(null)
let photoLieuCourant = { lieu: '', souslieu: '' }
let longPressTimer = null
let longPressTriggered = false

const form = ref({ id: null, nom: '', lieu: '', sous_lieu: '', date_peremption: '', quantite: 1 })

// ── Computed ──────────────────────────────────────────────────────────────────
const zonesUniques = computed(() =>
  [...new Set(inventaire.value.map(i => i.lieu.toUpperCase()))].sort()
)
const nomsSet = computed(() => [...new Set(inventaire.value.map(i => i.nom))])
const sousLieuxSet = computed(() => [...new Set(inventaire.value.filter(i => i.sous_lieu).map(i => i.sous_lieu))])

const sousLieuxUniques = computed(() => {
  if (!filtreZone.value) return []
  return [...new Set(
    inventaire.value
      .filter(i => i.lieu.toUpperCase() === filtreZone.value && i.sous_lieu)
      .map(i => i.sous_lieu)
  )].sort()
})

const modeAffichage = computed(() => {
  if (recherche.value) return 'produits'
  if (!filtreZone.value) return 'zones'
  if (!filtreSousLieu.value && sousLieuxUniques.value.length > 0) return 'sous-zones'
  return 'produits'
})

const produitsFiltres = computed(() => {
  const norm = t => t.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  let data = inventaire.value
  if (recherche.value) data = data.filter(i => norm(i.nom).includes(norm(recherche.value)))
  if (filtreZone.value) data = data.filter(i => i.lieu.toUpperCase() === filtreZone.value)
  if (filtreSousLieu.value && filtreSousLieu.value !== '__all__')
    data = data.filter(i => i.sous_lieu?.toLowerCase() === filtreSousLieu.value.toLowerCase())
  return data
})

// ── Helpers ───────────────────────────────────────────────────────────────────
const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : ''

function countZone(zone) {
  return inventaire.value.filter(i => i.lieu.toUpperCase() === zone.toUpperCase()).length
}
function countSousLieu(sl) {
  return inventaire.value.filter(i => i.lieu.toUpperCase() === filtreZone.value && i.sous_lieu === sl).length
}
function premiereImageZone(zone) {
  return inventaire.value.find(i => i.lieu.toUpperCase() === zone && i.image_url)?.image_url || null
}
function iconeZone(zone) {
  const l = zone.toLowerCase()
  if (l.includes('cuisine')) return '🍳'
  if (l.includes('chambre')) return '🛏️'
  if (l.includes('garage')) return '🚗'
  if (l.includes('frigo') || l.includes('réfrigérateur')) return '❄️'
  if (l.includes('salle de bain') || l.includes('bain')) return '🛁'
  if (l.includes('salon')) return '🛋️'
  if (l.includes('cave')) return '🍷'
  if (l.includes('congélateur')) return '🧊'
  if (l.includes('jardin')) return '🌳'
  return '📦'
}
function iconeSousLieu(sl) {
  const l = sl.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (l.includes('frigo') || l.includes('refrigerateur')) return '❄️'
  if (l.includes('congelateur')) return '🧊'
  if (l.includes('placard')) return '🚪'
  if (l.includes('tiroir')) return '🗂️'
  if (l.includes('etagere')) return '📚'
  if (l.includes('cave')) return '🍷'
  if (l.includes('garde')) return '🥫'
  return '📦'
}
function badgeItem(item) {
  if (!item.date_peremption) return null
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const diff = Math.round((new Date(item.date_peremption) - today) / 86400000)
  if (diff < 0) return { label: 'Expiré', cls: 'danger' }
  if (diff <= 30) return { label: `J-${diff}`, cls: 'warning' }
  return null
}
function formatDate(d) {
  return d.split('-').reverse().join('/')
}
function showToast(msg) {
  toastMsg.value = msg
  toastVisible.value = true
  setTimeout(() => { toastVisible.value = false }, 3000)
}

// ── Data ──────────────────────────────────────────────────────────────────────
async function chargerDonnees() {
  const { data } = await supabase.from('inventaire').select('*').order('nom', { ascending: true })
  inventaire.value = data || []
  emit('update-count', inventaire.value.length)
}
async function chargerLieuxPhotos() {
  const { data } = await supabase.from('lieux_photos').select('lieu, sous_lieu, photo_url')
  const map = {}
  if (data) data.forEach(r => { map[r.lieu.toUpperCase() + '|' + (r.sous_lieu || '')] = r.photo_url })
  lieuxPhotos.value = map
}

// ── Navigation ────────────────────────────────────────────────────────────────
function filtrerParZone(zone) { filtreZone.value = zone; filtreSousLieu.value = '' }
function filtrerParSousLieu(sl) { filtreSousLieu.value = sl }

// ── Modal ─────────────────────────────────────────────────────────────────────
function nouveauProduit() {
  const lieu = filtreZone.value ? cap(filtreZone.value) : ''
  const sous = filtreSousLieu.value && filtreSousLieu.value !== '__all__' ? filtreSousLieu.value : ''
  form.value = { id: null, nom: '', lieu, sous_lieu: sous, date_peremption: '', quantite: 1 }
  photoFichier.value = null
  photoLabel.value = '📷 Prendre ou choisir une photo'
  modalOuvert.value = true
}
function ouvrirModif(item) {
  if (longPressTriggered) { longPressTriggered = false; return }
  form.value = { id: item.id, nom: item.nom, lieu: item.lieu, sous_lieu: item.sous_lieu || '', date_peremption: item.date_peremption || '', quantite: item.quantite || 1 }
  photoFichier.value = null
  photoLabel.value = '📷 Prendre ou remplacer la photo'
  modalOuvert.value = true
}
function fermerModal() { modalOuvert.value = false }
function majNomFichier(e) {
  const file = e.target.files[0]
  if (file) { photoFichier.value = file; photoLabel.value = '✅ ' + file.name }
}

// ── Save / Delete ─────────────────────────────────────────────────────────────
async function sauvegarder() {
  if (!form.value.nom || !form.value.lieu) { showToast('⚠️ Nom et lieu obligatoires'); return }
  saving.value = true
  try {
    let imageUrl = null
    if (photoFichier.value) {
      const compressed = await compresserImage(photoFichier.value, 800, 0.75)
      const name = `${Date.now()}.jpg`
      await supabase.storage.from('photos').upload(name, compressed, { contentType: 'image/jpeg' })
      imageUrl = supabase.storage.from('photos').getPublicUrl(name).data.publicUrl
    }
    const donnees = { nom: form.value.nom, lieu: form.value.lieu, sous_lieu: form.value.sous_lieu, date_peremption: form.value.date_peremption || null, quantite: form.value.quantite || 1 }
    if (imageUrl) donnees.image_url = imageUrl
    if (form.value.id) {
      await supabase.from('inventaire').update(donnees).eq('id', form.value.id)
      showToast('✅ Objet modifié')
    } else {
      await supabase.from('inventaire').insert([donnees])
      showToast('✅ Objet ajouté')
    }
    fermerModal()
    await chargerDonnees()
  } catch (e) {
    showToast('❌ ' + e.message)
  } finally {
    saving.value = false
  }
}
async function supprimer(id, nom) {
  if (!confirm(`Supprimer "${nom}" ?`)) return
  try {
    await supabase.from('inventaire').delete().eq('id', id)
    showToast('🗑️ Supprimé')
    await chargerDonnees()
  } catch { showToast('❌ Erreur lors de la suppression') }
}
async function supprimerDepuisModal() { fermerModal(); await supprimer(form.value.id, form.value.nom) }
async function ajouterDepuisInventaire() {
  if (!form.value.nom) return
  await supabase.from('liste_courses').insert([{ nom: form.value.nom, quantite: 1 }])
  showToast('🛒 Ajouté aux courses')
}

// ── Long press ────────────────────────────────────────────────────────────────
function startLongPress(item) {
  longPressTriggered = false; longPressId.value = item.id
  longPressTimer = setTimeout(() => {
    longPressTriggered = true; longPressId.value = null
    if (navigator.vibrate) navigator.vibrate(60)
    supprimer(item.id, item.nom)
  }, 600)
}
function cancelLongPress() { clearTimeout(longPressTimer); longPressId.value = null }

// ── Photos de lieux ───────────────────────────────────────────────────────────
function demanderPhotoLieu(lieu, souslieu) {
  photoLieuCourant = { lieu, souslieu }
  photoLieuInputRef.value.value = ''
  photoLieuInputRef.value.click()
}
async function uploaderPhotoLieu(e) {
  const file = e.target.files[0]; if (!file) return
  const { lieu, souslieu } = photoLieuCourant
  const compressed = await compresserImage(file, 600, 0.8)
  const name = `lieu_${Date.now()}.jpg`
  await supabase.storage.from('photos').upload(name, compressed, { contentType: 'image/jpeg' })
  const url = supabase.storage.from('photos').getPublicUrl(name).data.publicUrl
  await supabase.from('lieux_photos').upsert([{ lieu: lieu.toUpperCase(), sous_lieu: souslieu || '', photo_url: url }], { onConflict: 'lieu,sous_lieu' })
  lieuxPhotos.value = { ...lieuxPhotos.value, [lieu.toUpperCase() + '|' + (souslieu || '')]: url }
  showToast('📷 Photo mise à jour')
}

// ── IA Vision ─────────────────────────────────────────────────────────────────
async function fileToBase64(file) {
  return new Promise(resolve => {
    const img = new Image(); const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(1, 1024 / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio); canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => { const r = new FileReader(); r.onload = e => resolve(e.target.result.split(',')[1]); r.readAsDataURL(blob) }, 'image/jpeg', 0.85)
    }
    img.src = url
  })
}
async function appelVisionIA(base64, prompt) {
  const MODELS = ['meta-llama/llama-4-scout', 'meta-llama/llama-4-maverick', 'google/gemini-2.5-flash-preview']
  for (const model of MODELS) {
    try {
      const res = await fetch('/.netlify/functions/ia-proxy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model, messages: [{ role: 'user', content: [{ type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64}` } }, { type: 'text', text: prompt }] }] }) })
      const body = await res.json()
      if (res.ok && body.choices?.[0]?.message?.content) return body.choices[0].message.content
    } catch {}
  }
  return null
}
async function suggererNomAvecIA(e) {
  const file = e.target.files[0]; if (!file) return
  iaLoading.value = true
  try {
    const base64 = await fileToBase64(file)
    const r = await appelVisionIA(base64, 'Quel est le nom de ce produit ou objet ? UN seul mot ou nom court en français.')
    if (r) form.value.nom = r.trim()
    photoFichier.value = file
    photoLabel.value = '✅ ' + file.name
  } finally { iaLoading.value = false }
}
async function lireDatePeremptionIA(e) {
  const file = e.target.files[0]; if (!file) return
  iaLoading.value = true
  try {
    const base64 = await fileToBase64(file)
    const r = await appelVisionIA(base64, 'Lis la date de péremption. Réponds UNIQUEMENT au format YYYY-MM-DD. Si introuvable : "non trouvée".')
    if (r && r.trim() !== 'non trouvée') { const d = r.trim(); if (/^\d{4}-\d{2}-\d{2}$/.test(d)) form.value.date_peremption = d }
  } finally { iaLoading.value = false }
}
async function compresserImage(file, maxWidth = 800, qualite = 0.75) {
  return new Promise(resolve => {
    const img = new Image(); const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const ratio = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * ratio); canvas.height = Math.round(img.height * ratio)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => resolve(blob), 'image/jpeg', qualite)
    }
    img.src = url
  })
}

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(() => Promise.all([chargerDonnees(), chargerLieuxPhotos()]))
</script>

<style scoped>
/* ── Layout ────────────────────────────────────────────────── */
.inventaire-view {
  min-height: 100vh;
}

.container {
  max-width: 600px;
  margin: 0 auto;
  padding: 20px 16px 32px;
}

.empty-state {
  text-align: center;
  color: var(--stone-light);
  font-style: italic;
  padding: 60px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 1.1rem;
}
.empty-state span { font-size: 2.5rem; }

/* ── Search bar ────────────────────────────────────────────── */
.search-bar {
  background: var(--cream);
  padding: 10px;
  border-radius: var(--r-xl);
  box-shadow: var(--shadow-md);
  margin-bottom: 24px;
  display: flex;
  gap: 8px;
  align-items: center;
  border: 1px solid rgba(42, 77, 32, 0.08);
}

.search-input-wrap {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--parchment);
  border-radius: var(--r-lg);
  padding: 10px 14px;
}

.search-ico { color: var(--stone-light); flex-shrink: 0; }

.search-input-wrap input {
  flex: 1;
  border: none;
  background: transparent;
  font-family: var(--font-ui);
  font-size: 0.95rem;
  color: var(--ink);
  outline: none;
}

.search-input-wrap input::placeholder { color: var(--stone-light); }

.search-bar select {
  padding: 10px 14px;
  border: none;
  border-radius: var(--r-lg);
  background: var(--parchment);
  font-family: var(--font-ui);
  font-size: 0.85rem;
  color: var(--stone);
  outline: none;
  cursor: pointer;
  max-width: 130px;
}

.vue-toggle { display: flex; gap: 4px; }

.btn-vue {
  background: transparent;
  border: none;
  width: 34px; height: 34px;
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--stone-light);
  transition: all 0.2s;
}
.btn-vue.active { background: var(--sage-pale); color: var(--moss); }

/* ── Zone cards ────────────────────────────────────────────── */
.zones-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(148px, 1fr));
  gap: 14px;
}

.zone-card {
  background: var(--cream);
  border-radius: var(--r-lg);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  border: 1px solid rgba(42, 77, 32, 0.07);
  transition: transform 0.22s, box-shadow 0.22s, border-color 0.22s;
  position: relative;
}

.zone-card:hover {
  transform: translateY(-4px);
  box-shadow: var(--shadow-md);
  border-color: rgba(42, 77, 32, 0.18);
}

.zone-card-visual {
  height: 96px;
  background: linear-gradient(145deg, var(--sage-pale) 0%, var(--sand-light) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.zone-card--all .zone-card-visual {
  background: linear-gradient(145deg, var(--sand) 0%, var(--parchment) 100%);
}

.zone-img { width: 100%; height: 100%; object-fit: cover; }
.zone-emoji { font-size: 2.6rem; }

.zone-card-body {
  padding: 10px 12px 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.zone-name {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 0.95rem;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.zone-badge {
  background: var(--moss);
  color: white;
  font-family: var(--font-ui);
  font-size: 0.7rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: var(--r-pill);
  flex-shrink: 0;
}

.zone-photo-btn {
  position: absolute;
  top: 8px; right: 8px;
  background: rgba(28, 26, 18, 0.55);
  border: none;
  border-radius: 50%;
  width: 28px; height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: white;
  opacity: 0;
  transition: opacity 0.15s;
  backdrop-filter: blur(4px);
}
.zone-card:hover .zone-photo-btn { opacity: 1; }
@media (hover: none) { .zone-photo-btn { opacity: 0.7; } }

/* ── Btn retour ────────────────────────────────────────────── */
.btn-retour {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--cream);
  color: var(--stone);
  font-family: var(--font-ui);
  font-size: 0.85rem;
  font-weight: 700;
  padding: 8px 16px;
  border-radius: var(--r-pill);
  border: 1px solid var(--sand);
  cursor: pointer;
  margin-bottom: 18px;
  box-shadow: var(--shadow-xs);
  transition: background 0.2s;
}
.btn-retour:hover { background: var(--sand-light); }

/* ── Product grid ──────────────────────────────────────────── */
.produits-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 14px;
}
@media (min-width: 480px) { .produits-grid { grid-template-columns: repeat(3, 1fr); } }
@media (min-width: 700px) { .produits-grid { grid-template-columns: repeat(4, 1fr); } }

.produit-card {
  background: var(--cream);
  border-radius: var(--r-md);
  overflow: hidden;
  cursor: pointer;
  box-shadow: var(--shadow-sm);
  border: 1px solid rgba(42, 77, 32, 0.07);
  transition: transform 0.22s, box-shadow 0.22s;
  user-select: none;
  -webkit-user-select: none;
}
.produit-card:hover { transform: translateY(-3px) scale(1.02); box-shadow: var(--shadow-md); }
.produit-card--pressing { opacity: 0.55; transform: scale(0.94); outline: 2px solid var(--danger); }

.produit-card-photo {
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}
.produit-card-photo img { width: 100%; height: 100%; object-fit: cover; display: block; }

.produit-card-nophoto {
  width: 100%; height: 100%;
  background: linear-gradient(145deg, var(--sage-pale) 0%, var(--sand) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
}

.produit-badge {
  position: absolute;
  top: 8px; left: 8px;
  font-family: var(--font-ui);
  font-size: 0.65rem;
  font-weight: 800;
  padding: 3px 8px;
  border-radius: var(--r-pill);
  color: white;
  letter-spacing: 0.03em;
  backdrop-filter: blur(6px);
}
.produit-badge--danger { background: rgba(184, 60, 60, 0.9); }
.produit-badge--warning { background: rgba(196, 123, 42, 0.9); }

.produit-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  gap: 4px;
}

.produit-nom {
  font-family: var(--font-display);
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.produit-del-btn {
  flex-shrink: 0;
  width: 24px; height: 24px;
  border-radius: 50%;
  border: none;
  background: var(--danger-pale);
  color: var(--danger);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.18s;
}
.produit-card:hover .produit-del-btn { opacity: 1; }
@media (hover: none) { .produit-del-btn { opacity: 0.7; } }

/* ── Product list ──────────────────────────────────────────── */
.produits-list { display: flex; flex-direction: column; gap: 10px; }

.list-item {
  background: var(--cream);
  border-radius: var(--r-md);
  border: 1px solid rgba(42, 77, 32, 0.07);
  box-shadow: var(--shadow-xs);
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}
.list-item:hover { transform: translateY(-2px); box-shadow: var(--shadow-sm); }

.list-item-thumb {
  width: 52px; height: 52px;
  border-radius: var(--r-sm);
  overflow: hidden;
  flex-shrink: 0;
  background: linear-gradient(145deg, var(--sage-pale), var(--sand));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}
.list-item-thumb img { width: 100%; height: 100%; object-fit: cover; }

.list-item-body { flex: 1; min-width: 0; }
.list-item-nom { font-family: var(--font-display); font-weight: 500; font-size: 1rem; color: var(--ink); margin-bottom: 2px; }
.list-item-loc { font-size: 0.8rem; color: var(--stone); margin-bottom: 4px; }

.list-item-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.qty-pill {
  font-size: 0.72rem; font-weight: 700;
  background: var(--sand-light); color: var(--stone);
  padding: 1px 8px; border-radius: var(--r-pill);
}
.date-txt { font-size: 0.72rem; color: var(--warning); }
.exp-badge { font-size: 0.68rem; font-weight: 800; padding: 2px 8px; border-radius: var(--r-pill); color: white; }
.exp-badge--danger { background: rgba(184,60,60,0.88); }
.exp-badge--warning { background: rgba(196,123,42,0.88); }

.list-del-btn {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border-radius: var(--r-sm);
  border: 1px solid rgba(184,60,60,0.15);
  background: var(--danger-pale);
  color: var(--danger);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; opacity: 0.5; transition: opacity 0.2s;
}
.list-item:hover .list-del-btn { opacity: 1; }

/* ── FAB ───────────────────────────────────────────────────── */
.fab {
  position: fixed;
  bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  right: 22px;
  width: 56px; height: 56px;
  border-radius: var(--r-pill);
  background: var(--moss);
  color: white;
  border: none;
  box-shadow: var(--shadow-fab);
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
  z-index: 200;
  transition: transform 0.2s, background 0.2s;
}
.fab:hover { background: var(--moss-hover); transform: scale(1.08); }
.fab:active { transform: scale(0.95); }

/* ── Modal ─────────────────────────────────────────────────── */
.modal-overlay {
  position: fixed; inset: 0;
  background: rgba(28, 26, 18, 0.55);
  display: flex; align-items: flex-end; justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-sheet {
  background: var(--cream);
  border-radius: var(--r-xl) var(--r-xl) 0 0;
  width: 100%; max-width: 560px;
  max-height: 92svh;
  display: flex; flex-direction: column;
  overflow: hidden;
}

.modal-handle {
  width: 36px; height: 4px;
  background: var(--sand);
  border-radius: var(--r-pill);
  margin: 12px auto 0;
  flex-shrink: 0;
}

.modal-head {
  display: flex; align-items: center; justify-content: space-between;
  padding: 16px 22px 0;
  flex-shrink: 0;
}

.modal-title {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 1.25rem;
  color: var(--ink);
}

.modal-close {
  width: 34px; height: 34px;
  border-radius: 50%;
  background: var(--parchment);
  border: 1px solid var(--sand);
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; color: var(--stone);
}

.modal-body {
  padding: 18px 22px;
  overflow-y: auto;
  flex: 1;
  display: flex; flex-direction: column; gap: 14px;
}

.field {
  display: flex; flex-direction: column; gap: 7px;
}
.field label {
  font-size: 0.8rem; font-weight: 700;
  color: var(--stone); letter-spacing: 0.04em; text-transform: uppercase;
}
.opt { text-transform: none; font-weight: 500; color: var(--stone-light); }

.field input {
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid var(--sand);
  border-radius: var(--r-md);
  background: var(--parchment);
  font-family: var(--font-ui); font-size: 0.95rem; color: var(--ink);
  outline: none;
  transition: border-color 0.2s;
}
.field input:focus { border-color: var(--moss); }

.field-row {
  display: flex; gap: 8px; align-items: center;
}
.field-row input { flex: 1; }

.field-row--half { flex-direction: row; gap: 14px; }
.field-row--half .field { flex: 1; }

.btn-ia {
  flex-shrink: 0;
  background: var(--moss);
  color: white;
  border: none;
  border-radius: var(--r-sm);
  padding: 10px 12px;
  font-size: 0.95rem;
  cursor: pointer;
  height: 44px;
}

.photo-upload {
  display: flex; align-items: center; gap: 12px;
  border: 1.5px dashed var(--sand);
  border-radius: var(--r-md);
  padding: 14px;
  cursor: pointer; color: var(--stone);
  transition: border-color 0.2s;
  font-size: 0.9rem;
}
.photo-upload:hover { border-color: var(--moss); color: var(--moss); }

.btn-courses {
  width: 100%;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  background: transparent;
  border: 1.5px solid var(--moss);
  color: var(--moss);
  border-radius: var(--r-md);
  padding: 11px;
  font-family: var(--font-ui); font-size: 0.9rem; font-weight: 700;
  cursor: pointer;
  transition: background 0.2s;
}
.btn-courses:hover { background: var(--sage-pale); }

.modal-actions {
  display: flex; gap: 10px;
  padding: 14px 22px calc(14px + env(safe-area-inset-bottom, 0px));
  border-top: 1px solid var(--sand);
  flex-shrink: 0;
}
.btn-primary {
  flex: 2; padding: 14px;
  background: var(--moss); color: white;
  border: none; border-radius: var(--r-md);
  font-family: var(--font-ui); font-size: 1rem; font-weight: 700;
  cursor: pointer;
}
.btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }
.btn-ghost {
  flex: 1; padding: 14px;
  background: var(--parchment); color: var(--stone);
  border: 1px solid var(--sand); border-radius: var(--r-md);
  font-family: var(--font-ui); font-size: 1rem; font-weight: 600;
  cursor: pointer;
}
.btn-danger {
  padding: 14px 18px;
  background: rgba(184,60,60,0.1); color: var(--danger);
  border: 1px solid rgba(184,60,60,0.2); border-radius: var(--r-md);
  font-family: var(--font-ui); font-size: 0.9rem; font-weight: 700;
  cursor: pointer;
}

/* ── IA Loader ─────────────────────────────────────────────── */
.ia-loader {
  position: fixed; inset: 0;
  background: rgba(28, 26, 18, 0.6);
  display: flex; align-items: center; justify-content: center;
  z-index: 2000; backdrop-filter: blur(6px);
}
.ia-loader-card {
  background: var(--cream);
  border-radius: var(--r-xl);
  padding: 36px 44px;
  text-align: center;
  display: flex; flex-direction: column; align-items: center; gap: 14px;
  box-shadow: var(--shadow-lg);
}
.ia-scan-ring {
  width: 60px; height: 60px;
  border-radius: 50%;
  border: 3px solid var(--sage-pale);
  border-top-color: var(--moss);
  animation: spin 0.9s linear infinite;
  position: absolute;
}
.ia-loader-card svg { position: relative; z-index: 1; }
.ia-loader-card p { color: var(--stone); font-weight: 600; font-size: 0.95rem; }

@keyframes spin { to { transform: rotate(360deg); } }

/* ── Toast ─────────────────────────────────────────────────── */
.toast {
  position: fixed;
  bottom: calc(90px + env(safe-area-inset-bottom, 0px));
  left: 50%; transform: translateX(-50%);
  background: var(--ink);
  color: rgba(255,255,255,0.92);
  padding: 11px 22px;
  border-radius: var(--r-pill);
  font-size: 0.88rem; font-weight: 600;
  z-index: 3000; pointer-events: none;
  white-space: nowrap;
}

/* ── Transitions ───────────────────────────────────────────── */
.modal-enter-active { transition: opacity 0.25s ease; }
.modal-enter-active .modal-sheet { transition: transform 0.28s cubic-bezier(0.34, 1.1, 0.64, 1); }
.modal-leave-active { transition: opacity 0.2s ease; }
.modal-leave-active .modal-sheet { transition: transform 0.2s ease-in; }
.modal-enter-from { opacity: 0; }
.modal-enter-from .modal-sheet { transform: translateY(100%); }
.modal-leave-to { opacity: 0; }
.modal-leave-to .modal-sheet { transform: translateY(60px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

.toast-enter-active { transition: opacity 0.2s, transform 0.25s cubic-bezier(0.34, 1.2, 0.64, 1); }
.toast-leave-active { transition: opacity 0.18s, transform 0.18s ease-in; }
.toast-enter-from { opacity: 0; transform: translateX(-50%) translateY(12px); }
.toast-leave-to { opacity: 0; transform: translateX(-50%) translateY(8px); }
</style>
