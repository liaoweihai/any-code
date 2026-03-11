<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import { useFolderStore } from '../stores/folder';
import { useWordStore } from '../stores/word';
import Header from '../components/common/Header.vue';
import FolderEdit from '../components/folder/FolderEdit.vue';
import WordList from '../components/word/WordList.vue';
import { Plus, Folder, Upload, Trash2, Edit2, Search, ArrowRight, MoreHorizontal, X, FolderPlus, MoreVertical, Download } from 'lucide-vue-next';
import { useRouter, useRoute } from 'vue-router';
import { exportToExcel } from '../utils/fileParser';

const folderStore = useFolderStore();
const wordStore = useWordStore();
const router = useRouter();
const route = useRoute();

const currentFolderId = ref<string | null>(null);
const showCreateFolder = ref(false);
const showEditFolder = ref(false);
const editingFolderId = ref<string | null>(null);
const editingFolderName = ref('');
const showMenu = ref(false);

// Word Management State
const isEditing = ref(false);
const searchQuery = ref('');
const selectedWordIds = ref<Set<string>>(new Set());
const showMoveModal = ref(false);
const showCreateAndMoveModal = ref(false);

const isFolderView = computed(() => !!currentFolderId.value);
const currentFolder = computed(() => folderStore.folders.find(f => f.id === currentFolderId.value));

const filteredWords = computed(() => {
  if (!searchQuery.value) return wordStore.words;
  const query = searchQuery.value.toLowerCase();
  
  return wordStore.words.filter(w => 
    w.word.toLowerCase().includes(query)
  ).sort((a, b) => {
    // 1. Exact match at start (starts with query)
    const aStarts = a.word.toLowerCase().startsWith(query);
    const bStarts = b.word.toLowerCase().startsWith(query);
    
    if (aStarts && !bStarts) return -1;
    if (!aStarts && bStarts) return 1;
    
    // 2. If both start with query, sort by length (shorter is closer to exact match)
    if (aStarts && bStarts) {
      return a.word.length - b.word.length;
    }
    
    // 3. Otherwise, sort alphabetically
    return a.word.localeCompare(b.word);
  });
});

onMounted(async () => {
  await folderStore.fetchFolders();
  if (route.query.folderId) {
    currentFolderId.value = route.query.folderId as string;
    await wordStore.fetchWords(currentFolderId.value);
  }
});

const handleCreateFolder = async (name: string) => {
  await folderStore.addFolder(name);
  showCreateFolder.value = false;
};

const handleEditFolder = async (name: string) => {
  if (editingFolderId.value) {
    await folderStore.updateFolder(editingFolderId.value, name);
    showEditFolder.value = false;
    editingFolderId.value = null;
  }
};

const openEditFolder = (id: string, name: string, e: Event) => {
  e.stopPropagation();
  editingFolderId.value = id;
  editingFolderName.value = name;
  showEditFolder.value = true;
};

const deleteFolder = async (id: string, e: Event) => {
  e.stopPropagation();
  // Custom confirm dialog logic
  if (confirm('⚠️ 警告\n\n确定要删除这个文件夹吗？\n文件夹内的所有单词也会被永久删除，无法恢复。')) {
    await folderStore.deleteFolder(id);
    if (currentFolderId.value === id) {
      currentFolderId.value = null;
      router.push('/manage');
    }
  }
};

const selectFolder = async (id: string) => {
  currentFolderId.value = id;
  await wordStore.fetchWords(id);
  router.push({ query: { folderId: id } });
  // Reset states
  isEditing.value = false;
  selectedWordIds.value.clear();
  searchQuery.value = '';
};

const goBack = () => {
  currentFolderId.value = null;
  router.push('/manage');
};

const goToImport = () => {
  if (currentFolderId.value) {
    router.push(`/import/${currentFolderId.value}`);
  }
};

const deleteWord = async (id: string) => {
  if (currentFolderId.value && confirm('确定要删除这个单词吗？')) {
    await wordStore.deleteWord(id, currentFolderId.value);
  }
};

// Batch Operations
const toggleSelection = (id: string) => {
  if (selectedWordIds.value.has(id)) {
    selectedWordIds.value.delete(id);
  } else {
    selectedWordIds.value.add(id);
  }
};

const selectAll = () => {
  if (selectedWordIds.value.size === filteredWords.value.length) {
    selectedWordIds.value.clear();
  } else {
    selectedWordIds.value = new Set(filteredWords.value.map(w => w.id));
  }
};

