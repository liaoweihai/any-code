<script setup lang="ts">
import { onMounted } from 'vue';
import { useFolderStore } from '../stores/folder';
import { useStatsStore } from '../stores/stats';
import Header from '../components/common/Header.vue';
import { Play, BookOpen, ChevronRight, Brain, PenTool, AlertCircle } from 'lucide-vue-next';
import { useRouter } from 'vue-router';
import { db } from '../utils/indexdb';
import { useTrainingStore } from '../stores/training';

const folderStore = useFolderStore();
const statsStore = useStatsStore();
const trainingStore = useTrainingStore();
const router = useRouter();

onMounted(async () => {
  await folderStore.fetchFolders();
  await statsStore.fetchDailyStats();
});

const startQuickTrain = async () => {
  const allWords = await db.getAllWords();
  if (allWords.length === 0) {
    alert('暂无单词，请先添加单词');
    return;
  }
  const randomWords = [...allWords].sort(() => Math.random() - 0.5).slice(0, 20);
  await trainingStore.startTraining(randomWords, 'random', 'all', true);
  router.push('/train/random');
};

const startErrorTrain = async () => {
  const wrongWords = await db.getWrongWords();
  if (wrongWords.length === 0) {
    alert('太棒了！目前没有错题需要复习。');
    return;
  }
  // Train with up to 30 wrong words, sorted by error count (descending)
  const trainingSet = wrongWords.sort((a, b) => b.errorCount - a.errorCount).slice(0, 30);
  await trainingStore.startTraining(trainingSet, 'random', 'error', true);
  router.push('/train/random');
};

const goToFolder = (id: string) => {
  router.push(`/manage?folderId=${id}`);
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Header title="词汇记忆" />
    
    <main class="p-4 space-y-6">
      <!-- Statistics Card -->
      <section class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <h2 class="text-sm font-medium text-gray-500 mb-4">学习概览</h2>
        <div class="grid grid-cols-2 gap-4">
          <div class="space-y-1">
            <p class="text-3xl font-bold text-blue-600">{{ statsStore.totalStats?.wordsLearned || 0 }}</p>
            <p class="text-xs text-gray-400">已学单词 (总计)</p>
          </div>
          <div class="space-y-1">
            <p class="text-3xl font-bold text-green-500">{{ Math.round(statsStore.totalStats?.accuracy || 0) }}%</p>
            <p class="text-xs text-gray-400">平均正确率 (总计)</p>
          </div>
        </div>
        
        <div class="flex gap-3 mt-6">
          <button 
            @click="startQuickTrain"
            class="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-100 active:scale-95 text-sm"
          >
            <Play class="w-4 h-4 fill-current" />
            快速训练
          </button>
          <button 
            @click="startErrorTrain"
            class="flex-1 bg-red-50 hover:bg-red-100 text-red-600 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
          >
            <AlertCircle class="w-4 h-4" />
            错题训练
          </button>
        </div>
      </section>

      <!-- Training Modes -->
      <section>
        <h2 class="text-lg font-bold text-gray-800 mb-4 px-1">训练模式</h2>
        <div class="grid grid-cols-2 gap-4">
          <router-link 
            to="/train/recognition"
            class="bg-blue-50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-blue-100 transition-colors"
          >
            <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
              <Brain class="w-6 h-6" />
            </div>
            <span class="font-bold text-gray-700">认词训练</span>
          </router-link>
          
          <router-link 
            to="/train/dictation"
            class="bg-purple-50 p-4 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-purple-100 transition-colors"
          >
            <div class="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600">
              <PenTool class="w-6 h-6" />
            </div>
            <span class="font-bold text-gray-700">默写训练</span>
          </router-link>
        </div>
      </section>

      <!-- Folders Section -->
      <section>
        <div class="flex items-center justify-between mb-4 px-1">
          <h2 class="text-lg font-bold text-gray-800">我的文件夹</h2>
          <router-link to="/manage" class="text-sm text-blue-600 font-medium">管理</router-link>
        </div>

        <div v-if="folderStore.folders.length === 0" class="bg-white rounded-2xl p-8 text-center border border-dashed border-gray-300">
          <BookOpen class="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p class="text-gray-500 text-sm">还没有文件夹，去创建一个吧</p>
          <router-link to="/manage" class="mt-4 inline-block text-blue-600 text-sm font-bold">立即创建</router-link>
        </div>

        <div v-else class="grid gap-4">
          <div 
            v-for="folder in folderStore.folders" 
            :key="folder.id"
            @click="goToFolder(folder.id)"
            class="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between group"
          >
            <div class="flex items-center gap-4">
              <div class="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                <BookOpen class="w-6 h-6" />
              </div>
              <div>
                <h3 class="font-bold text-gray-800">{{ folder.name }}</h3>
                <p class="text-xs text-gray-400">{{ folder.wordCount }} 个单词</p>
              </div>
            </div>
            <ChevronRight class="w-5 h-5 text-gray-300 group-hover:text-blue-600 transition-colors" />
          </div>
        </div>
      </section>
    </main>
  </div>
</template>
