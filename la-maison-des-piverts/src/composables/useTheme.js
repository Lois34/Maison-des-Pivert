import { ref, computed, watchEffect } from 'vue'

const theme = ref(localStorage.getItem('theme_pivert') || 'light')

watchEffect(() => {
  document.documentElement.setAttribute('data-theme', theme.value)
  localStorage.setItem('theme_pivert', theme.value)
})

export function useTheme() {
  const isDark = computed(() => theme.value === 'dark')
  function toggleTheme() {
    theme.value = theme.value === 'light' ? 'dark' : 'light'
  }
  return { isDark, toggleTheme }
}
