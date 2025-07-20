<!-- /src/views/DigitalHuman.vue -->
<template>
  <div id="app">
    <div class="container-background">
      <div class="video-chat-container">
        <audio id="audio" autoplay></audio>
        <input type="hidden" id="sessionid" value="0">

        <div class="header">
          <a href="javascript:void(0);" @click="goBack" class="back-link">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
            返回主界面
          </a>
          <div class="status-indicator">
            <div class="status-dot" :class="{ 'connected': isVideoStarted }"></div>
            <span>{{ isVideoStarted ? '已连接' : '未连接' }}</span>
          </div>
        </div>

        <div class="main-content">
          <div class="video-area">
            <video id="video" autoplay playsinline muted></video>
            <div v-if="!isVideoStarted" class="video-placeholder">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"></path>
                <path d="M12 10h-2v2H9v-2H7V9h2V7h1v2h2v1z"></path>
              </svg>
              <h2>数字人视频对话</h2>
              <p>请点击下方的 "开始" 按钮，与AI数字人进行实时互动</p>
            </div>
          </div>

          <div class="chat-area" :class="{ 'minimized': isChatMinimized }">
            <!-- 新增：聊天区域头部和缩放控件 -->
            <div class="chat-area-header">
              <h3 v-if="!isChatMinimized">聊天记录</h3>
              <div class="chat-size-controls">
                <button @click="toggleChatSize" :title="isChatMinimized ? '展开聊天' : '收起聊天'">
                  <svg v-if="isChatMinimized" xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/></svg>
                  <svg v-else xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>
                </button>
              </div>
            </div>

            <!-- 聊天内容，收起时隐藏 -->
            <div v-if="!isChatMinimized" class="chat-content">
              <div class="chat-messages" ref="chatMessagesContainer">
                <div v-for="(msg, index) in chatMessages" :key="index" :class="['message', msg.sender]">
                  {{ msg.text }}
                  <div class="message-time">{{ msg.time }}</div>
                </div>
              </div>

              <div class="chat-input-area">
                <div class="chat-input-wrapper">
                  <input type="text" v-model="newMessage" @keyup.enter="sendMessage" placeholder="输入消息..." :disabled="!isVideoStarted" />
                  <button @click="sendMessage" :disabled="!isVideoStarted || !newMessage.trim()">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"></line>
                      <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="controls-bar">
          <button @click="toggleVideo" class="control-button start" :class="{ 'active': isVideoStarted }" title="开始/停止">
            <div class="icon-container">
              <svg v-if="!isVideoStarted" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12"></rect></svg>
            </div>
            <span>{{ isVideoStarted ? '停止' : '开始' }}</span>
          </button>

          <button @click="toggleMic" class="control-button mic" :class="{ 'muted': !isMicActive }" title="麦克风">
            <div class="icon-container">
              <svg v-if="isMicActive" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8" y1="23" x2="16" y2="23"></line></svg>
              <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="1" y1="1" x2="23" y2="23"></line><path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path><line x1="12" y1="19" x2="12" y2="23"></line><line x1="8"y1="23" x2="16" y2="23"></line></svg>
            </div>
            <span>{{ isMicActive ? '静音' : '取消静音' }}</span>
          </button>
        </div>

        <div v-if="isConnecting" class="connection-indicator">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin">
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
          正在建立安全连接...
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue';
// 假设 streamChat 服务已在 @/services/ollama 中定义
// import { streamChat } from '@/services/ollama';

// --- 响应式状态定义 ---

// 控制视频连接状态
const isVideoStarted = ref(false);
// 控制麦克风状态
const isMicActive = ref(true);
// 控制连接动画
const isConnecting = ref(false);
// 聊天输入框内容
const newMessage = ref('');
// 聊天消息列表
const goBack = () => {
  window.history.back();
};
const chatMessages = ref([
  { text: '你好！我是您的专属AI数字人，准备好开始对话了吗？', sender: 'bot', time: `系统 · ${new Date().toLocaleTimeString()}` }
]);
// 控制聊天区域是否最小化
const isChatMinimized = ref(false);
// 聊天消息容器的引用
const chatMessagesContainer = ref(null);

// --- 核心方法 ---

/**
 * 切换视频的开始/停止状态
 */
const toggleVideo = () => {
  if (isVideoStarted.value) {
    stopVideo();
  } else {
    startVideo();
  }
};

/**
 * 开始视频连接
 */
