<template>
  <div class="lessive-view">
    <div class="container">

      <!-- Carte principale -->
      <div class="card-main">
        <div class="card-header">
          <span class="card-icon">🧺</span>
          <div>
            <h2 class="card-title">Minuterie heures creuses</h2>
            <p class="card-subtitle">Tarif réduit de 22h à 6h du matin</p>
          </div>
        </div>

        <!-- Horloge -->
        <div class="clock-bloc">
          <span class="clock-label">Il est</span>
          <span class="clock-time">{{ heure }}</span>
        </div>

        <!-- Toggle mode -->
        <div class="mode-toggle">
          <button
            class="mode-btn"
            :class="{ 'mode-btn--active': mode === 'fin' }"
            @click="mode = 'fin'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            Fin programmée
          </button>
          <button
            class="mode-btn"
            :class="{ 'mode-btn--active': mode === 'depart' }"
            @click="mode = 'depart'"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
            Départ différé
          </button>
        </div>

        <!-- Sélecteur de cycle (mode départ différé) -->
        <Transition name="slide-down">
          <div v-if="mode === 'depart'" class="cycle-picker">
            <p class="cycle-label">Durée de mon cycle</p>
            <div class="cycle-options">
              <button
                v-for="c in cycles"
                :key="c.min"
                class="cycle-btn"
                :class="{ 'cycle-btn--active': selectedCycle === c.min }"
                @click="selectedCycle = c.min"
              >{{ c.label }}</button>
            </div>
          </div>
        </Transition>

        <!-- Carte résultat -->
        <div class="result-card" :class="resultCardClass">

          <div v-if="enCreuse" class="creuse-progress">
            <div class="creuse-progress-fill" :style="{ width: progressCreuse + '%' }" />
          </div>

          <!-- Mode fin programmée -->
          <template v-if="mode === 'fin'">
            <p class="result-status">{{ enCreuse ? '✅ Vous êtes en heures creuses' : '💡 Tarif creuses à partir de 22h' }}</p>
            <p class="result-hint">Programmez la <strong>fin</strong> dans</p>
            <div class="result-hours">{{ hFloor }}<span class="result-unit">h</span></div>
            <p class="result-sub">
              Durée exacte&nbsp;: <strong>{{ finDureeStr }}</strong><br />
              <em>{{ finArrondiMsg }}</em>
            </p>
          </template>

          <!-- Mode départ différé — possible -->
          <template v-else-if="departPossible">
            <p class="result-status">{{ enCreuse ? '✅ Vous êtes en heures creuses' : '💡 Tarif creuses à partir de 22h' }}</p>
            <p class="result-hint">Programmez le <strong>départ</strong> dans</p>
            <div class="result-hours">
              {{ departH }}<span class="result-unit">h</span><template v-if="departM > 0"><span class="result-unit-min">{{ String(departM).padStart(2,'0') }}</span></template>
            </div>
            <p class="result-sub">
              Cycle de <strong>{{ cycles.find(c => c.min === selectedCycle).label }}</strong>
              — finira à <strong>6h00 ✓</strong>
            </p>
          </template>

          <!-- Mode départ différé — cycle trop long -->
          <template v-else>
            <p class="result-status">⚠️ Cycle trop long</p>
            <p class="result-hint" style="margin-top:12px">
              Un cycle de <strong>{{ cycles.find(c => c.min === selectedCycle).label }}</strong>
              ne peut pas terminer à 6h en partant maintenant.
            </p>
            <p class="result-sub" style="margin-top:16px">
              <em>Choisissez un cycle plus court, ou lancez la machine maintenant.</em>
            </p>
          </template>
        </div>

        <!-- Timeline 24h -->
        <div class="timeline-24">
          <div class="tl24-track">
            <div class="tl24-zone tl24-zone--creuse" style="left:0%;width:25%" />
            <div class="tl24-zone tl24-zone--pleine"  style="left:25%;width:66.7%" />
            <div class="tl24-zone tl24-zone--creuse" style="left:91.7%;width:8.3%" />
            <!-- Marqueur "départ" en mode départ différé -->
            <Transition name="fade">
              <div
                v-if="mode === 'depart' && departPossible"
                class="tl24-marker tl24-marker--start"
                :style="{ left: positionDepart + '%' }"
              >
                <span class="tl24-marker-label">départ</span>
              </div>
            </Transition>
            <!-- Dot position actuelle -->
            <div class="tl24-dot" :style="{ left: positionJournee + '%' }">
              <span class="tl24-dot-label">{{ heure }}</span>
            </div>
          </div>
          <div class="tl24-labels">
            <span>0h</span>
            <span>6h</span>
            <span style="flex:2.7">12h</span>
            <span>18h</span>
            <span>22h</span>
            <span>24h</span>
          </div>
          <div class="tl24-legend">
            <span class="tl24-legend-dot tl24-legend-dot--creuse" />
            Heures creuses (22h–6h)
            <template v-if="mode === 'depart' && departPossible">
              &nbsp;·&nbsp;
              <span class="tl24-legend-dot tl24-legend-dot--start" />
              Départ prévu
            </template>
          </div>
        </div>
      </div>

      <!-- Info card -->
      <div class="card-info">
        <p class="info-title">Comment ça marche ?</p>

        <Transition name="slide-down" mode="out-in">
          <div v-if="mode === 'fin'" key="info-fin">
            <p class="info-text">
              Votre machine dispose d'une <strong>fin programmée</strong> : vous indiquez
              dans combien d'heures elle doit terminer. Réglez-la sur la valeur affichée
              pour qu'elle s'arrête <strong>au plus près de 6h du matin</strong>.
            </p>
          </div>
          <div v-else key="info-depart">
            <p class="info-text">
              Votre machine dispose d'un <strong>départ différé</strong> : elle attend
              X heures avant de démarrer. Sélectionnez la durée de votre cycle, et
              réglez le départ sur la valeur affichée pour finir <strong>à 6h pile</strong>.
            </p>
          </div>
        </Transition>

        <div class="info-tips">
          <div class="tip">
            <span class="tip-icon">🌙</span>
            <span>Lancez votre machine <strong>avant de dormir</strong></span>
          </div>
          <div class="tip">
            <span class="tip-icon">⚡</span>
            <span>Économies jusqu'à <strong>50%</strong> sur l'électricité</span>
          </div>
          <div class="tip">
            <span class="tip-icon">⏰</span>
            <span>La machine finit juste avant 6h — <strong>linge frais le matin</strong></span>
          </div>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'

