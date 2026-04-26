<template>
  <template v-if="!isPublicRoute">
    <AppHeader :subtitle="headerSubtitle" />
  </template>
  <RouterView v-slot="{ Component }">
    <Transition name="page" mode="out-in">
      <component :is="Component" @update-count="updateCount" />
    </Transition>
  </RouterView>
  <template v-if="!isPublicRoute">
    <BottomNav />
  </template>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import BottomNav from './components/BottomNav.vue'

const route = useRoute()
const isPublicRoute = computed(() => !!route.meta.public)

const count = ref(null)
const headerSubtitle = ref('')

function updateCount(n) {
  count.value = n
  headerSubtitle.value = n != null
    ? `${n} objet${n > 1 ? 's' : ''} répertorié${n > 1 ? 's' : ''}`
    : ''
}
</script>

<style>
.page-enter-active,
.page-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.page-enter-from {
  opacity: 0;
  transform: translateY(6px);
}

.page-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
