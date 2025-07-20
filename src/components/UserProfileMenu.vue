<template>
  <div class="user-profile-menu" ref="menuRef">
    <div class="avatar" @click="toggleMenu">U</div>
    <div v-if="isMenuOpen" class="menu-dropdown">
      <div class="menu-header">用户</div>
      <div class="menu-items">
        <a href="#" class="menu-item">我的订阅</a>
        <a href="#" class="menu-item">自定义Agent</a>
        <router-link to="/digital-human" class="menu-item">数字人</router-link>
        <router-link to="/ppt-digital-human" class="menu-item">PPT数字人</router-link>
        <router-link to="/video-chat" class="menu-item">视频聊天</router-link>
        <a href="#" class="menu-item" @click.prevent="openSettings">设置</a>
        <router-link to="/help" class="menu-item">帮助与常见问题解答</router-link>
        <router-link to="/policies" class="menu-item">条款与政策</router-link>
        <div class="menu-item theme-toggle" @click="onToggleTheme">
          <span>{{ currentTheme === 'dark' ? '亮色模式' : '暗色模式' }}</span>
          <span class="theme-icon">{{ currentTheme === 'dark' ? '☀️' : '🌙' }}</span>
        </div>
        <div class="menu-divider"></div>
        <a href="#" class="menu-item logout">注销</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useChatStore } from '@/store'; // 1. 引入 useChatStore

const props = defineProps({ currentTheme: String });
const emit = defineEmits(['toggle-theme']);
const isMenuOpen = ref(false);
const menuRef = ref(null);
const chatStore = useChatStore(); // 2. 获取 store 实例

const toggleMenu = () => { isMenuOpen.value = !isMenuOpen.value; };
const onToggleTheme = () => { emit('toggle-theme'); };

// 3. 新增方法：打开设置弹窗
const openSettings = () => {
  chatStore.openSettingsModal();
  isMenuOpen.value = false; // 点击后关闭用户菜单
};

const handleClickOutside = (event) => {
  if (menuRef.value && !menuRef.value.contains(event.target)) {
    isMenuOpen.value = false;
  }
};
onMounted(() => document.addEventListener('mousedown', handleClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside));
</script>


<style scoped>
/* 样式定义 */
.user-profile-menu {
  position: relative;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background-color: #8ab4f8;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  cursor: pointer;
  border: 2px solid var(--primary-bg);
  transition: transform 0.2s;
}
.avatar:hover {
  transform: scale(1.1);
}

.menu-dropdown {
  position: absolute;
  top: 50px;
  right: 0;
  width: 280px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  color: var(--text-primary);
  overflow: hidden;
}

.menu-header {
  padding: 16px;
  font-weight: 500;
  border-bottom: 1px solid var(--border-color);
}

.menu-items {
  padding: 8px 0;
}

/* router-link 默认会被渲染成 a 标签，所以样式可以通用 */
.menu-item {
  display: block;
  padding: 12px 16px;
  color: var(--text-primary);
  text-decoration: none;
  cursor: pointer;
  transition: background-color 0.2s;
}
.menu-item:hover {
  background-color: var(--hover-bg);
}

.theme-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.menu-divider {
  height: 1px;
  background-color: var(--border-color);
  margin: 8px 0;
}

.logout {
  color: #f28b82; /* 红色以示注销 */
}
</style>