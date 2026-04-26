import { createRouter, createWebHistory } from 'vue-router'
import InventaireView from '../views/InventaireView.vue'
import { user } from '../composables/useAuth.js'

const routes = [
  { path: '/', redirect: '/inventaire' },
  { path: '/inventaire', component: InventaireView },
  { path: '/courses',  component: () => import('../views/CoursesView.vue') },
  { path: '/recettes', component: () => import('../views/RecettesView.vue') },
  { path: '/lessive',  component: () => import('../views/LessiveView.vue') },
  { path: '/login',    component: () => import('../views/LoginView.vue'), meta: { public: true } }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to) => {
  if (to.meta.public) return true
  if (!user.value)    return '/login'
  return true
})

export default router
