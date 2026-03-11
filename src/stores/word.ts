import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../utils/indexdb';
import type { Word } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { useFolderStore } from './folder';

export const useWordStore = defineStore('word', () => {
  const words = ref<Word[]>([]);
  const currentFolderId = ref<string | null>(null);

  const fetchWords = async (folderId: string) => {
    currentFolderId.value = folderId;
    words.value = await db.getWordsByFolder(folderId);
  };

  const fetchAllWords = async () => {
    words.value = await db.getAllWords();
  };

  const addWord = async (wordData: Omit<Word, 'id' | 'createdAt' | 'updatedAt' | 'masteryLevel' | 'reviewCount' | 'correctCount' | 'errorCount' | 'lastReviewed'>) => {
    const newWord: Word = {
      ...wordData,
      id: uuidv4(),
      masteryLevel: 0,
      reviewCount: 0,
      correctCount: 0,
      errorCount: 0,
      lastReviewed: new Date(),
    };
    await db.addWord(newWord);
    
    // Update folder word count
    const folderStore = useFolderStore();
    const folder = await db.getFolder(wordData.folderId);
    if (folder) {
      folder.wordCount++;
      await db.updateFolder(folder);
      await folderStore.fetchFolders();
    }

    if (currentFolderId.value === wordData.folderId) {
      await fetchWords(wordData.folderId);
    }
    return newWord;
  };

  const updateWord = async (word: Word) => {
    await db.updateWord(word);
    if (currentFolderId.value === word.folderId) {
      await fetchWords(word.folderId);
    }
  };

  const deleteWord = async (id: string, folderId: string) => {
    await db.deleteWord(id);
    
    // Update folder word count
    const folderStore = useFolderStore();
    const folder = await db.getFolder(folderId);
    if (folder) {
      folder.wordCount = Math.max(0, folder.wordCount - 1);
      await db.updateFolder(folder);
      await folderStore.fetchFolders();
    }

    if (currentFolderId.value === folderId) {
      await fetchWords(folderId);
    }
  };

  const deleteWords = async (ids: string[], folderId: string) => {
    await db.deleteWords(ids);
    
    // Update folder word count
    const folderStore = useFolderStore();
    const folder = await db.getFolder(folderId);
    if (folder) {
      folder.wordCount = Math.max(0, folder.wordCount - ids.length);
      await db.updateFolder(folder);
      await folderStore.fetchFolders();
    }

    if (currentFolderId.value === folderId) {
      await fetchWords(folderId);
    }
  };

  const moveWords = async (ids: string[], targetFolderId: string, sourceFolderId: string) => {
    // 1. Get words from DB if they are not in current store (which shouldn't happen usually, but for safety)
    const wordsToMove = words.value.filter(w => ids.includes(w.id));
    
    // 2. Update folderId for these words
    const updatedWords = wordsToMove.map(w => ({ ...w, folderId: targetFolderId }));
    
    // 3. Batch update in DB
    await db.updateWords(updatedWords);
    
    // 4. Update folder counts
    const folderStore = useFolderStore();
    const sourceFolder = await db.getFolder(sourceFolderId);
    const targetFolder = await db.getFolder(targetFolderId);
    
    if (sourceFolder) {
      sourceFolder.wordCount = Math.max(0, sourceFolder.wordCount - ids.length);
      await db.updateFolder(sourceFolder);
    }
    
    if (targetFolder) {
      targetFolder.wordCount += ids.length;
      await db.updateFolder(targetFolder);
    }
    
    // 5. Refresh folders to reflect count changes
    await folderStore.fetchFolders();
    
    // 6. Refresh current word list
    if (currentFolderId.value === sourceFolderId) {
      await fetchWords(sourceFolderId);
    }
  };

  const createFolderAndMoveWords = async (ids: string[], folderName: string, sourceFolderId: string) => {
    const folderStore = useFolderStore();
    const newFolder = await folderStore.addFolder(folderName);
    await moveWords(ids, newFolder.id, sourceFolderId);
  };

  const updateWords = async (wordsToUpdate: Word[]) => {
    // Batch update via DB helper
    await db.updateWords(wordsToUpdate);
    
    // Refresh folder counts if needed - though strictly not needed for just isMistake update
    // But let's keep it clean
    const folderStore = useFolderStore();
    await folderStore.fetchFolders();
    
    // If we are currently viewing a folder, and some updated words belong to it, we should refresh
    if (currentFolderId.value) {
      await fetchWords(currentFolderId.value);
    }
  };

  return {
    words,
    currentFolderId,
    fetchWords,
    fetchAllWords,
    addWord,
    updateWord,
    updateWords,
    deleteWord,
    deleteWords,
    moveWords,
    createFolderAndMoveWords,
  };
});
