<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { useStatsStore } from '../stores/stats';
import { useWordStore } from '../stores/word';
import { useTrainingStore } from '../stores/training';
import { useRoute, useRouter } from 'vue-router';
import Header from '../components/common/Header.vue';
import { BookOpen, AlertTriangle, Search, CheckCircle, XCircle, Trash2, ArrowRight, Brain, PenTool, Shuffle, MoreHorizontal } from 'lucide-vue-next';

const statsStore = useStatsStore();
const wordStore = useWordStore();
const trainingStore = useTrainingStore();
const route = useRoute();
const router = useRouter();

onMounted(async () => {
  // Ensure stats are loaded when page is refreshed or visited directly
  // We check if totalStats is populated, or just force fetch
  await statsStore.fetchDailyStats();
});

const type = computed(() => route.params.type as 'learned' | 'mistakes' | 'all');
const activeFilter = ref<'all' | 'learned' | 'unlearned'>('all');
const searchQuery = ref('');
const isEditing = ref(false);
const selectedWordIds = ref<Set<string>>(new Set());
const showTrainingModal = ref(false);

const filters = ['all', 'learned', 'unlearned'] as const;

const title = computed(() => {
  switch (type.value) {
    case 'learned': return '已学单词';
    case 'mistakes': return '错题本';
    case 'all': return '总词汇表';
    default: return '词汇列表';
  }
});

const baseWords = computed(() => {
  if (type.value === 'learned') return statsStore.totalStats?.learnedWords || [];
  if (type.value === 'mistakes') return statsStore.totalStats?.mistakeWords || [];
  if (type.value === 'all') {
    return [
      ...(statsStore.totalStats?.learnedWords || []),
      ...(statsStore.totalStats?.unlearnedWords || [])
    ].sort((a, b) => a.word.localeCompare(b.word));
  }
  return [];
});

const filteredWords = computed(() => {
  let result = baseWords.value;
  
  // Apply tab filter for 'all' view
  if (type.value === 'all' && activeFilter.value !== 'all') {
    if (activeFilter.value === 'learned') {
      result = result.filter(w => w.reviewCount > 0);
    } else {
      result = result.filter(w => w.reviewCount === 0);
    }
  }

  // Apply search
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(w => 
      w.word.toLowerCase().includes(query)
    ).sort((a, b) => {
      // Smart sorting like in Manage view
      const aStarts = a.word.toLowerCase().startsWith(query);
      const bStarts = b.word.toLowerCase().startsWith(query);
      
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      if (aStarts && bStarts) return a.word.length - b.word.length;
      return a.word.localeCompare(b.word);
    });
  }
  
  return result;
});

const toggleSelection = (id: string) => {
  if (selectedWordIds.value.has(id)) {
    selectedWordIds.value.delete(id);
  } else {
    selectedWordIds.value.add(id);
  }
};

const selectAll = () => {
  if (selectedWordIds.value.size === filteredWords.value.length) {
    selectedWordIds.value.clear();
  } else {
    selectedWordIds.value = new Set(filteredWords.value.map(w => w.id));
  }
};

const removeFromMistakes = async () => {
  if (selectedWordIds.value.size === 0) return;
  
  const ids = Array.from(selectedWordIds.value);
  const wordsToUpdate = baseWords.value.filter(w => ids.includes(w.id)).map(w => ({
    ...w,
    isMistake: false,
    consecutiveCorrect: 0
  }));
  
  // Use wordStore.updateWords to batch update
  await wordStore.updateWords(wordsToUpdate);
  
  // Refresh total stats to update the list
  await statsStore.fetchDailyStats();
  
  selectedWordIds.value.clear();
  isEditing.value = false;
};

const startMistakeTraining = async (mode: 'recognition' | 'dictation' | 'random') => {
  const selectedWords = baseWords.value.filter(w => selectedWordIds.value.has(w.id));
  if (selectedWords.length === 0) return;
  
  await trainingStore.startTraining(selectedWords, mode, 'mistakes', true); // 'mistakes' as virtual folder ID
  router.push(`/train/${mode}`);
};

const startRandomMistakeTraining = async (count: number) => {
  let pool = filteredWords.value;
  if (pool.length === 0) return;
  
  // Shuffle and slice
  pool = pool.sort(() => Math.random() - 0.5).slice(0, count);
  
  await trainingStore.startTraining(pool, 'random', 'mistakes', true);
  router.push('/train/random');
};
</script>

