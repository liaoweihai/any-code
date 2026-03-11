<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTrainingStore } from '../../stores/training';
import { Volume2, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const router = useRouter();
const trainingStore = useTrainingStore();
const selectedOption = ref<string | null>(null);
const showResult = ref(false);

const isLastQuestion = computed(() => {
  return trainingStore.currentIndex === trainingStore.trainingWords.length - 1;
});

// Watch for word changes to restore state
watch(() => trainingStore.currentWord, () => {
  if (trainingStore.isCurrentAnswered) {
    const record = trainingStore.getAnswerForCurrentWord;
    if (record) {
      selectedOption.value = record.userAnswer;
      showResult.value = true;
    }
  } else {
    selectedOption.value = null;
    showResult.value = false;
  }
}, { immediate: true });

const options = computed(() => {
  if (!trainingStore.currentWord) return [];
  
  // Try to find existing options for this word in current training session
  // This requires us to store options generated for each word in the store or component state
  // Since component is reused, we can store it in a map in the component
  
  if (optionsMap.value.has(trainingStore.currentWord.id)) {
    return optionsMap.value.get(trainingStore.currentWord.id)!;
  }

  const correct = trainingStore.currentWord;
  let others = trainingStore.trainingWords
    .filter(w => w.id !== correct.id)
    .sort(() => Math.random() - 0.5);

  // Ensure user's wrong answer is included if reviewing
  if (trainingStore.isCurrentAnswered) {
    const record = trainingStore.getAnswerForCurrentWord;
    if (record && !record.isCorrect) {
      const wrongWord = trainingStore.trainingWords.find(w => w.definition === record.userAnswer);
      if (wrongWord) {
        others = others.filter(w => w.id !== wrongWord.id);
        others.unshift(wrongWord);
      }
    }
  }
  
  const newOptions = [correct, ...others.slice(0, 3)].sort(() => Math.random() - 0.5);
  optionsMap.value.set(correct.id, newOptions);
  return newOptions;
});

// Cache for options to prevent reshuffling on re-render
const optionsMap = ref(new Map<string, any[]>());

// Clear cache when training starts or ends (optional, but good for memory)
watch(() => trainingStore.isFinished, (finished) => {
  if (finished) {
    optionsMap.value.clear();
  }
});

const playAudio = (word: string) => {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
};

const selectOption = async (definition: string) => {
  if (showResult.value || trainingStore.isCurrentAnswered) return;
  
  selectedOption.value = definition;
  showResult.value = true;
  
  const isCorrect = definition === trainingStore.currentWord.definition;
  if (isCorrect) {
    playAudio(trainingStore.currentWord.word);
  }
  
  await trainingStore.submitAnswer(isCorrect, definition, trainingStore.currentWord.definition, false);
};

const next = async () => {
  if (isLastQuestion.value) {
    await trainingStore.finishTraining();
    // Force set index to length to trigger finished state if needed, or just redirect
    // Since finishTraining updates DB and state, we can redirect to stats or show result component
    // Assuming parent component handles 'finish' or we redirect.
    // In `views/Training.vue`, we should check `isFinished`.
    // But since we manually called finishTraining, we should manually redirect if the parent doesn't catch it.
    // Let's just set currentIndex to length to be safe if parent watches it.
    trainingStore.currentIndex = trainingStore.trainingWords.length;
  } else {
    trainingStore.nextWord();
  }
};

const prev = () => {
  trainingStore.prevWord();
};
</script>

<template>
  <div class="h-full relative flex flex-col overflow-hidden">
    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
      
      <!-- Word Card (Fixed at top) -->
      <Transition name="fade" mode="out-in">
        <div :key="trainingStore.currentWord.id" class="px-4 pt-6 pb-4 shrink-0 flex flex-col items-center text-center w-full">
          <h2 class="text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">{{ trainingStore.currentWord.word }}</h2>
          <div class="flex items-center gap-2 text-gray-500 mb-2">
            <span class="font-mono bg-gray-100 px-2 py-0.5 rounded text-sm">{{ trainingStore.currentWord.phonetic }}</span>
            <button @click="playAudio(trainingStore.currentWord.word)" class="p-1.5 hover:bg-gray-100 rounded-full transition-colors text-blue-600">
              <Volume2 class="w-5 h-5" />
            </button>
          </div>
        </div>
      </Transition>

      <!-- Options List (Scrollable if needed) -->
      <div class="flex-1 overflow-y-auto px-4 pb-28 w-full">
        <TransitionGroup name="list" tag="div" class="grid gap-3 max-w-md mx-auto py-2">
          <button
            v-for="option in options"
            :key="option.id"
            @click="selectOption(option.definition)"
            :disabled="showResult"
            class="w-full p-4 rounded-2xl border-2 text-left transition-all relative overflow-hidden active:scale-[0.98]"
            :class="[
              showResult && option.definition === trainingStore.currentWord.definition
                ? 'border-green-500 bg-green-50 text-green-700 font-bold shadow-sm shadow-green-100'
                : showResult && selectedOption === option.definition
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-white bg-white shadow-sm hover:border-blue-100 hover:bg-blue-50/50 text-gray-700'
            ]"
          >
            <div class="flex items-center justify-between">
              <span class="text-base leading-snug">{{ option.definition }}</span>
              <div v-if="showResult && option.definition === trainingStore.currentWord.definition" class="shrink-0 ml-2">
                <div class="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center text-white">
                  <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </button>
        </TransitionGroup>
        
        <!-- Result Info (Moved below options) -->
        <Transition name="fade">
          <div v-if="showResult" class="w-full max-w-md mx-auto bg-blue-50/50 rounded-2xl p-4 border border-blue-100 mt-4 text-left">
            <div class="space-y-3">
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <div class="w-1 h-3 bg-blue-500 rounded-full"></div>
                  <span class="text-xs font-bold text-blue-700">例句</span>
                </div>
                <p class="text-sm text-gray-700 leading-relaxed">{{ trainingStore.currentWord.example || '暂无例句' }}</p>
              </div>
              <div>
                <div class="flex items-center gap-1.5 mb-1">
                  <div class="w-1 h-3 bg-blue-500 rounded-full"></div>
                  <span class="text-xs font-bold text-blue-700">翻译</span>
                </div>
                <p class="text-sm text-gray-700 leading-relaxed">{{ trainingStore.currentWord.translation || '暂无翻译' }}</p>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- Navigation Bar (Fixed at bottom) -->
    <div class="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 flex justify-between items-center z-50 safe-area-bottom shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
      <button
        @click="prev"
        :disabled="trainingStore.currentIndex === 0"
        class="h-10 px-4 rounded-xl bg-gray-100 text-gray-600 font-bold disabled:opacity-30 disabled:cursor-not-allowed flex items-center gap-1 text-sm hover:bg-gray-200 transition-all active:scale-90"
      >
        <ChevronLeft class="w-4 h-4" />
        上一题
      </button>

      <div class="flex flex-col items-center">
        <div class="text-[10px] text-gray-400 font-bold uppercase tracking-widest mb-0.5">进度</div>
        <div class="text-sm font-black text-gray-700">
          {{ trainingStore.currentIndex + 1 }} <span class="text-gray-300 mx-0.5">/</span> {{ trainingStore.trainingWords.length }}
        </div>
      </div>

      <button
        @click="next"
        :disabled="!showResult"
        class="h-10 px-4 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-1 shadow-lg shadow-blue-200 active:scale-90 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 disabled:shadow-none"
      >
        {{ isLastQuestion ? '完成' : '下一题' }}
        <ChevronRight class="w-4 h-4" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}

.fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}

.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.list-enter-active,
.list-leave-active {
  transition: all 0.4s ease;
}
.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(20px);
}
</style>

<style scoped>
.safe-area-bottom {
  padding-bottom: env(safe-area-inset-bottom, 1rem);
}
</style>
