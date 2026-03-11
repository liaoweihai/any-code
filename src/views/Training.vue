<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useTrainingStore } from '../stores/training';
import { useWordStore } from '../stores/word';
import { useFolderStore } from '../stores/folder';
import Header from '../components/common/Header.vue';
import RecognitionTraining from '../components/training/RecognitionTraining.vue';
import DictationTraining from '../components/training/DictationTraining.vue';
import TrainingResult from '../components/training/TrainingResult.vue';
import { ChevronRight } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const trainingStore = useTrainingStore();
const wordStore = useWordStore();
const folderStore = useFolderStore();

const mode = route.params.mode as 'recognition' | 'dictation' | 'random';
const step = ref<'select' | 'training' | 'result'>('select');
const selectedFolderId = ref<string | null>(null);

const modeTitle = computed(() => {
  switch (mode) {
    case 'recognition': return '认词训练';
    case 'dictation': return '默写训练';
    case 'random': return '随机训练';
    default: return '训练';
  }
});

onMounted(async () => {
  await folderStore.fetchFolders();
  
  // If we came from Mistake Book or Random Training (with pre-set data), skip selection
  if (trainingStore.trainingWords.length > 0 && trainingStore.currentTraining) {
    step.value = 'training';
    return;
  }
  
  if (mode === 'random') {
    await startRandomTraining();
  }
});

const startRandomTraining = async () => {
  await wordStore.fetchAllWords();
  if (wordStore.words.length === 0) {
    alert('暂无单词，请先添加单词');
    router.push('/');
    return;
  }
  // Select 20 random words
  const randomWords = [...wordStore.words].sort(() => Math.random() - 0.5).slice(0, 20);
  await trainingStore.startTraining(randomWords, 'random', 'all', true);
  step.value = 'training';
};

const currentTrainingComponent = computed(() => {
  if (mode === 'recognition') return RecognitionTraining;
  if (mode === 'dictation') return DictationTraining;
  
  // Random mode: Deterministic based on word ID and index
  const word = trainingStore.currentWord;
  if (!word) return RecognitionTraining;
  
  // Simple deterministic choice
  return (word.id.charCodeAt(0) + trainingStore.currentIndex) % 2 === 0 
    ? RecognitionTraining 
    : DictationTraining;
});

const currentTraining = computed(() => trainingStore.currentTraining);

const handleBack = () => {
  if (step.value === 'training' || step.value === 'result') {
    if (confirm('确定要退出训练吗？当前的进度将不会保存。')) {
      if (currentTraining.value?.folderId === 'mistakes') {
        router.push('/stats/detail/mistakes');
      } else if (currentTraining.value?.folderId === 'all') {
        router.push('/manage');
      } else if (currentTraining.value?.folderId) {
        router.push(`/folder/${currentTraining.value.folderId}`);
      } else {
        router.back();
      }
    }
  } else {
    router.back();
  }
};

const selectFolder = async (folderId: string) => {
  selectedFolderId.value = folderId;
  await wordStore.fetchWords(folderId);
  if (wordStore.words.length === 0) {
    alert('该文件夹为空');
    return;
  }
  await trainingStore.startTraining(wordStore.words, mode, folderId);
  step.value = 'training';
};
</script>

<template>
  <div class="h-full bg-gray-50 flex flex-col overflow-hidden">
    <Header :title="modeTitle" :show-back="true" @back="handleBack" class="shrink-0" />

    <!-- Step 1: Select Folder (if not random) -->
    <div v-if="step === 'select' && mode !== 'random'" class="flex-1 overflow-y-auto p-4 pb-20">
      <h2 class="text-lg font-bold text-gray-800 mb-4 px-1">选择训练文件夹</h2>
      <div class="grid gap-3">
        <div 
          v-for="folder in folderStore.folders" 
          :key="folder.id"
          @click="selectFolder(folder.id)"
          class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer hover:border-blue-300 group"
        >
          <div class="flex flex-col">
            <span class="font-bold text-gray-800 group-hover:text-blue-600 transition-colors">{{ folder.name }}</span>
            <span class="text-xs text-gray-400 mt-0.5">{{ folder.wordCount }} 词</span>
          </div>
          <div class="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <ChevronRight class="w-5 h-5" />
          </div>
        </div>
      </div>
    </div>

    <!-- Step 2: Training Interface -->
    <div v-else-if="step === 'training' && !trainingStore.isFinished" class="flex-1 flex flex-col overflow-hidden">
      <component :is="currentTrainingComponent" />
    </div>

    <!-- Step 3: Result -->
    <div v-else-if="trainingStore.isFinished" class="flex-1 overflow-y-auto">
      <TrainingResult />
    </div>
  </div>
</template>