const batchDelete = async () => {
  if (selectedWordIds.value.size === 0) return;
  
  // Custom confirm dialog logic could be implemented here
  // For now, using standard confirm but with clearer message
  if (confirm(`⚠️ 警告\n\n确定要永久删除选中的 ${selectedWordIds.value.size} 个单词吗？\n删除后无法恢复。`)) {
    await wordStore.deleteWords(Array.from(selectedWordIds.value), currentFolderId.value!);
    selectedWordIds.value.clear();
    if (wordStore.words.length === 0) {
      isEditing.value = false;
    }
  }
};

const openMoveModal = () => {
  if (selectedWordIds.value.size === 0) return;
  showMoveModal.value = true;
};

const moveSelectedWords = async (targetFolderId: string) => {
  if (targetFolderId === currentFolderId.value) return;
  await wordStore.moveWords(Array.from(selectedWordIds.value), targetFolderId, currentFolderId.value!);
  showMoveModal.value = false;
  selectedWordIds.value.clear();
  isEditing.value = false;
};

const openCreateAndMoveModal = () => {
  if (selectedWordIds.value.size === 0) return;
  showCreateAndMoveModal.value = true;
};

const handleCreateAndMove = async (folderName: string) => {
  await wordStore.createFolderAndMoveWords(Array.from(selectedWordIds.value), folderName, currentFolderId.value!);
  showCreateAndMoveModal.value = false;
  selectedWordIds.value.clear();
  isEditing.value = false;
};

const handleExport = () => {
  showMenu.value = false;
  if (!currentFolder.value) return;
  
  const wordsToExport = wordStore.words.map(w => ({
    word: w.word,
    phonetic: w.phonetic,
    pos: w.pos,
    definition: w.definition,
    example: w.example,
    translation: w.translation
  }));
  
  exportToExcel(wordsToExport, `${currentFolder.value.name}_单词导出`);
};
</script>

