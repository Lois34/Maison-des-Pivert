<template>
  <Teleport to="body">
    <div v-if="ouvert" class="np-overlay" @click="fermer" />
    <div class="np-panel" :class="{ open: ouvert }">
      <div class="np-header">
        <h3>🔔 Notifications de péremption</h3>
        <button class="np-close" @click="fermer">✕</button>
      </div>

      <div class="np-body">
        <!-- Statut permission -->
        <div class="np-status">
          <span class="np-dot" :class="dotClass" />
          <span class="np-status-text">{{ statutText }}</span>
        </div>

        <!-- Seuil -->
        <div class="np-seuil-row">
          <label class="np-seuil-label">Alerter avant</label>
          <input
            v-model.number="seuil"
            type="number"
            min="1"
            max="90"
            class="np-seuil-input"
            @change="sauvegarderSeuil"
          />
          <span class="np-seuil-unit">jours</span>
        </div>

        <!-- Boutons d'action -->
        <button
          class="np-btn-activer"
          :disabled="permission === 'denied' || loading"
          @click="activerNotifications"
        >
          <span v-if="loading">⏳ En cours…</span>
          <span v-else-if="permission === 'granted'">✓ Activées — Réabonner</span>
          <span v-else-if="permission === 'denied'">Bloquées par le navigateur</span>
          <span v-else>🔔 Activer les notifications</span>
        </button>

        <button class="np-btn-check" :disabled="loading" @click="verifierPeremptions">
          Vérifier les péremptions
        </button>

        <!-- Résultats -->
        <template v-if="verifie">
          <div v-if="expires.length === 0 && bientot.length === 0" class="np-empty">
            ✅ Aucun objet à signaler dans les {{ seuil }} prochains jours
          </div>
          <template v-else>
            <div v-if="expires.length">
              <div class="np-section-title">🔴 Expirés</div>
              <div v-for="item in expires" :key="item.id" class="np-item np-item--expire">
                <div class="np-item-name">{{ item.nom }}</div>
                <div class="np-item-date">Expiré le {{ fmtDate(item.date_peremption) }}</div>
              </div>
            </div>
            <div v-if="bientot.length">
              <div class="np-section-title">🟡 Bientôt</div>
              <div v-for="item in bientot" :key="item.id" class="np-item np-item--bientot">
                <div class="np-item-name">{{ item.nom }}</div>
                <div class="np-item-date">J-{{ item.diff }} — {{ fmtDate(item.date_peremption) }}</div>
              </div>
            </div>
          </template>
        </template>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { supabase } from '../services/supabase.js'

const props = defineProps({ ouvert: Boolean })
const emit  = defineEmits(['close'])

const VAPID_PUBLIC = 'BGiwV75qIldzegVA3UlJpovjYZ9mKlSXOjLp9jn9hkuM82ZC1m1Gan1UaeIwAP9mDZCqQaKtJsRdTDboDfRY818'
const SEUIL_KEY    = 'notif_seuil_pivert'

const seuil      = ref(parseInt(localStorage.getItem(SEUIL_KEY) || '7', 10))
const permission = ref(typeof Notification !== 'undefined' ? Notification.permission : 'denied')
const loading    = ref(false)
const verifie    = ref(false)
const expires    = ref([])
const bientot    = ref([])

const dotClass  = computed(() => ({
  'np-dot--granted': permission.value === 'granted',
  'np-dot--denied':  permission.value === 'denied',
}))
const statutText = computed(() => {
  if (!('Notification' in window)) return 'Non supporté par ce navigateur'
  if (permission.value === 'granted') return 'Notifications activées ✓'
  if (permission.value === 'denied')  return 'Bloquées — activez dans les réglages'
  return 'Notifications désactivées'
})

watch(() => props.ouvert, async (val) => {
  if (!val) return
  permission.value = typeof Notification !== 'undefined' ? Notification.permission : 'denied'
  if ('serviceWorker' in navigator) {
    try { await navigator.serviceWorker.register('/sw.js') } catch {}
  }
  if (permission.value === 'granted') verifierPeremptions()
})

function sauvegarderSeuil() {
  if (seuil.value > 0) localStorage.setItem(SEUIL_KEY, seuil.value)
}

function urlBase64ToUint8Array(base64) {
  const padding = '='.repeat((4 - base64.length % 4) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)))
}