<template>
  <div class="flex overflow-hidden flex-col h-full bg-gray-50">
    <Header :title="title" :show-back="true" class="shrink-0" />
    
    <div class="flex flex-col flex-1 min-h-0">
      <!-- Controls -->
      <div class="p-4 space-y-3 bg-white border-b border-gray-100 shrink-0">
        <!-- Search & Batch Toggle -->
        <div class="flex gap-2">
          <div class="relative flex-1">
            <Search class="absolute left-3 top-1/2 w-4 h-4 text-gray-400 -translate-y-1/2" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="搜索单词..." 
              class="py-2 pr-4 pl-9 w-full text-sm bg-gray-50 rounded-lg border border-gray-200 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <button 
            v-if="type === 'mistakes'"
            @click="isEditing = !isEditing"
            class="p-2 rounded-lg transition-colors"
            :class="isEditing ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'"
          >
            <MoreHorizontal class="w-5 h-5" />
          </button>
        </div>
        
        <!-- Filter Tabs (Only for All Words) -->
        <div v-if="type === 'all'" class="flex p-1 bg-gray-100 rounded-lg">
          <button 
            v-for="filter in filters"
            :key="filter"
            @click="activeFilter = filter"
            class="flex-1 py-1.5 text-xs font-medium rounded-md transition-all"
            :class="activeFilter === filter ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'"
          >
            {{ filter === 'all' ? '全部' : filter === 'learned' ? '已学' : '未学' }}
          </button>
        </div>

        <!-- Batch Actions (Only for Mistakes Editing) -->
        <div v-if="isEditing && type === 'mistakes'" class="flex justify-between items-center p-3 bg-blue-50 rounded-xl animate-fade-in">
          <div class="flex gap-2 items-center">
            <button @click="selectAll" class="px-2 text-xs font-bold text-blue-600">
              {{ selectedWordIds.size === filteredWords.length ? '取消全选' : '全选' }}
            </button>
            <span class="text-xs text-gray-400">已选 {{ selectedWordIds.size }} 项</span>
          </div>
          <div class="flex gap-2">
            <button 
              @click="removeFromMistakes"
              :disabled="selectedWordIds.size === 0"
              class="px-3 py-1.5 text-xs font-bold text-red-500 bg-white rounded-lg shadow-sm disabled:opacity-50"
            >
              移出
            </button>
            <button 
              @click="showTrainingModal = true"
              :disabled="selectedWordIds.size === 0"
              class="px-3 py-1.5 text-xs font-bold text-white bg-blue-600 rounded-lg shadow-sm disabled:opacity-50"
            >
              训练
            </button>
          </div>
        </div>
        
        <!-- Quick Random Training (Mistakes Only, Not Editing) -->
        <!-- Removed per user request -->
      </div>

      <div class="overflow-y-auto flex-1 p-4">
        <div v-if="!filteredWords || filteredWords.length === 0" class="flex flex-col justify-center items-center h-full text-gray-400">
          <component 
            :is="type === 'mistakes' ? AlertTriangle : BookOpen" 
            class="mb-4 w-16 h-16 text-gray-300" 
          />
          <p>暂无相关单词</p>
        </div>

        <div v-else class="pb-20 space-y-3">
          <div 
            v-for="word in filteredWords" 
            :key="word.id"
            @click="isEditing && toggleSelection(word.id)"
            class="flex justify-between items-start p-4 bg-white rounded-xl border border-gray-100 shadow-sm transition-all group"
            :class="[
              type === 'mistakes' ? 'border-red-100 bg-red-50/10' : '',
              isEditing && selectedWordIds.has(word.id) ? '!border-blue-500 !bg-blue-50' : ''
            ]"
          >
            <!-- Checkbox -->
            <div v-if="isEditing" class="mt-1 mr-3 text-blue-600">
              <CheckCircle v-if="selectedWordIds.has(word.id)" class="w-5 h-5 fill-blue-100" />
              <div v-else class="w-5 h-5 rounded-full border-2 border-gray-300"></div>
            </div>

            <div class="flex-1 mr-3 min-w-0">
              <div class="flex gap-2 items-center mb-1">
                <h3 class="text-lg font-bold text-gray-800 truncate">{{ word.word }}</h3>
                <span class="px-1.5 py-0.5 font-mono text-xs text-gray-400 bg-gray-100 rounded shrink-0">{{ word.phonetic }}</span>
              </div>
              <div class="text-sm text-gray-600 truncate">{{ word.definition }}</div>
            </div>
            
            <div class="flex flex-col gap-1 items-end shrink-0">
              <template v-if="word.reviewCount > 0">
                <span 
                  class="px-2 py-0.5 text-xs font-bold rounded-full"
                  :class="word.isMistake ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'"
                >
                  {{ word.isMistake ? `错误 ${word.errorCount}` : `熟练度 ${word.masteryLevel}` }}
                </span>
                <span v-if="type === 'mistakes' && word.consecutiveError > 0" class="text-[10px] text-red-400">
                  连错 {{ word.consecutiveError }}
                </span>
              </template>
              <span v-else class="px-2 py-0.5 text-xs font-bold text-gray-500 bg-gray-100 rounded-full">
                未学习
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Training Modal -->
    <div v-if="showTrainingModal" class="flex fixed inset-0 z-50 justify-center items-center p-4 backdrop-blur-sm bg-black/50">
      <div class="p-6 w-full max-w-sm bg-white rounded-2xl shadow-2xl">
        <h3 class="mb-4 text-lg font-bold text-center text-gray-800">选择训练模式</h3>
        <div class="space-y-3">
          <button @click="startMistakeTraining('recognition')" class="flex justify-between items-center p-4 w-full font-bold text-blue-700 bg-blue-50 rounded-xl border border-gray-100 hover:bg-blue-100">
            <span class="flex gap-2 items-center"><Brain class="w-5 h-5" /> 认词训练</span>
            <ArrowRight class="w-4 h-4" />
          </button>
          <button @click="startMistakeTraining('dictation')" class="flex justify-between items-center p-4 w-full font-bold text-purple-700 bg-purple-50 rounded-xl border border-gray-100 hover:bg-purple-100">
            <span class="flex gap-2 items-center"><PenTool class="w-5 h-5" /> 默写训练</span>
            <ArrowRight class="w-4 h-4" />
          </button>
          <button @click="startMistakeTraining('random')" class="flex justify-between items-center p-4 w-full font-bold text-orange-700 bg-orange-50 rounded-xl border border-gray-100 hover:bg-orange-100">
            <span class="flex gap-2 items-center"><Shuffle class="w-5 h-5" /> 随机混合</span>
            <ArrowRight class="w-4 h-4" />
          </button>
        </div>
        <button @click="showTrainingModal = false" class="py-3 mt-4 w-full font-bold text-gray-500 rounded-xl hover:bg-gray-50">取消</button>
      </div>
    </div>
  </div>
</template>