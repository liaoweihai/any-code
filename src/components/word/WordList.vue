<script setup lang="ts">
import { Trash2, Volume2, CheckSquare, Square } from 'lucide-vue-next';
import type { Word } from '../../types';

const props = defineProps<{
  words: Word[];
  isEditing?: boolean;
  selectedIds?: Set<string>;
  searchQuery?: string;
}>();

const emit = defineEmits<{
  (e: 'delete', id: string): void;
  (e: 'toggle-select', id: string): void;
}>();

const playAudio = (word: string) => {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
};

const highlightMatch = (text: string) => {
  if (!props.searchQuery) return text;
  const regex = new RegExp(`(${props.searchQuery})`, 'gi');
  return text.replace(regex, '<span class="text-blue-600 font-extrabold bg-yellow-100 rounded px-0.5">$1</span>');
};
</script>

<template>
  <div class="space-y-3">
    <div 
      v-for="word in words" 
      :key="word.id"
      class="bg-white p-4 rounded-xl border shadow-sm flex items-start justify-between group transition-all"
      :class="isEditing && selectedIds?.has(word.id) ? 'border-blue-500 bg-blue-50/30' : 'border-gray-100'"
      @click="isEditing && emit('toggle-select', word.id)"
    >
      <div class="flex items-center gap-3 flex-1 overflow-hidden">
        <!-- Checkbox for Editing Mode -->
        <div v-if="isEditing" class="shrink-0 text-blue-600">
          <CheckSquare v-if="selectedIds?.has(word.id)" class="w-5 h-5 fill-blue-100" />
          <Square v-else class="w-5 h-5 text-gray-300" />
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex items-center gap-2 mb-1">
            <h3 class="text-lg font-bold text-gray-800 truncate" v-html="highlightMatch(word.word)"></h3>
            <span class="text-xs text-gray-400 font-mono shrink-0">{{ word.phonetic }}</span>
            <button @click.stop="playAudio(word.word)" class="p-1 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors shrink-0">
              <Volume2 class="w-4 h-4" />
            </button>
          </div>
          <div class="text-sm text-gray-600 truncate">
            <span class="inline-block px-1.5 py-0.5 bg-gray-100 rounded text-xs text-gray-500 mr-2">{{ word.pos }}</span>
            {{ word.definition }}
          </div>
        </div>
      </div>
      
      <!-- Delete Button (Only when NOT editing) -->
      <button 
        v-if="!isEditing"
        @click.stop="emit('delete', word.id)"
        class="p-2 text-gray-300 hover:text-red-500 transition-colors shrink-0 ml-2"
      >
        <Trash2 class="w-5 h-5" />
      </button>
    </div>
  </div>
</template>