const now = ref(new Date())
let timer = null

const mode = ref('fin')
const selectedCycle = ref(120) // 2h par défaut

const cycles = [
  { label: '1h',   min: 60  },
  { label: '1h30', min: 90  },
  { label: '2h',   min: 120 },
  { label: '2h30', min: 150 },
  { label: '3h',   min: 180 },
]

// ── Temps ─────────────────────────────────────────────────────────────────────
const heure = computed(() => {
  const h = now.value.getHours()
  const m = now.value.getMinutes()
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
})

const enCreuse = computed(() => {
  const h = now.value.getHours()
  return h >= 22 || h < 6
})

// Minutes exactes jusqu'au prochain 6h00
const minUntil6 = computed(() => {
  const h = now.value.getHours()
  const m = now.value.getMinutes()
  return h < 6 ? (6 - h) * 60 - m : (24 - h) * 60 - m + 360
})

// ── Mode fin programmée ───────────────────────────────────────────────────────
const hFloor = computed(() => Math.floor(minUntil6.value / 60))
const finMRest = computed(() => minUntil6.value % 60)

const finDureeStr = computed(() =>
  finMRest.value === 0
    ? `${hFloor.value}h pile`
    : `${hFloor.value}h ${finMRest.value} min`
)

const finArrondiMsg = computed(() =>
  finMRest.value > 0
    ? "Arrondi à l'heure inf. — finira entre 5h et 6h ✓"
    : "La machine finira exactement à 6h00 ✓"
)

// ── Mode départ différé ───────────────────────────────────────────────────────
const departDelayMin = computed(() => minUntil6.value - selectedCycle.value)
const departPossible = computed(() => departDelayMin.value >= 0)
const departH = computed(() => Math.floor(departDelayMin.value / 60))
const departM = computed(() => departDelayMin.value % 60)

// ── Timeline ──────────────────────────────────────────────────────────────────
const positionJournee = computed(() => {
  const h = now.value.getHours()
  const m = now.value.getMinutes()
  return Math.round(((h * 60 + m) / 1440) * 100)
})

// Position du marqueur de départ sur la timeline
const positionDepart = computed(() => {
  if (!departPossible.value) return 0
  const totalMinNow = now.value.getHours() * 60 + now.value.getMinutes()
  const departAtMin = (totalMinNow + departDelayMin.value) % 1440
  return Math.round((departAtMin / 1440) * 100)
})

