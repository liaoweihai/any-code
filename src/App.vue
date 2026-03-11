<script setup lang="ts">
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import BottomNav from './components/common/BottomNav.vue';

const route = useRoute();
const showBottomNav = computed(() => {
  const mainPaths = ['home', 'manage', 'stats'];
  // Also check if we are in folder detail view of manage
  if (route.name === 'manage' && route.query.folderId) {
    return false;
  }
  return mainPaths.includes(route.name as string);
});
</script>

<template>
  <div class="h-[100dvh] bg-gray-50 flex flex-col overflow-hidden">
    <main class="flex-1 overflow-hidden relative">
      <RouterView />
    </main>
    <BottomNav v-if="showBottomNav" />
  </div>
</template>

<style>
/* Global transition for fade effects if needed */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* Ensure no bounce scroll on mobile */
html, body {
  height: 100%;
  overflow: hidden;
  position: fixed;
  width: 100%;
}

#app {
  height: 100%;
  overflow: hidden;
}
</style>
