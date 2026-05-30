import { createRouter, createWebHistory } from 'vue-router'
import InventaireView from '../views/InventaireView.vue'
import { user, profile, fetchProfile } from '../composables/useAuth.js'

const routes = [
  { path: '/', redirect: '/inventaire' },
  { path: '/inventaire', component: InventaireView },
  { path: '/courses',  component: () => import('../views/CoursesView.vue') },
  { path: '/recettes', component: () => import('../views/RecettesView.vue') },
  { path: '/lessive',  component: () => import('../views/LessiveView.vue') },
  { path: '/todo',     component: () => import('../views/TodoView.vue') },
  { path: '/login',    component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/setup-foyer', component: () => import('../views/SetupFoyerView.vue'), meta: { noNav: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

const isDraftPreview = window.location.hostname.includes('--') && window.location.hostname.includes('netlify.app')

router.beforeEach(async (to) => {
  if (to.meta.public) return true
  if (isDraftPreview) return true
  if (!user.value) return '/login'

  // Cas de course après OTP : profil pas encore chargé
  if (profile.value === null) await fetchProfile(user.value.id)

  if (to.path !== '/setup-foyer' && !profile.value?.foyer_id) return '/setup-foyer'
  if (to.path === '/setup-foyer' && profile.value?.foyer_id)  return '/'
  return true
})

export default router
