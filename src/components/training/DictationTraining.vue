<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useTrainingStore } from '../../stores/training';
import { Volume2, HelpCircle, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-vue-next';

const trainingStore = useTrainingStore();
const userInput = ref('');
const showResult = ref(false);

const isLastQuestion = computed(() => {
  return trainingStore.currentIndex === trainingStore.trainingWords.length - 1;
});

// Hint logic based on error count
const hintPlaceholder = computed(() => {
  const word = trainingStore.currentWord.word;
  const errorCount = trainingStore.currentWord.errorCount || 0;
  
  if (errorCount >= 3) {
    // Show first and last letter: "a _ _ _ e"
    if (word.length <= 2) return word;
    return `${word[0]} ${'_ '.repeat(word.length - 2).trim()} ${word[word.length - 1]}`;
  } else if (errorCount >= 1) {
    // Show first letter: "a _ _ _ _"
    return `${word[0]} ${'_ '.repeat(word.length - 1).trim()}`;
  } else {
    // No hint
    return '请输入单词...';
  }
});

// Watch for word changes to restore state
watch(() => trainingStore.currentWord, () => {
  if (trainingStore.isCurrentAnswered) {
    const record = trainingStore.getAnswerForCurrentWord;
    if (record) {
      userInput.value = record.userAnswer;
      showResult.value = true;
    }
  } else {
    userInput.value = '';
    showResult.value = false;
  }
}, { immediate: true });

const playAudio = (word: string) => {
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  window.speechSynthesis.speak(utterance);
};

const checkAnswer = async () => {
  if (!userInput.value.trim() || showResult.value) return;
  showResult.value = true;
  
  const isCorrect = userInput.value.trim().toLowerCase() === trainingStore.currentWord.word.toLowerCase();
  if (isCorrect) {
    playAudio(trainingStore.currentWord.word);
  }
  
  await trainingStore.submitAnswer(isCorrect, userInput.value, trainingStore.currentWord.word, false);
};

const next = async () => {
  if (isLastQuestion.value) {
    await trainingStore.finishTraining();
    trainingStore.currentIndex = trainingStore.trainingWords.length;
  } else {
    trainingStore.nextWord();
  }
};

const prev = () => {
  trainingStore.prevWord();
};

const giveUp = async () => {
  if (showResult.value) return;
  // userInput.value = ''; // Don't clear, keep what they typed or empty
  showResult.value = true;
  playAudio(trainingStore.currentWord.word);
  
  await trainingStore.submitAnswer(false, userInput.value, trainingStore.currentWord.word, false);
};
</script>

<template>
  <div class="h-full relative flex flex-col overflow-hidden">
    <!-- Main Content Area -->
    <div class="flex-1 flex flex-col min-h-0 overflow-hidden">
      
      <!-- Question Card (Fixed at top) -->
      <Transition name="fade" mode="out-in">
        <div :key="trainingStore.currentWord.id" class="px-4 pt-6 pb-4 shrink-0 flex flex-col items-center text-center w-full">
          <div class="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs font-bold mb-3 uppercase tracking-wider">
            {{ trainingStore.currentWord.pos }}
          </div>
          <h2 class="text-2xl font-extrabold text-gray-900 mb-4 leading-tight">{{ trainingStore.currentWord.definition }}</h2>

          <button 
            @click="playAudio(trainingStore.currentWord.word)" 
            class="mb-6 w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg shadow-blue-200 active:scale-90 transition-all"
          >
            <Volume2 class="w-8 h-8" />
          </button>

          <div class="w-full max-w-xs relative mb-4">
            <!-- Hint Display (if available and not answered) -->
            <div v-if="!showResult && trainingStore.currentWord.errorCount > 0" class="mb-2 text-sm font-mono text-blue-500 font-bold tracking-widest animate-pulse">
               {{ hintPlaceholder }}
            </div>

            <input
              v-model="userInput"
              type="text"
              class="w-full text-center text-3xl font-black border-b-4 border-gray-200 py-2 focus:border-blue-500 outline-none bg-transparent transition-all placeholder:text-gray-300 placeholder:text-lg placeholder:font-normal"
              :class="{
                'text-green-600 border-green-500': showResult && userInput.trim().toLowerCase() === trainingStore.currentWord.word.toLowerCase(),
                'text-red-600 border-red-500': showResult && userInput.trim().toLowerCase() !== trainingStore.currentWord.word.toLowerCase()
              }"
              :disabled="showResult"
              :placeholder="trainingStore.currentWord.errorCount > 0 ? '' : '请输入单词...'"
              autocapitalize="off"
              autocomplete="off"
              spellcheck="false"
              @keyup.enter="checkAnswer"
            />
            
            <div v-if="showResult" class="mt-4 animate-fade-in flex flex-col items-center">
              <div class="flex items-center gap-2 mb-1">
                <span class="text-xs font-bold text-gray-400 uppercase tracking-widest">正确答案</span>
              </div>
              <p class="text-2xl font-black text-blue-600 tracking-tight">{{ trainingStore.currentWord.word }}</p>
              <p class="text-sm font-mono text-gray-400 mt-0.5">{{ trainingStore.currentWord.phonetic }}</p>
            </div>
          </div>

          <!-- Result Info (Directly under word/input) -->
          <div v-if="showResult" class="w-full max-w-md bg-blue-50/50 rounded-2xl p-4 border border-blue-100 animate-fade-in text-left">
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
        </div>
      </Transition>

      <!-- Spacer for scrollable if needed, though dictation usually fits -->
      <div class="flex-1 overflow-y-auto px-4 pb-28"></div>
    </div>

    <!-- Actions/Navigation Bar (Fixed at bottom) -->
    <div class="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t p-4 z-50 safe-area-bottom shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.05)]">
      <!-- Input Controls (Only show when not showing result) -->
      <div v-if="!showResult" class="flex gap-3 max-w-md mx-auto">
        <button 
          @click="giveUp"
          class="flex-1 h-12 rounded-xl font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-all active:scale-95 flex items-center justify-center gap-2"
        >
          <HelpCircle class="w-5 h-5" />
          不知道
        </button>
        <button 
          @click="checkAnswer"
          class="flex-[2] h-12 rounded-xl font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all active:scale-95 disabled:opacity-50 disabled:shadow-none"
          :disabled="!userInput.trim()"
        >
          确认
        </button>
      </div>

      <!-- Navigation Controls (Show when showing result) -->
      <div v-else class="flex justify-between items-center max-w-md mx-auto w-full">
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
          class="h-10 px-4 rounded-xl bg-blue-600 text-white font-bold flex items-center gap-1 shadow-lg shadow-blue-200 active:scale-90 transition-all text-sm hover:bg-blue-700"
        >
          {{ isLastQuestion ? '完成' : '下一题' }}
          <ChevronRight class="w-4 h-4" />
        </button>
      </div>
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
</style>
