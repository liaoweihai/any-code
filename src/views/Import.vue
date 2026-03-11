<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useWordStore } from '../stores/word';
import { useFolderStore } from '../stores/folder';
import Header from '../components/common/Header.vue';
import { parseExcel, type ParsedWord } from '../utils/fileParser';
import { Upload, FileSpreadsheet, CheckCircle, AlertCircle } from 'lucide-vue-next';

const route = useRoute();
const router = useRouter();
const wordStore = useWordStore();
const folderStore = useFolderStore();

const folderId = route.params.folderId as string;
const folderName = ref('');
const parsedWords = ref<ParsedWord[]>([]);
const isUploading = ref(false);
const importStatus = ref<'idle' | 'success' | 'error'>('idle');
const errorMessage = ref('');

onMounted(async () => {
  await folderStore.fetchFolders();
  const folder = folderStore.folders.find(f => f.id === folderId);
  if (folder) {
    folderName.value = folder.name;
  }
});

const handleFileUpload = async (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file) return;

  try {
    isUploading.value = true;
    importStatus.value = 'idle';
    parsedWords.value = await parseExcel(file);
  } catch (error) {
    importStatus.value = 'error';
    errorMessage.value = '文件解析失败，请检查文件格式';
    console.error(error);
  } finally {
    isUploading.value = false;
  }
};

const confirmImport = async () => {
  if (parsedWords.value.length === 0) return;

  try {
    isUploading.value = true;
    for (const word of parsedWords.value) {
      await wordStore.addWord({
        folderId,
        word: word.word,
        phonetic: word.phonetic,
        pos: word.pos,
        definition: word.definition,
        example: word.example,
        translation: word.translation,
        consecutiveCorrect: 0,
        consecutiveError: 0,
        isMistake: false
      });
    }
    importStatus.value = 'success';
    setTimeout(() => {
      router.push(`/manage?folderId=${folderId}`);
    }, 1500);
  } catch (error) {
    importStatus.value = 'error';
    errorMessage.value = '导入失败，请重试';
  } finally {
    isUploading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-gray-50">
    <Header title="导入单词" :show-back="true" />
    
    <div class="p-4 max-w-2xl mx-auto">
      <div class="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6">
        <h2 class="font-bold text-gray-800 mb-4">上传表格文件</h2>
        <div class="relative border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 transition-colors bg-gray-50">
          <input 
            type="file" 
            accept=".xlsx,.xls,.csv" 
            class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            @change="handleFileUpload"
          />
          <div v-if="!parsedWords.length">
            <Upload class="w-10 h-10 text-gray-400 mx-auto mb-2" />
            <p class="text-gray-600 font-medium">点击或拖拽上传文件</p>
            <p class="text-xs text-gray-400 mt-1">支持 .xlsx, .xls, .csv 格式</p>
          </div>
          <div v-else>
            <FileSpreadsheet class="w-10 h-10 text-green-500 mx-auto mb-2" />
            <p class="text-gray-800 font-medium">已解析 {{ parsedWords.length }} 个单词</p>
            <p class="text-xs text-blue-500 mt-1 cursor-pointer">重新上传</p>
          </div>
        </div>

        <div class="mt-4 text-xs text-gray-500 bg-blue-50 p-3 rounded-lg">
          <div class="flex justify-between items-center mb-1">
            <p class="font-bold text-blue-700">表格格式要求：</p>
            <a href="/example_words.csv" download class="text-blue-600 underline hover:text-blue-800">下载示例文件</a>
          </div>
          <p>请确保表格包含以下列（顺序不限，建议按顺序）：</p>
          <p>单词 | 音标 | 词性 | 中文释义 | 英文例句 | 中文翻译</p>
        </div>
      </div>

      <div v-if="parsedWords.length > 0" class="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div class="p-4 border-b border-gray-100 flex justify-between items-center">
          <h3 class="font-bold text-gray-800">预览</h3>
          <button 
            @click="confirmImport"
            :disabled="isUploading"
            class="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <span v-if="isUploading">处理中...</span>
            <span v-else>确认导入</span>
          </button>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm text-left">
            <thead class="bg-gray-50 text-gray-500">
              <tr>
                <th class="p-3 font-medium">单词</th>
                <th class="p-3 font-medium">音标</th>
                <th class="p-3 font-medium">释义</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100">
              <tr v-for="(word, index) in parsedWords.slice(0, 5)" :key="index">
                <td class="p-3 font-medium text-gray-800">{{ word.word }}</td>
                <td class="p-3 text-gray-500 font-mono">{{ word.phonetic }}</td>
                <td class="p-3 text-gray-600">{{ word.definition }}</td>
              </tr>
              <tr v-if="parsedWords.length > 5">
                <td colspan="3" class="p-3 text-center text-gray-400 text-xs">
                  ... 还有 {{ parsedWords.length - 5 }} 个单词
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Status Messages -->
      <div v-if="importStatus === 'success'" class="fixed bottom-20 left-1/2 -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2 animate-bounce">
        <CheckCircle class="w-5 h-5" />
        导入成功！
      </div>
      <div v-if="importStatus === 'error'" class="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-lg flex items-center gap-2">
        <AlertCircle class="w-5 h-5" />
        {{ errorMessage }}
      </div>
    </div>
  </div>
</template>
