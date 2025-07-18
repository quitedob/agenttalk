<template>
  <div class="model-selector-wrapper" ref="selectorRef">
    <button class="current-model-btn" @click="toggleDropdown">
      <span>{{ chatStore.currentModel }}</span>
      <span class="dropdown-icon" :class="{ 'is-open': isDropdownOpen }">▼</span>
    </button>

    <div v-if="isDropdownOpen" class="model-dropdown">
      <div class="dropdown-title">选择你的模型</div>
      <ul>
        <li
            v-for="model in models"
            :key="model.name"
            class="model-option"
            @click="selectModel(model.name)"
        >
          <div class="model-info">
            <div class="model-name">
              {{ model.name }}
              <span v-if="model.tag" class="model-tag">{{ model.tag }}</span>
            </div>
            <div class="model-description">{{ model.description }}</div>
          </div>
          <span v-if="chatStore.currentModel === model.name" class="checkmark">✔</span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useChatStore } from '@/store';

const chatStore = useChatStore();
const isDropdownOpen = ref(false);
const selectorRef = ref(null);

// 模型列表数据
const models = ref([
  { name: 'Qwen3:0.6b', description: '通义千问模型', tag: 'New' },
  { name: 'Qwen3:32b', description: '通义千问模型', tag: 'Pro' },
  { name: 'qwen2.5vl:3b', description: '通义千问视觉模型', tag: '' },
  { name: 'qwen2.5vl:7b', description: '通义千问视觉模型', tag: 'New' },
  { name: 'Gemma3:4b', description: '谷歌Gemma模型', tag: '' },
  { name: 'deepseek-r1:14b', description: '深度探索模型', tag: '' },
  { name: 'deepseek-r1:8b', description: '深度探索模型', tag: 'New' },
]);

// 切换下拉菜单显示
const toggleDropdown = () => {
  isDropdownOpen.value = !isDropdownOpen.value;
};

// 选择一个模型
const selectModel = (modelName) => {
  chatStore.setModel(modelName);
  isDropdownOpen.value = false; // 选择后关闭菜单
};

// 点击外部区域关闭菜单
const handleClickOutside = (event) => {
  if (selectorRef.value && !selectorRef.value.contains(event.target)) {
    isDropdownOpen.value = false;
  }
};

onMounted(() => document.addEventListener('mousedown', handleClickOutside));
onUnmounted(() => document.removeEventListener('mousedown', handleClickOutside));
</script>

<style scoped>
.model-selector-wrapper {
  position: relative;
  z-index: 20;
}

.current-model-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}
.current-model-btn:hover {
  background-color: var(--hover-bg);
}

.dropdown-icon {
  font-size: 12px;
  transition: transform 0.2s;
}
.dropdown-icon.is-open {
  transform: rotate(180deg);
}

.model-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  width: 300px;
  background-color: var(--secondary-bg);
  border: 1px solid var(--border-color);
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
  padding: 8px;
}

.dropdown-title {
  padding: 8px 12px;
  font-size: 14px;
  color: var(--text-secondary);
}

ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.model-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px;
  border-radius: 8px;
  cursor: pointer;
}
.model-option:hover {
  background-color: var(--hover-bg);
}

.model-name {
  font-weight: 500;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}
.model-tag {
  background-color: var(--button-bg);
  color: var(--button-text);
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 10px;
  font-weight: bold;
}
.model-description {
  font-size: 14px;
  color: var(--text-secondary);
  margin-top: 4px;
}

.checkmark {
  font-size: 16px;
  color: var(--button-bg);
}
</style>