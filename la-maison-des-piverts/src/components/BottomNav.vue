<template>
  <nav class="bottom-nav">
    <RouterLink
      v-for="item in items"
      :key="item.to"
      :to="item.to"
      class="nav-item"
      active-class="nav-item--active"
    >
      <div class="nav-pill">
        <span class="nav-icon" v-html="item.icon" />
      </div>
      <span class="nav-label">{{ item.label }}</span>
    </RouterLink>
  </nav>
</template>

<script setup>
const items = [
  {
    to: '/inventaire',
    label: 'Inventaire',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  {
    to: '/courses',
    label: 'Courses',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 001.99 1.61h9.72a2 2 0 001.99-1.61L23 6H6"/></svg>`,
  },
  {
    to: '/recettes',
    label: 'Recettes',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8h1a4 4 0 010 8h-1"/><path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z"/><line x1="6" y1="1" x2="6" y2="4"/><line x1="10" y1="1" x2="10" y2="4"/><line x1="14" y1="1" x2="14" y2="4"/></svg>`,
  },
  {
    to: '/lessive',
    label: 'Lessive',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="4"/><circle cx="12" cy="13" r="5"/><circle cx="12" cy="13" r="2.5"/><circle cx="8" cy="6" r="1"/></svg>`,
  },
  {
    to: '/todo',
    label: 'Tâches',
    icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>`,
  },
]
</script>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: flex-start;
  padding: 10px 8px calc(10px + env(safe-area-inset-bottom, 0px));
  background: rgba(253, 250, 245, 0.92);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  border-top: 1px solid rgba(42, 77, 32, 0.10);
  box-shadow: 0 -4px 24px rgba(42, 77, 32, 0.08);
  z-index: 500;
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  text-decoration: none;
  color: var(--stone-light);
  transition: color 0.2s;
  -webkit-tap-highlight-color: transparent;
}

.nav-item--active {
  color: var(--moss);
}

.nav-pill {
  width: 44px;
  height: 30px;
  border-radius: var(--r-pill);
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  transition: background 0.25s, transform 0.2s;
}

.nav-item--active .nav-pill {
  background: var(--sage-pale);
  transform: translateY(-1px);
}

.nav-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.nav-label {
  font-family: var(--font-ui);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}
</style>
