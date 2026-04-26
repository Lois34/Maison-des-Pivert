import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import router from './router'
import { initAuth } from './composables/useAuth.js'

initAuth().then(() => {
  createApp(App).use(router).mount('#app')
})
