import { defineStore } from 'pinia';
import { ref, computed, toRaw } from 'vue';
import { db } from '../utils/indexdb';
import type { Word, TrainingRecord } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const useTrainingStore = defineStore('training', () => {
  const currentTraining = ref<TrainingRecord | null>(null);
  const trainingWords = ref<Word[]>([]);
  const currentIndex = ref(0);
  const correctCount = ref(0);
  const errorCount = ref(0);

  const isFinished = computed(() => {
    return trainingWords.value.length > 0 && currentIndex.value >= trainingWords.value.length;
  });

  const currentWord = computed(() => {
    return trainingWords.value[currentIndex.value];
  });

  const isCurrentAnswered = computed(() => {
    if (!currentTraining.value || !currentWord.value) return false;
    return currentTraining.value.words.some(w => w.wordId === currentWord.value.id);
  });

  const getAnswerForCurrentWord = computed(() => {
    if (!currentTraining.value || !currentWord.value) return null;
    return currentTraining.value.words.find(w => w.wordId === currentWord.value.id);
  });

  const prevWord = () => {
    if (currentIndex.value > 0) {
      currentIndex.value--;
    }
  };

  const nextWord = () => {
    if (currentIndex.value < trainingWords.value.length - 1) {
      currentIndex.value++;
    }
  };

  const startTraining = async (words: Word[], mode: 'recognition' | 'dictation' | 'random', folderId: string, isRandom: boolean = false) => {
    // Determine word order: Random or Sequential
    if (isRandom) {
      trainingWords.value = [...words].sort(() => Math.random() - 0.5);
      currentIndex.value = 0;
    } else {
      // For sequential, we just use the order provided or sort by ID/etc if needed
      trainingWords.value = [...words];
      
      // Restore progress if it's a specific folder (and NOT mistakes)
      if (folderId !== 'all' && folderId !== 'mistakes') {
        const folder = await db.getFolder(folderId);
        currentIndex.value = folder?.progressIndex || 0;
        // If progress is at the end, reset to start
        if (currentIndex.value >= trainingWords.value.length) {
          currentIndex.value = 0;
        }
      } else {
        // For mistakes, we always start from 0 for the selected batch
        currentIndex.value = 0;
      }
    }

    correctCount.value = 0;
    errorCount.value = 0;
    
    currentTraining.value = {
      id: uuidv4(),
      folderId,
      mode,
      startTime: new Date(),
      endTime: new Date(),
      totalWords: words.length,
      correctCount: 0,
      errorCount: 0,
      words: []
    };
  };

  const submitAnswer = async (isCorrect: boolean, userAnswer: string, correctAnswer: string, autoNext: boolean = true) => {
    if (!currentTraining.value) return;

    if (isCorrect) {
      correctCount.value++;
    } else {
      errorCount.value++;
    }

    currentTraining.value.words.push({
      wordId: currentWord.value.id,
      isCorrect,
      userAnswer,
      correctAnswer
    });

    // Update word mastery and mistake logic
    const word = currentWord.value;
    word.reviewCount++;
    word.lastReviewed = new Date();
    
    // Initialize new fields if undefined (migration)
    if (word.consecutiveCorrect === undefined) word.consecutiveCorrect = 0;
    if (word.consecutiveError === undefined) word.consecutiveError = 0;
    if (word.isMistake === undefined) word.isMistake = word.errorCount > 0;

    if (isCorrect) {
      word.correctCount++;
      word.masteryLevel = Math.min(5, word.masteryLevel + 1);
      
      word.consecutiveCorrect++;
      word.consecutiveError = 0;
      
      // Remove from mistake list if correct 4 times in a row
      if (word.isMistake && word.consecutiveCorrect >= 4) {
        word.isMistake = false;
        word.consecutiveCorrect = 0;
      }
    } else {
      word.errorCount++;
      word.masteryLevel = Math.max(0, word.masteryLevel - 1);
      
      word.consecutiveError++;
      word.consecutiveCorrect = 0;
      
      // Add to mistake list logic
      if (!word.isMistake) {
        // If it's the first ever error, add it.
        // OR if it was removed (isMistake=false) and now has 2 consecutive errors.
        if (word.errorCount === 1) {
             word.isMistake = true;
        } else if (word.consecutiveError >= 2) {
             word.isMistake = true;
        }
      }
    }
    await db.updateWord(toRaw(word));

    // Update folder progress if sequential
    if (currentTraining.value.folderId !== 'all' && currentTraining.value.folderId !== 'mistakes' && currentTraining.value.mode !== 'random') {
      const folder = await db.getFolder(currentTraining.value.folderId);
      if (folder) {
        folder.progressIndex = currentIndex.value + 1;
        await db.updateFolder(toRaw(folder));
      }
    }

    if (autoNext) {
      currentIndex.value++;
    }

    if (isFinished.value) {
      await finishTraining();
    }
  };

  const finishTraining = async () => {
    if (!currentTraining.value) return;
    
    // Check if already finished to prevent double submission
    if (currentTraining.value.endTime.getTime() !== currentTraining.value.startTime.getTime()) {
        // If endTime is different from startTime, it might have been updated already?
        // Actually, we initialize startTime and endTime to same value in startTraining.
        // But better flag is a local boolean.
    }
    
    currentTraining.value.endTime = new Date();
    currentTraining.value.correctCount = correctCount.value;
    currentTraining.value.errorCount = errorCount.value;
    
    // Use put in DB to handle potential duplicates safely
    await db.addTrainingRecord(toRaw(currentTraining.value));
    
    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    let dailyStats = await db.getDailyStats(today);
    
    if (!dailyStats) {
      dailyStats = {
        date: today,
        wordsLearned: 0,
        accuracy: 0,
        totalTrainings: 0
      };
    }
    
    dailyStats.wordsLearned += trainingWords.value.length;
    dailyStats.totalTrainings += 1;
    
    const currentAccuracy = (correctCount.value / trainingWords.value.length) * 100;
    dailyStats.accuracy = (dailyStats.accuracy * (dailyStats.totalTrainings - 1) + currentAccuracy) / dailyStats.totalTrainings;
    
    await db.updateDailyStats(toRaw(dailyStats));
    
    // Clear current training to prevent further updates
    currentTraining.value = null;
  };

  return {
    currentTraining,
    trainingWords,
    currentIndex,
    currentWord,
    correctCount,
    errorCount,
    isFinished,
    isCurrentAnswered,
    getAnswerForCurrentWord,
    prevWord,
    nextWord,
    finishTraining,
    startTraining,
    submitAnswer,
  };
});
