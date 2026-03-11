export interface Folder {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  wordCount: number;
  progressIndex?: number; // Current training position index
}

export interface Word {
  id: string;
  folderId: string;
  word: string;
  phonetic: string;
  pos: string; // 词性
  definition: string; // 中文释义
  example: string; // 英文例句
  translation: string; // 中文翻译
  masteryLevel: number; // 掌握程度 0-5
  lastReviewed: Date;
  reviewCount: number;
  correctCount: number;
  errorCount: number;
  consecutiveCorrect: number; // Continuous correct count
  consecutiveError: number; // Continuous error count
  isMistake: boolean; // Whether it is in the mistake collection
}

export interface TrainingRecord {
  id: string;
  folderId: string;
  mode: 'recognition' | 'dictation' | 'random';
  startTime: Date;
  endTime: Date;
  totalWords: number;
  correctCount: number;
  errorCount: number;
  words: Array<{
    wordId: string;
    isCorrect: boolean;
    userAnswer: string;
    correctAnswer: string;
  }>;
}

export interface DailyStats {
  date: string; // YYYY-MM-DD
  wordsLearned: number;
  accuracy: number;
  totalTrainings: number;
}
