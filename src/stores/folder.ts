import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db } from '../utils/indexdb';
import type { Folder } from '../types';
import { v4 as uuidv4 } from 'uuid';

export const useFolderStore = defineStore('folder', () => {
  const folders = ref<Folder[]>([]);

  const fetchFolders = async () => {
    folders.value = await db.getFolders();
  };

  const addFolder = async (name: string) => {
    const newFolder: Folder = {
      id: uuidv4(),
      name,
      createdAt: new Date(),
      updatedAt: new Date(),
      wordCount: 0,
    };
    await db.addFolder(newFolder);
    await fetchFolders();
    return newFolder;
  };

  const updateFolder = async (id: string, name: string) => {
    const folder = folders.value.find(f => f.id === id);
    if (folder) {
      const updatedFolder = { ...folder, name, updatedAt: new Date() };
      await db.updateFolder(updatedFolder);
      await fetchFolders();
    }
  };

  const deleteFolder = async (id: string) => {
    await db.deleteFolder(id);
    await fetchFolders();
  };

  return {
    folders,
    fetchFolders,
    addFolder,
    updateFolder,
    deleteFolder,
  };
});