<template>
  <div class="h-full bg-gray-50 flex flex-col overflow-hidden">
    <Header 
      :title="isFolderView ? (currentFolder?.name || '文件夹') : '单词管理'" 
      :show-back="isFolderView"
      :on-back="goBack"
      class="shrink-0"
    />
    
    <!-- Folder List View -->
    <div v-if="!isFolderView" class="flex-1 overflow-y-auto p-4 pb-20">
      <div v-if="folderStore.folders.length === 0" class="flex flex-col items-center justify-center h-full text-gray-400">
        <Folder class="w-16 h-16 mb-4 text-gray-300" />
        <p>暂无文件夹，点击下方按钮创建</p>
      </div>
      
      <div class="grid gap-4">
        <div 
          v-for="folder in folderStore.folders" 
          :key="folder.id"
          @click="selectFolder(folder.id)"
          class="bg-white p-4 rounded-xl border border-gray-100 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-between group cursor-pointer"
        >
          <div class="flex items-center gap-4">
            <Folder class="w-10 h-10 text-blue-100 fill-blue-500" />
            <div>
              <h3 class="font-bold text-gray-800 text-lg">{{ folder.name }}</h3>
              <p class="text-xs text-gray-400 mt-1">{{ folder.wordCount }} 单词</p>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button @click="(e) => openEditFolder(folder.id, folder.name, e)" class="p-2 text-gray-400 hover:text-blue-500 rounded-full hover:bg-blue-50 transition-colors">
              <Edit2 class="w-4 h-4" />
            </button>
            <button @click="(e) => deleteFolder(folder.id, e)" class="p-2 text-gray-400 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <!-- Floating Action Button -->
      <button 
        @click="showCreateFolder = true"
        class="fixed bottom-24 right-6 w-14 h-14 bg-blue-600 rounded-full shadow-lg shadow-blue-200 flex items-center justify-center text-white active:scale-90 transition-transform hover:bg-blue-700 z-50"
      >
        <Plus class="w-8 h-8" />
      </button>
    </div>

    <!-- Word List View -->
    <div v-else class="flex-1 overflow-y-auto p-4 flex flex-col relative">
      <!-- Empty State with Import Button -->
      <div v-if="wordStore.words.length === 0" class="flex-1 flex flex-col items-center justify-center text-gray-400">
        <Folder class="w-16 h-16 mb-4 text-gray-300" />
        <p class="mb-6">文件夹暂无单词</p>
        <button 
          @click="goToImport"
          class="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg shadow-blue-200 active:scale-95 transition-transform hover:bg-blue-700"
        >
          <Upload class="w-5 h-5" />
          导入单词
        </button>
      </div>

      <!-- Word List Content -->
      <div v-else class="flex-1 flex flex-col overflow-hidden">
        <!-- Toolbar -->
        <div class="flex items-center justify-between mb-4 shrink-0 gap-3">
          <div class="flex-1 relative">
            <Search class="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              v-model="searchQuery"
              type="text" 
              placeholder="搜索单词..." 
              class="w-full pl-9 pr-4 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-100 outline-none"
            />
          </div>
          
          <div class="flex items-center gap-2 relative">
            <button 
              @click="showMenu = !showMenu"
              class="p-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              title="更多操作"
            >
              <MoreVertical class="w-5 h-5" />
            </button>
            
            <!-- Dropdown Menu -->
            <div v-if="showMenu" class="absolute top-full right-0 mt-2 w-32 bg-white rounded-xl shadow-xl border border-gray-100 py-1 z-50 animate-fade-in origin-top-right">
              <button 
                @click="goToImport"
                class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Upload class="w-4 h-4 text-blue-500" />
                导入单词
              </button>
              <button 
                @click="handleExport"
                class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Download class="w-4 h-4 text-green-500" />
                导出单词
              </button>
              <div class="h-px bg-gray-100 my-1"></div>
              <button 
                @click="() => { isEditing = !isEditing; showMenu = false; }"
                class="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <MoreHorizontal class="w-4 h-4 text-purple-500" />
                {{ isEditing ? '退出管理' : '批量管理' }}
              </button>
            </div>
            
            <!-- Backdrop for menu -->
            <div v-if="showMenu" @click="showMenu = false" class="fixed inset-0 z-40 cursor-default"></div>
          </div>
        </div>

        <!-- Batch Action Bar (Only visible when editing) -->
        <div v-if="isEditing" class="flex items-center justify-between bg-white p-3 rounded-xl border border-blue-100 shadow-sm mb-4 shrink-0 animate-fade-in">
          <div class="flex items-center gap-2">
            <button @click="selectAll" class="text-sm font-bold text-blue-600 px-2">
              {{ selectedWordIds.size === filteredWords.length ? '取消全选' : '全选' }}
            </button>
            <span class="text-xs text-gray-400">已选 {{ selectedWordIds.size }} 项</span>
          </div>
          <div class="flex items-center gap-1">
            <button 
              @click="openMoveModal"
              :disabled="selectedWordIds.size === 0"
              class="p-2 text-gray-600 hover:text-blue-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="移动到..."
            >
              <ArrowRight class="w-5 h-5" />
            </button>
            <button 
              @click="batchDelete"
              :disabled="selectedWordIds.size === 0"
              class="p-2 text-gray-600 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
              title="删除"
            >
              <Trash2 class="w-5 h-5" />
            </button>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto -mx-4 px-4 pb-20">
          <WordList 
            :words="filteredWords" 
            :is-editing="isEditing"
            :selected-ids="selectedWordIds"
            :search-query="searchQuery"
            @delete="deleteWord" 
            @toggle-select="toggleSelection"
          />
        </div>
      </div>
    </div>

    <!-- Modals -->
    <FolderEdit 
      :is-open="showCreateFolder" 
      mode="create"
      @close="showCreateFolder = false" 
      @save="handleCreateFolder" 
    />

    <FolderEdit 
      :is-open="showEditFolder"
      mode="edit"
      :initial-name="editingFolderName"
      @close="showEditFolder = false" 
      @save="handleEditFolder" 
    />

    <!-- Move to Folder Modal -->
    <div v-if="showMoveModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div class="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl flex flex-col max-h-[80vh]">
        <div class="flex justify-between items-center mb-4">
          <h3 class="text-lg font-bold text-gray-800">移动到文件夹</h3>
          <button @click="showMoveModal = false" class="text-gray-400 hover:text-gray-600">
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="flex-1 overflow-y-auto min-h-0 space-y-2 mb-4">
          <button 
            @click="openCreateAndMoveModal"
            class="w-full p-3 rounded-xl border border-dashed border-blue-300 text-blue-600 flex items-center gap-3 hover:bg-blue-50 font-bold"
          >
            <FolderPlus class="w-5 h-5" />
            新建文件夹
          </button>
          
          <button 
            v-for="folder in folderStore.folders.filter(f => f.id !== currentFolderId)" 
            :key="folder.id"
            @click="moveSelectedWords(folder.id)"
            class="w-full p-3 rounded-xl border border-gray-100 flex items-center gap-3 hover:bg-gray-50 text-left"
          >
            <Folder class="w-5 h-5 text-gray-400" />
            <span class="font-medium text-gray-700">{{ folder.name }}</span>
            <span class="text-xs text-gray-400 ml-auto">{{ folder.wordCount }} 词</span>
          </button>
        </div>
      </div>
    </div>
    
    <!-- Create and Move Modal (Reusing FolderEdit logic basically, but simpler inline or reused) -->
    <!-- We can reuse FolderEdit for this actually, just needs a different handler -->
    <FolderEdit 
      :is-open="showCreateAndMoveModal"
      mode="create"
      @close="showCreateAndMoveModal = false" 
      @save="handleCreateAndMove" 
    />
  </div>
</template>
