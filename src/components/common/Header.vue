<script setup lang="ts">
import { ChevronLeft } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();

const props = defineProps<{
  title: string;
  showBack?: boolean;
  onBack?: () => void;
}>();

const handleBack = () => {
  if (props.onBack) {
    props.onBack();
  } else {
    router.back();
  }
};
</script>

<template>
  <header class="bg-blue-600 text-white p-4 shadow-md sticky top-0 z-50 flex items-center justify-between min-h-[56px]">
    <div class="w-10">
      <button 
        v-if="showBack" 
        @click="handleBack" 
        class="p-2 -ml-2 hover:bg-blue-700 rounded-full transition-colors active:scale-90"
      >
        <ChevronLeft class="w-6 h-6" />
      </button>
    </div>
    
    <h1 class="text-lg font-bold text-center flex-1 truncate px-2">{{ title }}</h1>
    
    <div class="w-10"></div>
  </header>
</template>