const progressCreuse = computed(() => {
  if (!enCreuse.value) return 0
  const h = now.value.getHours()
  const m = now.value.getMinutes()
  const elapsed = h >= 22 ? (h - 22) * 60 + m : (h + 2) * 60 + m
  return Math.min(100, Math.round((elapsed / 480) * 100))
})

const resultCardClass = computed(() => {
  if (mode.value === 'depart' && !departPossible.value) return 'result-card--warning'
  return enCreuse.value ? 'result-card--creuse' : 'result-card--hors'
})

// ── Init ──────────────────────────────────────────────────────────────────────
onMounted(() => { timer = setInterval(() => { now.value = new Date() }, 10000) })
onUnmounted(() => clearInterval(timer))
</script>

<style scoped>
.lessive-view { min-height: 100vh; }

.container {
  max-width: 480px;
  margin: 0 auto;
  padding: 24px 16px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* ── Carte principale ─────────────────────────────────────── */
.card-main {
  background: var(--cream);
  border-radius: var(--r-xl);
  padding: 28px 22px 24px;
  box-shadow: var(--shadow-md);
  border: 1px solid rgba(42,77,32,0.07);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 24px;
}

.card-icon { font-size: 2.4rem; line-height: 1; }

.card-title {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 1.15rem;
  color: var(--ink);
  margin-bottom: 3px;
}

.card-subtitle {
  font-size: 0.8rem;
  color: var(--stone);
  font-weight: 500;
}

/* ── Horloge ──────────────────────────────────────────────── */
.clock-bloc {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 12px;
  margin-bottom: 20px;
}

.clock-label {
  font-size: 0.85rem;
  color: var(--stone-light);
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.clock-time {
  font-family: var(--font-display);
  font-size: 3.2rem;
  font-weight: 700;
  color: var(--ink);
  letter-spacing: -2px;
  font-variant-numeric: tabular-nums;
  line-height: 1;
}

/* ── Toggle mode ──────────────────────────────────────────── */
.mode-toggle {
  display: flex;
  background: var(--parchment);
  border-radius: var(--r-pill);
  padding: 4px;
  gap: 4px;
  margin-bottom: 18px;
  border: 1px solid var(--sand);
}

.mode-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 10px 12px;
  border-radius: var(--r-pill);
  border: none;
  background: transparent;
  color: var(--stone);
  font-family: var(--font-ui);
  font-size: 0.82rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.22s;
  white-space: nowrap;
}

.mode-btn--active {
  background: var(--moss);
  color: white;
  box-shadow: var(--shadow-sm);
}

/* ── Sélecteur de cycle ───────────────────────────────────── */
.cycle-picker {
  margin-bottom: 18px;
}

.cycle-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone-light);
  margin-bottom: 10px;
}

