import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import type { Folder, Word, TrainingRecord, DailyStats } from '../types';

interface VocabularyDB extends DBSchema {
  folders: {
    key: string;
    value: Folder;
    indexes: { 'by-date': Date };
  };
  words: {
    key: string;
    value: Word;
    indexes: {
      'by-folder': string;
      'by-mastery': number;
      'by-last-reviewed': Date;
    };
  };
  trainingRecords: {
    key: string;
    value: TrainingRecord;
    indexes: {
      'by-folder': string;
      'by-date': Date;
    };
  };
  dailyStats: {
    key: string;
    value: DailyStats;
  };
}

const DB_NAME = 'VocabularyApp';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<VocabularyDB>>;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<VocabularyDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Folders store
        if (!db.objectStoreNames.contains('folders')) {
          const folderStore = db.createObjectStore('folders', { keyPath: 'id' });
          folderStore.createIndex('by-date', 'createdAt');
        }

        // Words store
        if (!db.objectStoreNames.contains('words')) {
          const wordStore = db.createObjectStore('words', { keyPath: 'id' });
          wordStore.createIndex('by-folder', 'folderId');
          wordStore.createIndex('by-mastery', 'masteryLevel');
          wordStore.createIndex('by-last-reviewed', 'lastReviewed');
        }

        // Training records store
        if (!db.objectStoreNames.contains('trainingRecords')) {
          const recordStore = db.createObjectStore('trainingRecords', { keyPath: 'id' });
          recordStore.createIndex('by-folder', 'folderId');
          recordStore.createIndex('by-date', 'startTime');
        }

        // Daily stats store
        if (!db.objectStoreNames.contains('dailyStats')) {
          db.createObjectStore('dailyStats', { keyPath: 'date' });
        }
      },
    });
  }
  return dbPromise;
};

export const db = {
  async getFolders() {
    const database = await initDB();
    return database.getAllFromIndex('folders', 'by-date');
  },
  async getFolder(id: string) {
    const database = await initDB();
    return database.get('folders', id);
  },
  async addFolder(folder: Folder) {
    const database = await initDB();
    return database.add('folders', folder);
  },
  async updateFolder(folder: Folder) {
    const database = await initDB();
    return database.put('folders', folder);
  },
  async deleteFolder(id: string) {
    const database = await initDB();
    const tx = database.transaction(['folders', 'words'], 'readwrite');
    await tx.objectStore('folders').delete(id);
    const index = tx.objectStore('words').index('by-folder');
    let cursor = await index.openCursor(IDBKeyRange.only(id));
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  },
  async getWordsByFolder(folderId: string) {
    const database = await initDB();
    return database.getAllFromIndex('words', 'by-folder', folderId);
  },
  async getAllWords() {
    const database = await initDB();
    return database.getAll('words');
  },
  async addWord(word: Word) {
    const database = await initDB();
    return database.add('words', word);
  },
  async updateWord(word: Word) {
    const database = await initDB();
    return database.put('words', word);
  },
  async deleteWord(id: string) {
    const database = await initDB();
    return database.delete('words', id);
  },
  async addTrainingRecord(record: TrainingRecord) {
    const database = await initDB();
    // Use put instead of add to avoid ConstraintError if ID conflict occurs (though uuid should prevent it)
    // Or, ensure ID is unique. Since we use uuid, it should be fine.
    // The error "Key already exists" implies we might be adding the SAME record twice.
    // This happens if finishTraining is called multiple times.
    // We should use 'put' which is an upsert operation.
    return database.put('trainingRecords', record);
  },
  async getTrainingRecords() {
    const database = await initDB();
    return database.getAllFromIndex('trainingRecords', 'by-date');
  },
  async getTrainingRecordsByDateRange(startDate: Date, endDate: Date) {
    const database = await initDB();
    const range = IDBKeyRange.bound(startDate, endDate);
    return database.getAllFromIndex('trainingRecords', 'by-date', range);
  },
  async getDailyStats(date: string) {
    const database = await initDB();
    return database.get('dailyStats', date);
  },
  async getDailyStatsByDateRange(startDate: string, endDate: string) {
    const database = await initDB();
    const range = IDBKeyRange.bound(startDate, endDate);
    return database.getAll('dailyStats', range);
  },
  async updateDailyStats(stats: DailyStats) {
    const database = await initDB();
    return database.put('dailyStats', stats);
  },
  async getWrongWords() {
    const database = await initDB();
    const words = await database.getAll('words');
    return words.filter(w => w.errorCount > 0);
  },
  async updateWords(words: Word[]) {
    const database = await initDB();
    const tx = database.transaction('words', 'readwrite');
    await Promise.all(words.map(word => tx.store.put(word)));
    await tx.done;
  },
  async deleteWords(ids: string[]) {
    const database = await initDB();
    const tx = database.transaction('words', 'readwrite');
    await Promise.all(ids.map(id => tx.store.delete(id)));
    await tx.done;
  }
};
