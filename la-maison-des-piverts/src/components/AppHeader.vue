<template>
  <header class="app-header">
    <div class="header-inner">
      <div class="header-brand">
        <div class="header-bird">
          <img src="/pivert.jpg" alt="Pivert" class="header-bird-img" />
        </div>
        <div class="header-text">
          <h1 class="header-title">La Maison<br/><em>des Piverts</em></h1>
          <p v-if="subtitle" class="header-subtitle">{{ subtitle }}</p>
        </div>
      </div>
      <div class="header-actions">
        <slot />
        <button v-if="user" class="btn-header-icon" @click="notifOuverte = true" title="Notifications de péremption">
          🔔
        </button>
        <button class="btn-header-icon" @click="toggleTheme" :title="isDark ? 'Mode clair' : 'Mode sombre'">
          {{ isDark ? '☀️' : '🌙' }}
        </button>
        <button v-if="user" class="btn-signout" @click="deconnecter" title="Se déconnecter">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
            <polyline points="16 17 21 12 16 7"/>
            <line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
        </button>
      </div>
    </div>

    <NotifPanel :ouvert="notifOuverte" @close="notifOuverte = false" />
    <div class="header-wave">
      <svg viewBox="0 0 1440 40" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M0,20 C360,40 1080,0 1440,20 L1440,40 L0,40 Z" fill="var(--parchment)" />
      </svg>
    </div>
  </header>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { signOut, user } from '../composables/useAuth.js'
import { useTheme } from '../composables/useTheme.js'
import NotifPanel from './NotifPanel.vue'

defineProps({
  subtitle: { type: String, default: '' }
})

const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const notifOuverte = ref(false)

async function deconnecter() {
  await signOut()
  router.replace('/login')
}
</script>

<style scoped>
.app-header {
  background: linear-gradient(135deg, var(--moss) 0%, #1a3015 60%, #0f1d0b 100%);
  position: relative;
  padding: calc(env(safe-area-inset-top, 0px) + 22px) 20px 0;
  overflow: hidden;
}

/* Décoration végétale en arrière-plan */
.app-header::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 85% 15%, rgba(255,255,255,0.06) 0%, transparent 40%),
    radial-gradient(circle at 15% 85%, rgba(90, 143, 80, 0.15) 0%, transparent 45%);
  pointer-events: none;
}

.header-inner {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  max-width: 600px;
  margin: 0 auto;
  padding-bottom: 18px;
}

.header-brand {
  display: flex;
  align-items: center;
  gap: 14px;
}

.header-bird {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.25);
  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
  overflow: hidden;
  flex-shrink: 0;
}

.header-bird-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: center top;
  display: block;
}

.header-text {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.header-title {
  font-family: var(--font-display);
  font-weight: 500;
  font-size: 1.25rem;
  line-height: 1.15;
  color: rgba(255,255,255,0.96);
  letter-spacing: -0.01em;
}

.header-title em {
  font-style: italic;
  font-weight: 300;
  color: var(--sage);
}

.header-subtitle {
  font-family: var(--font-ui);
  font-size: 0.75rem;
  color: rgba(255,255,255,0.50);
  font-weight: 500;
  letter-spacing: 0.02em;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-top: 2px;
}

.header-wave {
  position: relative;
  height: 24px;
  margin-top: -1px;
}

.header-wave svg {
  position: absolute;
  bottom: 0;
  width: 100%;
  height: 100%;
}

.btn-header-icon,
.btn-signout {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: rgba(255,255,255,0.08);
  border: 1px solid rgba(255,255,255,0.15);
  color: rgba(255,255,255,0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;
  font-size: 1rem;
}
.btn-header-icon:hover,
.btn-signout:hover {
  background: rgba(255,255,255,0.18);
  color: white;
}
</style>
