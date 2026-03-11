import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../utils/indexdb';
import type { DailyStats, TrainingRecord, Word } from '../types';

export const useStatsStore = defineStore('stats', () => {
  const dailyStats = ref<DailyStats | null>(null);
  const trainingRecords = ref<TrainingRecord[]>([]);
  const totalStats = ref({
    wordsLearned: 0,
    accuracy: 0,
    learnedWords: [] as Word[],
    mistakeWords: [] as Word[],
    unlearnedWords: [] as Word[],
  });

  const fetchDailyStats = async () => {
    // Keep this for simple usage if needed, or expand
    const today = new Date().toISOString().split('T')[0];
    const stats = await db.getDailyStatsByDateRange(today, today);
    if (stats && stats.length > 0) {
      dailyStats.value = stats[0];
    } else {
      dailyStats.value = {
        date: today,
        wordsLearned: 0,
        accuracy: 0,
        totalTrainings: 0
      };
    }
    
    // Always recalculate total stats to ensure freshness (e.g. after training or edits)
    await calculateTotalStats();
  };
  
  const calculateTotalStats = async () => {
    // Calculate total stats
    const allWords = await db.getAllWords();
    const learned = allWords.filter(w => w.reviewCount > 0);
    const mistakes = allWords.filter(w => w.isMistake || (w.isMistake === undefined && w.errorCount > 0)); // Fallback for migration
    const unlearned = allWords.filter(w => w.reviewCount === 0);

    totalStats.value.wordsLearned = learned.length;
    totalStats.value.learnedWords = learned.sort((a, b) => new Date(b.lastReviewed).getTime() - new Date(a.lastReviewed).getTime());
    totalStats.value.mistakeWords = mistakes.sort((a, b) => b.errorCount - a.errorCount);
    totalStats.value.unlearnedWords = unlearned;

    const totalCorrect = learned.reduce((acc, w) => acc + w.correctCount, 0);
    const totalError = learned.reduce((acc, w) => acc + w.errorCount, 0);
    const totalAttempts = totalCorrect + totalError;
    totalStats.value.accuracy = totalAttempts > 0 ? (totalCorrect / totalAttempts) * 100 : 0;
  };

  const getRecentWeeklyStats = async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 6); // Last 7 days including today
    
    // Create map for easy lookup
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    const stats = await db.getDailyStatsByDateRange(startDateStr, endDateStr);
    
    const result: DailyStats[] = [];
    const current = new Date(start);
    // Loop through exactly 7 days
    for (let i = 0; i < 7; i++) {
      const dateStr = current.toISOString().split('T')[0];
      const found = stats.find(s => s.date === dateStr);
      result.push(found || { date: dateStr, wordsLearned: 0, accuracy: 0, totalTrainings: 0 });
      current.setDate(current.getDate() + 1);
    }
    return result;
  };
  
  const getTrainingCalendar = async (year: number, month: number) => {
    const start = new Date(year, month, 1);
    const end = new Date(year, month + 1, 0);
    const startDateStr = start.toISOString().split('T')[0];
    const endDateStr = end.toISOString().split('T')[0];
    
    return await db.getDailyStatsByDateRange(startDateStr, endDateStr);
  };
  
  const getPunchInDays = async () => {
     // Get all daily stats to count punch-in days
     // Since we don't have a specific "punch-in" flag, we assume any day with >0 words learned or trainings is a punch-in
     // For efficiency, maybe just get all keys from dailyStats store? But for now let's reuse what we have or add a helper
     // Actually, we need to know the *count* of days. Let's just assume we want total days active.
     // For now, let's just return a placeholder or implement a simple count if needed.
     // Let's implement a getAllDailyStats in DB helper if strictly needed, but `getDailyStatsByDateRange` with wide range works too.
     const start = new Date(2020, 0, 1); // Arbitrary start
     const end = new Date();
     const stats = await db.getDailyStatsByDateRange(start.toISOString().split('T')[0], end.toISOString().split('T')[0]);
     return stats.filter(s => s.wordsLearned > 0 || s.totalTrainings > 0).length;
  };

  return {
    dailyStats,
    totalStats,
    trainingRecords,
    fetchDailyStats,
    getRecentWeeklyStats,
    getTrainingCalendar,
    getPunchInDays
  };
});
