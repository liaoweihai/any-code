<script setup lang="ts">
import { Home, FolderOpen, BarChart2 } from 'lucide-vue-next';
import { useRoute } from 'vue-router';

const route = useRoute();

const isActive = (path: string) => route.path === path;
</script>

<template>
  <nav class="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-10">
    <router-link to="/" class="flex flex-col items-center p-2" :class="isActive('/') ? 'text-blue-600' : 'text-gray-500'">
      <Home class="w-6 h-6" />
      <span class="text-xs mt-1">首页</span>
    </router-link>
    <router-link to="/manage" class="flex flex-col items-center p-2" :class="isActive('/manage') ? 'text-blue-600' : 'text-gray-500'">
      <FolderOpen class="w-6 h-6" />
      <span class="text-xs mt-1">管理</span>
    </router-link>
    <router-link to="/stats" class="flex flex-col items-center p-2" :class="isActive('/stats') ? 'text-blue-600' : 'text-gray-500'">
      <BarChart2 class="w-6 h-6" />
      <span class="text-xs mt-1">统计</span>
    </router-link>
  </nav>
</template>
