// src/router/index.js
import { createRouter, createWebHistory } from 'vue-router';
import Home from '@/views/Home.vue'; // 引入主页视图组件
import HelpCenter from '@/views/HelpCenter.vue'; // 1. 引入帮助中心组件
import TermsAndPolicies from '@/views/TermsAndPolicies.vue'; // 2. 引入条款政策组件
import DigitalHuman from '@/views/DigitalHuman.vue'; // (新增) 引入数字人组件
import PPTDigitalHuman from '@/components/settings/PPTDigitalHuman.vue';
import VideoChat from '@/components/settings/VideoChat.vue';
import PlanPage from '@/components/settings/PlanPage.vue';
import Plan1 from '@/components/settings/plan/Plan1.vue';
import Plan2 from '@/components/settings/plan/Plan2.vue';

const routes = [
    {
        path: '/',
        name: 'Home',
        component: Home
    },
    // 3. 添加帮助中心页面的路由规则
    {
        path: '/help',
        name: 'HelpCenter',
        component: HelpCenter
    },
    // 4. 添加条款与政策页面的路由规则
    {
        path: '/policies',
        name: 'TermsAndPolicies',
        component: TermsAndPolicies
    },
    // (新增) 添加数字人页面的路由规则
    {
        path: '/digital-human',
        name: 'DigitalHuman',
        component: DigitalHuman
    },
    {
        path: '/ppt-digital-human',
        name: 'PPTDigitalHuman',
        component: PPTDigitalHuman
    },
    {
        path: '/video-chat',
        name: 'VideoChat',
        component: VideoChat
    },
    {
        path: '/plan',
        name: 'PlanPage',
        component: PlanPage
    },
    {
        path: '/plan/1',
        name: 'Plan1',
        component: Plan1
    },
    {
        path: '/plan/2',
        name: 'Plan2',
        component: Plan2
    }
];

const router = createRouter({
    history: createWebHistory(),
    routes
});

export default router;