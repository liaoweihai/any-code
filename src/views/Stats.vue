<script setup lang="ts">
import { onMounted, computed, ref } from 'vue';
import { useStatsStore } from '../stores/stats';
import { useFolderStore } from '../stores/folder';
import Header from '../components/common/Header.vue';
import { Calendar, Target, Award, BookOpen, AlertTriangle, ChevronRight, TrendingUp } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const statsStore = useStatsStore();
const folderStore = useFolderStore();
const router = useRouter();

const punchInDays = ref(0);
const weeklyStats = ref<{ date: string; wordsLearned: number }[]>([]);
const currentMonth = ref(new Date());
const calendarData = ref<any[]>([]);

onMounted(async () => {
  await statsStore.fetchDailyStats();
  await folderStore.fetchFolders();
  punchInDays.value = await statsStore.getPunchInDays();
  weeklyStats.value = await statsStore.getRecentWeeklyStats();
  await loadCalendar();
});

const loadCalendar = async () => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  calendarData.value = await statsStore.getTrainingCalendar(year, month);
};

const totalWords = computed(() => {
  return folderStore.folders.reduce((sum, folder) => sum + folder.wordCount, 0);
});

// Chart helper
const maxWeeklyWords = computed(() => {
  const max = Math.max(...weeklyStats.value.map(s => s.wordsLearned), 10);
  return max;
});

// Calendar helpers
const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startingDay = firstDay.getDay(); // 0 is Sunday
  
  const days = [];
  // Padding for previous month
  for (let i = 0; i < startingDay; i++) {
    days.push(null);
  }
  
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    const dateStr = new Date(year, month, i).toISOString().split('T')[0];
    const stat = calendarData.value.find(s => s.date === dateStr);
    days.push({
      day: i,
      date: dateStr,
      words: stat ? stat.wordsLearned : 0,
      hasTraining: stat && (stat.wordsLearned > 0 || stat.totalTrainings > 0)
    });
  }
  return days;
});

const prevMonth = async () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
  await loadCalendar();
};

const nextMonth = async () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
  await loadCalendar();
};

const goToDetail = (type: 'learned' | 'mistakes' | 'all') => {
  router.push(`/stats/detail/${type}`);
};
</script>

<template>
  <div class="h-full bg-gray-50 flex flex-col overflow-hidden">
    <Header title="学习统计" class="shrink-0" />
    
    <div class="flex-1 overflow-y-auto p-4 space-y-6 pb-32">
      <!-- Overview Cards -->
      <div class="grid grid-cols-2 gap-4">
        <button 
          @click="goToDetail('all')"
          class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 active:scale-95 transition-transform text-left"
        >
          <div class="flex items-center gap-2 text-gray-500 mb-2">
            <BookOpen class="w-4 h-4 text-blue-500" />
            <span class="text-xs">总词汇量</span>
          </div>
          <div class="flex items-end justify-between">
            <p class="text-2xl font-bold text-gray-800">{{ totalWords }}</p>
            <ChevronRight class="w-4 h-4 text-gray-300 mb-1" />
          </div>
        </button>
        
        <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
          <div class="flex items-center gap-2 text-gray-500 mb-2">
            <Calendar class="w-4 h-4 text-orange-500" />
            <span class="text-xs">打卡天数</span>
          </div>
          <p class="text-2xl font-bold text-gray-800">{{ punchInDays }} <span class="text-xs font-normal text-gray-400">天</span></p>
        </div>
      </div>

      <!-- Weekly Trend Chart -->
      <section class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
        <div class="flex items-center gap-2 mb-6">
          <TrendingUp class="w-5 h-5 text-blue-600" />
          <h2 class="font-bold text-gray-800">近7天学习趋势</h2>
        </div>
        
        <div class="h-32 flex items-end justify-between gap-2 mb-2">
          <div v-for="stat in weeklyStats" :key="stat.date" class="h-full flex flex-col justify-end items-center flex-1 group relative">
             <!-- Tooltip -->
            <div class="absolute -top-8 bg-gray-800 text-white text-[10px] px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              {{ stat.wordsLearned }} 词
            </div>
            
            <div 
              class="w-full bg-blue-100 rounded-t-md transition-all duration-500 hover:bg-blue-400 relative overflow-hidden"
              :style="{ height: `${Math.max((stat.wordsLearned / maxWeeklyWords) * 100, 4)}%` }"
            >
               <div class="absolute bottom-0 left-0 right-0 bg-blue-500 transition-all duration-500" :style="{ height: stat.wordsLearned > 0 ? '100%' : '0%' }"></div>
            </div>
            <span class="absolute -bottom-5 text-[10px] text-gray-400 w-full text-center">{{ new Date(stat.date).getDate() }}日</span>
          </div>
        </div>
      </section>

    

      <!-- Training Calendar -->
      <section class="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 mb-20">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-gray-800 flex items-center gap-2">
            <Award class="w-5 h-5 text-purple-500" />
            打卡日历
          </h2>
          <div class="flex items-center gap-2 text-sm font-medium text-gray-600">
            <button @click="prevMonth" class="p-1 hover:bg-gray-100 rounded-full"><ChevronRight class="w-4 h-4 rotate-180" /></button>
            <span>{{ currentMonth.getFullYear() }}年{{ currentMonth.getMonth() + 1 }}月</span>
            <button @click="nextMonth" class="p-1 hover:bg-gray-100 rounded-full"><ChevronRight class="w-4 h-4" /></button>
          </div>
        </div>
        
        <div class="grid grid-cols-7 gap-1 text-center mb-2">
          <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day" class="text-xs text-gray-400 py-1">{{ day }}</span>
        </div>
        
        <div class="grid grid-cols-7 gap-1">
          <div 
            v-for="(day, index) in calendarDays" 
            :key="index" 
            class="aspect-square flex flex-col items-center justify-center rounded-lg text-xs relative"
            :class="[
              day ? 'hover:bg-gray-50' : '',
              day?.hasTraining ? 'bg-blue-50 text-blue-600 font-bold border border-blue-100' : 'text-gray-400'
            ]"
          >
            <template v-if="day">
              {{ day.day }}
              <div v-if="day.hasTraining" class="w-1 h-1 bg-blue-500 rounded-full mt-0.5"></div>
            </template>
          </div>
        </div>
      </section>

        <!-- Entry to Mistakes -->
      <button 
        @click="goToDetail('mistakes')"
        class="w-full bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between active:scale-98 transition-transform mb-6"
      >
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center text-red-500">
            <AlertTriangle class="w-5 h-5" />
          </div>
          <div class="text-left">
            <h3 class="font-bold text-gray-800">错题本</h3>
            <p class="text-xs text-gray-400">{{ statsStore.totalStats?.mistakeWords.length || 0 }} 个待复习单词</p>
          </div>
        </div>
        <ChevronRight class="w-5 h-5 text-gray-300" />
      </button>

    </div>
  </div>
</template>