const startVideo = () => {
  isConnecting.value = true;
  console.log("正在尝试开始 STUN 连接...");

  // 模拟连接延迟
  setTimeout(() => {
    // 检查 client.js 中定义的 start 函数是否存在
    if (window.start) {
      window.start();
      isVideoStarted.value = true;
      addMessage('您好！我已经准备好与您交流，请问有什么可以帮您的？', 'bot', '数字人');
    } else {
      alert("WebRTC 客户端逻辑未找到，请确保相关脚本已正确加载。");
      console.error("window.start 函数未定义！");
    }
    isConnecting.value = false;
  }, 1500);
};

/**
 * 停止视频连接
 */
const stopVideo = () => {
  if (window.pc) {
    window.pc.close();
    window.pc = null;
    console.log("WebRTC 连接已关闭。");
  }
  isVideoStarted.value = false;
  addMessage('视频通话已结束，期待下次与您交流！', 'system', '系统');
};

/**
 * 切换麦克风状态
 */
const toggleMic = async () => {
  isMicActive.value = !isMicActive.value;
  const status = isMicActive.value ? '已取消静音' : '已静音';
  addMessage(`麦克风${status}`, 'system', '系统');

  // 这里可以添加实际控制音轨启用/禁用的逻辑
  // 例如: stream.getAudioTracks().forEach(track => track.enabled = isMicActive.value);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // 在实际应用中，您会使用此流。此处仅为请求权限。
    stream.getTracks().forEach(track => track.stop());
  } catch (err) {
    console.error("访问麦克风时出错:", err);
    alert("无法访问麦克风。请检查浏览器权限。");
    isMicActive.value = false; // 如果出错，则保持静音状态
  }
};

/**
 * 发送聊天消息
 */
const sendMessage = () => {
  const message = newMessage.value.trim();
  const sessionidElement = document.getElementById('sessionid');
  const sessionid = sessionidElement ? parseInt(sessionidElement.value, 10) : 0;

  if (!message || !isVideoStarted.value) {
    if (!isVideoStarted.value) {
      alert('请先点击“开始”建立连接！');
    }
    return;
  }

  if (sessionid === 0) {
    alert('连接尚未完全建立，请稍候！');
    return;
  }

  // 将用户消息添加到聊天窗口
  addMessage(message, 'user', '我');
  const userMessage = newMessage.value;
  newMessage.value = ''; // 立刻清空输入框

  // --- 调用后端API获取机器人回复 ---
  // 注意：这里的 streamChat 是一个示例，您需要替换为实际的API调用
  // 模拟AI回复
  setTimeout(() => {
    const aiResponse = `感谢您的消息：“${userMessage}”。这是一个模拟回复。在实际应用中，我会根据您的消息生成智能回复。`;
    addMessage(aiResponse, 'bot', '数字人');

    // 将回复发送给数字人进行语音播报
    fetch('/human', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: aiResponse, type: 'echo', interrupt: true, sessionid: sessionid })
    });
  }, 1000);

  /*
  // 实际的 streamChat 调用示例
  const systemPrompt = '你是芝麻编程的老师，请你说中文并热心简短回复，禁止输出任何表情符号 /no_think';
  const messagesForOllama = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: userMessage }
  ];
  let fullResponse = '';

  streamChat(
    'qwen3:0.6b',
    messagesForOllama,
    (chunk) => { fullResponse += chunk; }, // 流式接收数据
    () => { // 接收完成后的回调
      const cleanedResponse = fullResponse.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
      addMessage(cleanedResponse, 'bot', '数字人');
      fetch('/human', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: cleanedResponse, type: 'echo', interrupt: true, sessionid: sessionid })
      });
    },
    new AbortController().signal
  );
  */
};

/**
 * 切换聊天窗口大小
 */
const toggleChatSize = () => {
  isChatMinimized.value = !isChatMinimized.value;
};


// --- 辅助函数 ---

/**
 * 向聊天列表中添加新消息并滚动到底部
 * @param {string} text - 消息内容
 * @param {string} sender - 发送者 ('user', 'bot', 'system')
 * @param {string} author - 显示的作者名
 */
const addMessage = (text, sender, author) => {
  chatMessages.value.push({
    text,
    sender,
    time: `${author} · ${new Date().toLocaleTimeString()}`
  });
  scrollToBottom();
};

/**
 * 将聊天容器滚动到最底部
 */
const scrollToBottom = () => {
  nextTick(() => {
    const container = chatMessagesContainer.value;
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
};


// --- 生命周期钩子 ---

let loadedScripts = [];
/**
 * 动态加载外部JS脚本
 * @param {string} src - 脚本路径
 */
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false; // 确保按顺序执行
    script.onload = () => {
      loadedScripts.push(script);
      resolve();
    };
    script.onerror = () => reject(new Error(`加载脚本失败: ${src}`));
    document.body.appendChild(script);
  });
};