.cycle-options {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.cycle-btn {
  padding: 8px 16px;
  border-radius: var(--r-pill);
  border: 1.5px solid var(--sand);
  background: var(--parchment);
  color: var(--stone);
  font-family: var(--font-ui);
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.18s;
}

.cycle-btn--active {
  background: var(--moss);
  border-color: var(--moss);
  color: white;
}

/* ── Carte résultat ───────────────────────────────────────── */
.result-card {
  border-radius: var(--r-lg);
  padding: 24px 20px 20px;
  margin-bottom: 18px;
  text-align: center;
  color: white;
  position: relative;
  overflow: hidden;
  transition: background 0.3s;
  min-height: 160px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.result-card--creuse  { background: linear-gradient(140deg, var(--moss) 0%, #162f0f 100%); }
.result-card--hors    { background: linear-gradient(140deg, #4a5266 0%, #2d3040 100%); }
.result-card--warning { background: linear-gradient(140deg, #7a4a1a 0%, #3d200a 100%); }

.creuse-progress {
  position: absolute;
  bottom: 0; left: 0; right: 0;
  height: 3px;
  background: rgba(255,255,255,0.12);
}
.creuse-progress-fill {
  height: 100%;
  background: rgba(255,255,255,0.45);
  border-radius: var(--r-pill);
  transition: width 1s ease;
}

.result-status {
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  opacity: 0.9;
  margin-bottom: 6px;
}

.result-hint {
  font-size: 0.78rem;
  opacity: 0.65;
  margin-bottom: 4px;
  font-weight: 500;
}
.result-hint strong { opacity: 0.9; font-weight: 800; }

.result-hours {
  font-family: var(--font-display);
  font-size: 5.5rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: -3px;
  font-variant-numeric: tabular-nums;
  margin-bottom: 10px;
  display: flex;
  align-items: flex-end;
  gap: 2px;
}

.result-unit {
  font-size: 2.6rem;
  letter-spacing: -1px;
  opacity: 0.7;
  line-height: 1.2;
}

.result-unit-min {
  font-size: 2rem;
  opacity: 0.8;
  letter-spacing: 0;
  line-height: 1.3;
  font-family: var(--font-display);
}

.result-sub {
  font-size: 0.78rem;
  opacity: 0.75;
  line-height: 1.6;
}
.result-sub strong { opacity: 1; font-size: 0.85rem; }
.result-sub em { font-style: normal; }

/* ── Timeline 24h ─────────────────────────────────────────── */
.timeline-24 { margin-top: 8px; }

.tl24-track {
  position: relative;
  height: 10px;
  background: var(--sand);
  border-radius: var(--r-pill);
  overflow: visible;
  margin-bottom: 6px;
}

.tl24-zone {
  position: absolute;
  top: 0; height: 100%;
}
.tl24-zone:first-child  { border-radius: var(--r-pill) 0 0 var(--r-pill); }
.tl24-zone:nth-child(3) { border-radius: 0 var(--r-pill) var(--r-pill) 0; }
.tl24-zone--creuse { background: var(--sage); opacity: 0.55; }

.tl24-dot {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 14px; height: 14px;
  background: var(--moss);
  border: 2.5px solid var(--cream);
  border-radius: 50%;
  box-shadow: 0 2px 8px rgba(42,77,32,0.35);
  transition: left 1s ease;
  z-index: 2;
}

.tl24-dot-label {
  position: absolute;
  bottom: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--ink);
  color: white;
  font-size: 0.65rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  padding: 2px 6px;
  border-radius: var(--r-pill);
  white-space: nowrap;
}

/* Marqueur départ différé */
.tl24-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 12px; height: 12px;
  border-radius: 50%;
  z-index: 3;
  transition: left 0.5s ease;
}

.tl24-marker--start {
  background: var(--warning);
  border: 2px solid var(--cream);
  box-shadow: 0 2px 6px rgba(196,123,42,0.4);
}

.tl24-marker-label {
  position: absolute;
  top: calc(100% + 5px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--warning);
  color: white;
  font-size: 0.6rem;
  font-weight: 700;
  padding: 2px 5px;
  border-radius: var(--r-pill);
  white-space: nowrap;
}

.tl24-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 10px;
}
.tl24-labels span {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--stone-light);
  letter-spacing: 0.03em;
}

.tl24-legend {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 0.72rem;
  color: var(--stone);
  font-weight: 600;
}

.tl24-legend-dot {
  width: 10px; height: 10px;
  border-radius: 3px;
  flex-shrink: 0;
}
.tl24-legend-dot--creuse { background: var(--sage); }
.tl24-legend-dot--start  { background: var(--warning); }

/* ── Carte info ───────────────────────────────────────────── */
.card-info {
  background: var(--cream);
  border-radius: var(--r-lg);
  padding: 20px;
  border: 1px solid rgba(42,77,32,0.07);
  box-shadow: var(--shadow-xs);
}

.info-title {
  font-size: 0.7rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--stone-light);
  margin-bottom: 8px;
}

.info-text {
  font-size: 0.87rem;
  color: var(--stone);
  line-height: 1.65;
  margin-bottom: 16px;
}
.info-text strong { color: var(--ink); }

.info-tips { display: flex; flex-direction: column; gap: 10px; }

.tip {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.84rem;
  color: var(--stone);
}

.tip-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
  width: 32px; height: 32px;
  background: var(--sage-pale);
  border-radius: var(--r-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.tip strong { color: var(--ink); }

/* ── Transitions ──────────────────────────────────────────── */
.slide-down-enter-active { transition: all 0.28s cubic-bezier(0.34, 1.1, 0.64, 1); }
.slide-down-leave-active { transition: all 0.18s ease-in; }
.slide-down-enter-from   { opacity: 0; transform: translateY(-8px); }
.slide-down-leave-to     { opacity: 0; transform: translateY(-4px); }

.fade-enter-active, .fade-leave-active { transition: opacity 0.2s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
