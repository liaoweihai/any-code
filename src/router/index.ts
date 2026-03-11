import { createRouter, createWebHistory } from 'vue-router';
import Home from '../views/Home.vue';
import Manage from '../views/Manage.vue';
import Training from '../views/Training.vue';
import Stats from '../views/Stats.vue';
import Import from '../views/Import.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home,
    },
    {
      path: '/manage',
      name: 'manage',
      component: Manage,
    },
    {
      path: '/train/:mode',
      name: 'training',
      component: Training,
    },
    {
      path: '/stats',
      name: 'stats',
      component: Stats,
    },
    {
      path: '/stats/detail/:type',
      name: 'stats-detail',
      component: () => import('../views/StatsDetail.vue'),
    },
    {
      path: '/import/:folderId',
      name: 'import',
      component: Import,
    },
  ],
});

export default router;
