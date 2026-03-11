<script setup lang="ts">
import { ref, watch } from 'vue';
import { Check, X } from 'lucide-vue-next';

const props = defineProps<{
  isOpen: boolean;
  initialName?: string;
  mode: 'create' | 'edit';
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'save', name: string): void;
}>();

const folderName = ref('');

watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    folderName.value = props.initialName || '';
  }
});

const save = () => {
  if (folderName.value.trim()) {
    emit('save', folderName.value.trim());
    folderName.value = '';
  }
};
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
    <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100">
      <h3 class="text-lg font-bold text-gray-800 mb-4">{{ mode === 'create' ? '新建文件夹' : '重命名文件夹' }}</h3>
      <input 
        v-model="folderName"
        type="text" 
        placeholder="输入文件夹名称"
        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-50 outline-none transition-all mb-6 text-lg"
        @keyup.enter="save"
        autofocus
      />
      <div class="flex gap-3">
        <button 
          @click="emit('close')"
          class="flex-1 px-4 py-3 rounded-xl text-gray-600 bg-gray-100 hover:bg-gray-200 font-bold transition-colors flex items-center justify-center gap-2"
        >
          <X class="w-5 h-5" />
          取消
        </button>
        <button 
          @click="save"
          class="flex-1 px-4 py-3 rounded-xl text-white bg-blue-600 hover:bg-blue-700 font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-blue-200"
          :disabled="!folderName.trim()"
        >
          <Check class="w-5 h-5" />
          保存
        </button>
      </div>
    </div>
  </div>
</template>
