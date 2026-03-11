<script setup lang="ts">
import { useTrainingStore } from '../../stores/training';
import { CheckCircle, XCircle, RotateCcw, Home } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const trainingStore = useTrainingStore();
const router = useRouter();

const accuracy = Math.round((trainingStore.correctCount / (trainingStore.correctCount + trainingStore.errorCount)) * 100) || 0;

const goHome = () => {
  router.push('/');
};

const restart = () => {
  if (trainingStore.currentTraining) {
    trainingStore.startTraining(
      trainingStore.trainingWords, 
      trainingStore.currentTraining.mode, 
      trainingStore.currentTraining.folderId
    );
  }
};
</script>

<template>
  <div class="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
    <div class="relative mb-8">
      <svg class="w-40 h-40 transform -rotate-90">
        <circle
          cx="80"
          cy="80"
          r="70"
          stroke="currentColor"
          stroke-width="12"
          fill="transparent"
          class="text-gray-100"
        />
        <circle
          cx="80"
          cy="80"
          r="70"
          stroke="currentColor"
          stroke-width="12"
          fill="transparent"
          :stroke-dasharray="440"
          :stroke-dashoffset="440 - (440 * accuracy) / 100"
          class="text-blue-600 transition-all duration-1000 ease-out"
        />
      </svg>
      <div class="absolute inset-0 flex flex-col items-center justify-center">
        <span class="text-4xl font-bold text-gray-800">{{ accuracy }}%</span>
        <span class="text-sm text-gray-500">正确率</span>
      </div>
    </div>

    <div class="grid grid-cols-2 gap-8 mb-12 w-full max-w-xs">
      <div class="bg-green-50 p-4 rounded-2xl flex flex-col items-center">
        <CheckCircle class="w-8 h-8 text-green-500 mb-2" />
        <span class="text-2xl font-bold text-green-700">{{ trainingStore.correctCount }}</span>
        <span class="text-xs text-green-600">正确</span>
      </div>
      <div class="bg-red-50 p-4 rounded-2xl flex flex-col items-center">
        <XCircle class="w-8 h-8 text-red-500 mb-2" />
        <span class="text-2xl font-bold text-red-700">{{ trainingStore.errorCount }}</span>
        <span class="text-xs text-red-600">错误</span>
      </div>
    </div>

    <div class="flex gap-4 w-full max-w-xs">
      <button 
        @click="goHome"
        class="flex-1 py-3 rounded-xl font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
      >
        <Home class="w-5 h-5" />
        返回首页
      </button>
      <button 
        @click="restart"
        class="flex-1 py-3 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95 flex items-center justify-center gap-2"
      >
        <RotateCcw class="w-5 h-5" />
        再练一次
      </button>
    </div>
  </div>
</template>