onMounted(async () => {
  try {
    // 按顺序加载所需的JS文件
    await loadScript('/js/jquery-3.6.0.min.js');
    await loadScript('/js/sockjs.min.js');
    await loadScript('/js/client.js');
    console.log("所有外部脚本已成功加载。");
  } catch (error) {
    console.error("初始化视频聊天页面时出错:", error);
    alert("页面初始化失败，部分功能可能无法使用。");
  }
  scrollToBottom();
});

onUnmounted(() => {
  // 组件卸载时关闭连接并移除脚本
  if (window.pc) {
    window.pc.close();
  }
  loadedScripts.forEach(s => s.remove());
  loadedScripts = [];
  console.log("组件已卸载，资源已清理。");
});

</script>

<style>
/* --- 全局和基础样式 --- */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}

.container-background {
  width: 100vw;
  height: 100vh;
  background: linear-gradient(135deg, #0d1b2a, #415a77, #1b263b);
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
}

.video-chat-container {
  width: 100%;
  max-width: 1400px;
  height: 90vh;
  max-height: 800px;
  background: rgba(22, 28, 45, 0.7);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  position: relative;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #e0e6f1;
}

/* --- 头部 --- */
.header {
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(13, 27, 42, 0.5);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
  z-index: 10;
}

.back-link {
  color: #e0e6f1;
  text-decoration: none;
  font-size: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: 50px;
  transition: all 0.3s ease;
  background: rgba(0, 122, 255, 0.2);
}

.back-link:hover {
  background: rgba(0, 122, 255, 0.3);
  transform: translateX(-4px);
}

.status-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #9ab;
  font-size: 14px;
}

.status-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: #ff453a;
  transition: all 0.5s ease;
}

.status-dot.connected {
  background-color: #32d74b;
  box-shadow: 0 0 12px #32d74b;
}

/* --- 主内容区域 --- */
.main-content {
  display: flex;
  flex: 1;
  padding: 20px;
  gap: 20px;
  overflow: hidden;
}

.video-area {
  flex: 3;
  border-radius: 16px;
  overflow: hidden;
  background: #000;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  box-shadow: inset 0 2px 10px rgba(0, 0, 0, 0.5);
  transition: flex 0.4s ease-in-out;
}

#video {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
}

.video-placeholder {
  position: absolute;
  color: rgba(255, 255, 255, 0.7);
  text-align: center;
  padding: 20px;
  max-width: 80%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
}
.video-placeholder svg { width: 60px; height: 60px; color: rgba(0, 122, 255, 0.6); }
.video-placeholder h2 { font-weight: 500; font-size: 24px; }
.video-placeholder p { color: #9ab; line-height: 1.6; font-size: 16px; }

/* --- 聊天区域 --- */
.chat-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: rgba(28, 40, 60, 0.5);
  border-radius: 16px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.08);
  transition: flex 0.4s ease-in-out;
  position: relative;
}

/* 聊天区域最小化时的样式 */
.chat-area.minimized {
  flex: 0 0 60px; /* 不拉伸，不收缩，固定宽度 */
}

/* 新增：聊天区域头部 */
.chat-area-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: rgba(13, 27, 42, 0.6);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  flex-shrink: 0;
}
.chat-area.minimized .chat-area-header {
  border-bottom: none; /* 最小化时移除边框 */
  padding: 0;
  justify-content: center;
  align-items: center;
  height: 100%;
}
.chat-area-header h3 {
  font-weight: 500;
  font-size: 16px;
  color: #e0e6f1;
}

/* 新增：聊天区域缩放控件 */
.chat-size-controls button {
  background: none;
  border: none;
  color: #9ab;
  cursor: pointer;
  padding: 5px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}
.chat-size-controls button:hover {
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
}
.chat-area.minimized .chat-size-controls button {
  width: 40px;
  height: 40px;
}

/* 新增：聊天内容容器，用于控制显示/隐藏 */
.chat-content {
  display: flex;
  flex-direction: column;
  flex: 1;
  overflow: hidden;
}

