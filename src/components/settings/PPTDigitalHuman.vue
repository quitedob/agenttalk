<template>
  <div class="ppt-background">
    <router-link to="/" class="back-link">返回聊天</router-link>

    <div class="background-image-container">
      <img src="@/assets/pptdemo.png" alt="PPT Background" class="background-image" />
    </div>

    <div class="subtitle">PPTDemo演示 - 可拖拽视频窗口</div>

    <div
        ref="videoWindowRef"
        class="video-window"
        :style="{ width: windowSize.width + 'px', height: windowSize.height + 'px', top: windowPos.y + 'px', left: windowPos.x + 'px' }"
        @mousedown="onDragStart"
    >
      <div class="video-header">
        <span>数字人视频演示</span>
        <div class="header-buttons">
          <button @click.stop="toggleFullscreen">⛶</button>
        </div>
      </div>
      <div class="video-content">
        <div class="video-placeholder">
          <h3>视频播放区域</h3>
          <p>此处可以嵌入实时视频流或播放视频文件</p>
        </div>
        <div class="video-controls">
          <button class="control-btn">▶</button>
          <button class="control-btn">⏸</button>
          <button class="control-btn">⏹</button>
          <button class="control-btn">🔊</button>
        </div>
      </div>
      <div class="resizer" @mousedown.stop="onResizeStart"></div>
    </div>

    <div class="instructions">
      <h3>操作指南：</h3>
      <ul>
        <li>拖拽标题栏移动视频窗口</li>
        <li>使用右下角手柄调整窗口大小</li>
        <li>点击右上角按钮切换全屏模式</li>
        <li>使用底部按钮控制视频播放</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
/* 定义淡出动画 */
@keyframes fadeOut {
  from {
    opacity: 1;
  }
  to {
    opacity: 0;
    visibility: hidden; /* 动画结束后隐藏元素 */
  }
}

/* 全局和根容器样式 */
.ppt-background {
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
  color: #fff;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

/* 返回链接样式 */
.back-link {
  position: absolute;
  top: 20px;
  left: 20px;
  color: white;
  text-decoration: none;
  font-size: 16px;
  background: rgba(0,0,0,0.5);
  padding: 8px 16px;
  border-radius: 20px;
  z-index: 10001;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
}

.back-link:hover {
  background: rgba(0,0,0,0.8);
  transform: translateX(-5px);
}

.back-link::before {
  content: "←";
  margin-right: 5px;
}

/* 背景图片容器样式 */
.background-image-container {
  width: 90%;
  height: 90%;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: #0f3460;
  display: flex;
  justify-content: center;
  align-items: center;
}

.background-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  padding: 20px;
}

/* 副标题样式 */
.subtitle {
  position: absolute;
  bottom: calc(5% + 40px); /* 调整位置以适应新的布局 */
  left: 50%;
  transform: translateX(-50%);
  color: white;
  font-size: 28px;
  font-weight: bold;
  text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.8);
  background: rgba(0, 0, 0, 0.5);
  padding: 8px 20px;
  border-radius: 30px;
  letter-spacing: 1px;
}

/* 视频窗口样式 */
.video-window {
  position: absolute;
  border: 1px solid #444;
  background-color: #2c2c2c;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  z-index: 10000;
  overflow: hidden;
  transition: box-shadow 0.3s ease;
}

.video-window:hover {
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.7);
}

/* 视频窗口标题栏样式 */
.video-header {
  height: 36px;
  background: linear-gradient(to right, #3a3a3a, #2d2d2d);
  color: white;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  cursor: grab;
  flex-shrink: 0;
  border-bottom: 1px solid #444;
}

.video-header:active {
  cursor: grabbing;
}

/* 标题栏按钮样式 */
.header-buttons button {
  background: rgba(255, 255, 255, 0.1);
  border: none;
  color: white;
  cursor: pointer;
  font-size: 16px;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  justify-content: center;
  align-items: center;
  transition: all 0.2s ease;
}

.header-buttons button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.1);
}

/* 视频内容区域样式 */
.video-content {
  flex-grow: 1;
  background-color: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
}

/* 视频区域占位符样式 */
.video-placeholder {
  width: 100%;
  height: 92%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  padding: 20px;
  text-align: center;
}

.video-placeholder h3 {
  margin-bottom: 15px;
  font-size: 20px;
  color: #fff;
}

.video-placeholder p {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
  max-width: 80%;
}

/* 视频控制按钮容器样式 */
.video-controls {
  position: absolute;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 10px;
  background: rgba(0, 0, 0, 0.6);
  padding: 8px 16px;
  border-radius: 30px;
}

/* 单个控制按钮样式 */
.control-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 18px;
}

.control-btn:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

/* 大小调整手柄样式 */
.resizer {
  position: absolute;
  width: 20px;
  height: 20px;
  right: 0;
  bottom: 0;
  cursor: nwse-resize;
  z-index: 10;
  background:
      linear-gradient(135deg,
      transparent 0%,
      transparent 50%,
      rgba(255,255,255,0.4) 50%,
      rgba(255,255,255,0.4) 60%,
      transparent 60%,
      transparent 100%
      );
}