async function activerNotifications() {
  if (!('Notification' in window)) return
  loading.value = true
  try {
    const perm = await Notification.requestPermission()
    permission.value = perm
    if (perm !== 'granted') return

    await navigator.serviceWorker.register('/sw.js')
    const sw  = await navigator.serviceWorker.ready
    const sub = await sw.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC)
    })

    const { endpoint, keys } = sub.toJSON()
    let device_id = localStorage.getItem('pivert_device_id')
    if (!device_id) { device_id = crypto.randomUUID(); localStorage.setItem('pivert_device_id', device_id) }
    await supabase.from('push_subscriptions').upsert(
      { endpoint, p256dh: keys.p256dh, auth: keys.auth, device_id },
      { onConflict: 'endpoint' }
    )
    await verifierPeremptions()
  } catch (e) {
    console.error('Push subscription:', e)
  } finally {
    loading.value = false
  }
}

async function verifierPeremptions() {
  loading.value = true
  try {
    const { data } = await supabase
      .from('inventaire')
      .select('id, nom, date_peremption')
      .not('date_peremption', 'is', null)

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    expires.value = []
    bientot.value = []

    ;(data || []).forEach(item => {
      const exp  = new Date(item.date_peremption)
      const diff = Math.round((exp - today) / 86400000)
      if (diff < 0)            expires.value.push({ ...item, diff })
      else if (diff <= seuil.value) bientot.value.push({ ...item, diff })
    })

    bientot.value.sort((a, b) => a.diff - b.diff)
    verifie.value = true
  } finally {
    loading.value = false
  }
}

function fmtDate(d) {
  return new Date(d).toLocaleDateString('fr-FR')
}

function fermer() {
  emit('close')
}
</script>

<style scoped>
.np-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  z-index: 900;
}

.np-panel {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  width: min(340px, 92vw);
  background: var(--cream);
  z-index: 901;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.28s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: -6px 0 32px rgba(0, 0, 0, 0.18);
}
.np-panel.open {
  transform: translateX(0);
}

.np-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: calc(env(safe-area-inset-top, 0px) + 18px) 18px 16px;
  background: linear-gradient(135deg, var(--moss) 0%, #1a3015 100%);
  color: white;
  flex-shrink: 0;
}
.np-header h3 {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}
.np-close {
  background: rgba(255, 255, 255, 0.12);
  border: none;
  color: white;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
}

.np-body {
  flex: 1;
  overflow-y: auto;
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.np-status {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: var(--stone);
}
.np-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--stone-light);
  flex-shrink: 0;
}
.np-dot--granted { background: #48bb78; }
.np-dot--denied  { background: #e53e3e; }

.np-seuil-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.875rem;
  color: var(--ink);
}
.np-seuil-input {
  width: 56px;
  padding: 6px 8px;
  border: 1.5px solid var(--sand);
  border-radius: var(--r-sm);
  background: var(--sand-light);
  color: var(--ink);
  font-size: 0.875rem;
  text-align: center;
}
.np-seuil-label { flex: 1; }

.np-btn-activer {
  width: 100%;
  padding: 11px;
  background: var(--moss);
  color: white;
  border: none;
  border-radius: var(--r-md);
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}
.np-btn-activer:hover:not(:disabled) { background: var(--moss-hover); }
.np-btn-activer:disabled { opacity: 0.5; cursor: not-allowed; }

.np-btn-check {
  width: 100%;
  padding: 10px;
  background: transparent;
  color: var(--moss);
  border: 1.5px solid var(--moss);
  border-radius: var(--r-md);
  font-family: var(--font-ui);
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}
.np-btn-check:hover:not(:disabled) { background: var(--moss); color: white; }
.np-btn-check:disabled { opacity: 0.5; cursor: not-allowed; }

.np-section-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--stone);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  margin: 6px 0 4px;
}

.np-item {
  padding: 10px 12px;
  border-radius: var(--r-sm);
  border-left: 3px solid transparent;
  background: var(--sand-light);
  margin-bottom: 6px;
}
.np-item--expire { border-color: var(--danger); background: var(--danger-pale); }
.np-item--bientot { border-color: var(--warning); background: rgba(196, 123, 42, 0.07); }

.np-item-name {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--ink);
}
.np-item-date {
  font-size: 0.78rem;
  color: var(--stone);
  margin-top: 2px;
}

.np-empty {
  text-align: center;
  color: var(--stone);
  font-size: 0.875rem;
  padding: 20px 0;
}
</style>