.chat-messages {
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.message {
  max-width: 90%;
  padding: 12px 18px;
  border-radius: 20px;
  font-size: 14px;
  line-height: 1.5;
  color: #fff;
  opacity: 0;
  transform: translateY(10px);
  animation: fadeIn 0.4s ease forwards;
}

@keyframes fadeIn {
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.message.user { background: #007aff; align-self: flex-end; border-bottom-right-radius: 5px; }
.message.bot { background: rgba(80, 90, 110, 0.8); align-self: flex-start; border-bottom-left-radius: 5px; }
.message.system {
  background: rgba(100, 116, 139, 0.5);
  align-self: center;
  font-size: 12px;
  color: #cbd5e1;
  padding: 6px 12px;
}

.message-time {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 5px;
  text-align: right;
}

.chat-input-area {
  padding: 15px;
  background: rgba(13, 27, 42, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  gap: 10px;
}

.chat-input-wrapper {
  flex: 1;
  display: flex;
  background: rgba(13, 27, 42, 0.8);
  border-radius: 25px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: all 0.3s ease;
}
.chat-input-wrapper:focus-within {
  border-color: rgba(0, 122, 255, 0.7);
  box-shadow: 0 0 0 3px rgba(0, 122, 255, 0.3);
}
.chat-input-wrapper input {
  flex: 1;
  background: transparent;
  border: none;
  color: white;
  padding: 12px 20px;
  font-size: 14px;
}
.chat-input-wrapper input:focus { outline: none; }
.chat-input-wrapper input::placeholder { color: #789; }
.chat-input-wrapper button {
  background: #007aff;
  color: white;
  border: none;
  padding: 0 25px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.3s ease;
}
.chat-input-wrapper button:hover { background: #0056b3; }
.chat-input-wrapper button:disabled { background: #3a506b; cursor: not-allowed; }

/* --- 底部控制栏 --- */
.controls-bar {
  position: absolute;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px;
  background: rgba(22, 28, 45, 0.7);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  border-radius: 50px;
  border: 1px solid rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  gap: 15px;
  box-shadow: 0 8px 30px rgba(0,0,0,0.4);
  z-index: 10;
}

.control-button {
  background: none;
  border: none;
  color: #e0e6f1;
  cursor: pointer;
  display: flex;
  /* 修改：将 flex-direction 设置为 row，实现水平布局 */
  flex-direction: row;
  align-items: center;
  /* 修改：调整 gap 以适应水平间距 */
  gap: 10px;
  /* 修改：调整字体大小 */
  font-size: 14px;
  transition: all 0.3s ease;
  /* 修改：让宽度自动适应内容 */
  width: auto;
  /* 修改：为按钮添加一些内边距，使其更美观 */
  padding: 0 15px;
}
.control-button:hover { transform: translateY(-3px); }
.control-button:disabled { opacity: 0.4; cursor: not-allowed; transform: none; }
.control-button:disabled .icon-container { background: rgba(80, 90, 110, 0.5); box-shadow: none; }

.icon-container {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 20px;
  background: rgba(40, 50, 70, 0.8);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  transition: all 0.3s ease;
}
.control-button:hover .icon-container { transform: scale(1.1); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4); }
.icon-container svg { width: 24px; height: 24px; }
.control-button.start .icon-container { background: linear-gradient(135deg, #007aff, #0047ab); }
.control-button.start.active .icon-container { background: linear-gradient(135deg, #ff9500, #ff5e00); }
.control-button.mic .icon-container { background: linear-gradient(135deg, #34c759, #1e8e3e); }
.control-button.mic.muted .icon-container { background: linear-gradient(135deg, #ff3b30, #b02020); }

/* --- 连接指示器 --- */
.connection-indicator {
  position: absolute;
  bottom: 110px; /* 调整位置以避免与控制栏重叠 */
  left: 50%;
  transform: translateX(-50%);
  background: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 8px 20px;
  border-radius: 20px;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  backdrop-filter: blur(5px);
  z-index: 5;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.4); }
  70% { box-shadow: 0 0 0 10px rgba(0, 122, 255, 0); }
  100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0); }
}

.spin {
  animation: spin 1.5s linear infinite;
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* --- 响应式设计 --- */
@media (max-width: 1024px) {
  .main-content {
    flex-direction: column;
  }
  .video-area {
    min-height: 50%;
  }
  .chat-area {
    min-height: 45%;
    flex: 1; /* 在垂直布局中，flex:1 会占据剩余空间 */
  }
  .chat-area.minimized {
    flex: 0 0 60px; /* 最小化时保持固定高度 */
    min-height: 60px;
  }
  .controls-bar {
    position: static;
    transform: none;
    border-radius: 16px;
    margin: 0 20px 20px 20px;
    width: auto;
    justify-content: center;
  }
  .connection-indicator {
    bottom: auto;
    top: 50%;
  }
}

@media (max-width: 600px) {
  .header {
    flex-direction: column;
    gap: 10px;
  }
  .controls-bar {
    gap: 10px;
    padding: 10px;
  }
  .control-button {
    gap: 8px;
    padding: 0 10px;
  }
  .icon-container { width: 45px; height: 45px; }
  .chat-input-wrapper button { padding: 0 20px; }
}
</style>