/* 操作指南窗口样式 */
.instructions {
  position: absolute;
  bottom: 20px;
  right: 20px;
  background: rgba(0, 0, 0, 0.7);
  padding: 12px 20px;
  border-radius: 10px;
  font-size: 14px;
  max-width: 300px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  z-index: 10002;
  /* 应用动画：名称 持续时间 速度曲线 延迟 forwards表示保持结束状态 */
  animation: fadeOut 1s ease-in-out 5s forwards;
}

.instructions h3 {
  margin-bottom: 8px;
  color: #4dabf7;
  border-bottom: 1px solid #4dabf7;
  padding-bottom: 4px;
}

.instructions ul {
  padding-left: 20px;
  list-style-type: disc;
}

.instructions li {
  margin-bottom: 6px;
  line-height: 1.4;
}

</style>
<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

// --- Draggable and Resizable Window Logic ---
const videoWindowRef = ref(null);
const windowPos = ref({ x: 50, y: 50 });
const windowSize = ref({ width: 500, height: 500 });
const isDragging = ref(false);
const isResizing = ref(false);
const dragStartPos = ref({ x: 0, y: 0 });
const resizeStartSize = ref({ width: 0, height: 0 });

const MIN_WIDTH = 300;
const MIN_HEIGHT = 250;
const MAX_WIDTH = 1200;
const MAX_HEIGHT = 900;

const onDragStart = (e) => {
  if (e.target.classList.contains('resizer') || e.target.tagName === 'BUTTON') return;
  isDragging.value = true;
  dragStartPos.value = {
    x: e.clientX - windowPos.value.x,
    y: e.clientY - windowPos.value.y,
  };
  document.addEventListener('mousemove', onDrag);
  document.addEventListener('mouseup', onDragEnd);
};

const onDrag = (e) => {
  if (!isDragging.value) return;
  windowPos.value = {
    x: e.clientX - dragStartPos.value.x,
    y: e.clientY - dragStartPos.value.y,
  };
};

const onDragEnd = () => {
  isDragging.value = false;
  document.removeEventListener('mousemove', onDrag);
  document.removeEventListener('mouseup', onDragEnd);
};

const onResizeStart = (e) => {
  isResizing.value = true;
  dragStartPos.value = { x: e.clientX, y: e.clientY };
  resizeStartSize.value = { ...windowSize.value };
  document.addEventListener('mousemove', onResize);
  document.addEventListener('mouseup', onResizeEnd);
};

const onResize = (e) => {
  if (!isResizing.value) return;
  const dx = e.clientX - dragStartPos.value.x;
  const dy = e.clientY - dragStartPos.value.y;
  let newWidth = resizeStartSize.value.width + dx;
  let newHeight = resizeStartSize.value.height + dy;

  // Apply constraints
  if (newWidth < MIN_WIDTH) newWidth = MIN_WIDTH;
  if (newHeight < MIN_HEIGHT) newHeight = MIN_HEIGHT;
  if (newWidth > MAX_WIDTH) newWidth = MAX_WIDTH;
  if (newHeight > MAX_HEIGHT) newHeight = MAX_HEIGHT;

  windowSize.value = { width: newWidth, height: newHeight };
};

const onResizeEnd = () => {
  isResizing.value = false;
  document.removeEventListener('mousemove', onResize);
  document.removeEventListener('mouseup', onResizeEnd);
};

const toggleFullscreen = () => {
  const elem = videoWindowRef.value;
  if (!document.fullscreenElement) {
    elem.requestFullscreen().catch(err => {
      alert(`Error attempting to enable full-screen mode: ${err.message} (${err.name})`);
    });
  } else {
    document.exitFullscreen();
  }
};


// --- Digital Human WebRTC Logic (Adapted) ---
let loadedScripts = [];
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => {
      loadedScripts.push(script);
      resolve();
    };
    script.onerror = () => reject(new Error(`Failed to load script ${src}`));
    document.body.appendChild(script);
  });
};

const initializeAndStartDigitalHuman = () => {
  if (window.start) {
    // The client.js script is loaded and its functions are on the window object
    // Automatically start the STUN connection
    console.log("Automatically starting STUN connection...");
    window.start();
  } else {
    console.error("WebRTC client logic (start function) not found.");
  }
};

onMounted(async () => {
  try {
    await loadScript('/js/jquery-3.6.0.min.js');
    await loadScript('/js/sockjs.min.js');
    await loadScript('/js/client.js');
    initializeAndStartDigitalHuman();
  } catch (error) {
    console.error("Failed to initialize digital human page:", error);
  }
});

onUnmounted(() => {
  if (window.pc) {
    window.pc.close();
  }
  loadedScripts.forEach(s => s.remove());
  loadedScripts = [];
});

</script>
