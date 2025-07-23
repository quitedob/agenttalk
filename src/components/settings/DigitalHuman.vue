<template>
  <div class="digital-human-body-wrapper">
    <div class="container">
      <header>
        <div class="logo">
          <div class="logo-icon">AI</div>
          <h1>数字人交互平台</h1>
        </div>
        <div class="language-switch">
          <router-link to="/" class="back-link">← 返回聊天</router-link>
          <button class="lang-btn active" data-lang="zh">中文</button>
          <button class="lang-btn" data-lang="en">English</button>
        </div>
      </header>

      <div class="main-content">
        <div class="panel">
          <h2><i>⚙️</i> <span data-translate="controlPanel">控制面板</span></h2>
          <div class="control-group">
            <div class="option">
              <input id="use-stun" type="checkbox" checked>
              <label for="use-stun" data-translate="useStun">使用STUN服务器</label>
            </div>
            <div class="btn-group">
              <button id="start"><span data-translate="start">开始</span></button>
              <button id="stop" style="display: none" class="btn-stop"><span data-translate="stop">停止</span></button>
            </div>
          </div>
          <div class="control-group">
            <h3><i>⏺️</i> <span data-translate="recording">录制控制</span></h3>
            <div class="btn-group">
              <button id="btn_start_record" class="btn-record"><span data-translate="startRecording">开始录制</span></button>
              <button id="btn_stop_record" class="btn-record" disabled><span data-translate="stopRecording">停止录制</span></button>
            </div>
          </div>

          <div class="control-group">
            <h3><i>🎙️</i> <span data-translate="asrResultTitle">语音识别结果 (字幕)</span></h3>
            <div id="asr-result-container" class="asr-result-container">
              <p id="asr-text">{{ asrText }}</p>
            </div>
          </div>
          <div class="control-group">
            <h3><i>💬</i> <span data-translate="interaction">数字人交互</span></h3>
            <form id="echo-form">
              <div class="form-group">
                <label data-translate="inputText">输入文本</label>
                <textarea id="message" data-translate-placeholder="inputPlaceholder"></textarea>
              </div>
              <button type="submit" class="submit-btn"><span data-translate="send">发送</span></button>
            </form>
            <input type="hidden" id="sessionid" value="0">
          </div>
          <div class="status-indicators">
            <div class="status-item">
              <div id="connection-status-dot" class="status-dot"></div>
              <span id="connection-status" data-translate="connectionStatus">连接状态: 未连接</span>
            </div>
            <div class="status-item">
              <div id="video-status-dot" class="status-dot"></div>
              <span id="video-status" data-translate="videoStatus">视频: 未启动</span>
            </div>
            <div class="status-item">
              <div id="ice-status-dot" class="status-dot"></div>
              <span id="ice-status">ICE: 未开始</span>
            </div>
          </div>
        </div>
        <div class="panel">
          <h2><i>👁️</i> <span data-translate="mediaDisplay">媒体展示</span></h2>
          <div class="media-container">
            <div class="video-container">
              <video id="video" autoplay playsinline controls></video>
            </div>
            <div class="audio-container">
              <div class="audio-visualizer" id="visualizer">
                <div class="visualizer-bars" id="visualizer-bars"></div>
              </div>
              <audio id="audio" autoplay></audio>
            </div>
          </div>
        </div>
      </div>
      <div class="footer">
        <p data-translate="footerText">© 2025 数字人交互平台 | 基于WebRTC的下一代AI交互系统</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { streamChat } from '@/services/ollama';
import { useChatStore } from '@/store';

// --- 响应式变量 ---
const ollamaResponse = ref('');
const chatStore = useChatStore();
const asrText = ref('请点击"开始"按钮并对麦克风说话...'); // 简化注释：用于存放ASR字幕的响应式变量
let asrPollingInterval = null; // 简化注释：用于存储ASR轮询定时器的ID

// --- 脚本加载 ---
let loadedScripts = [];
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => {
      console.log(`脚本已加载: ${src}`);
      loadedScripts.push(script);
      resolve();
    };
    script.onerror = () => reject(new Error(`加载脚本失败: ${src}`));
    document.body.appendChild(script);
  });
};

// --- ASR 轮询逻辑 ---
/**
 * 简化注释：从后端获取ASR识别结果
 */
const fetchAsrResult = async () => {
  const sessionid = parseInt(document.getElementById('sessionid').value, 10);
  if (sessionid === 0) {
    return; // 简化注释：如果会话ID无效则不执行
  }

  try {
    const response = await fetch('/asr_result', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionid: sessionid }),
    });
    const data = await response.json();
    if (data.code === 0 && data.text) {
      console.log('收到ASR文本:', data.text);
      // 简化注释：将新获取的文本追加到已有文本后面，实现对话记录效果
      const cleanedText = data.text.replace(/^ASR: /i, ''); // 简化注释：移除后端可能附带的 "ASR: " 前缀
      asrText.value += cleanedText;
    }
  } catch (error) {
    console.error('获取ASR结果失败:', error);
  }
};

/**
 * 简化注释：开始轮询获取ASR结果
 */
const startAsrPolling = () => {
  if (asrPollingInterval) {
    clearInterval(asrPollingInterval); // 简化注释：先清除已有的定时器，防止重复
  }
  asrText.value = ''; // 简化注释：每次开始时清空之前的字幕
  // 简化注释：每800毫秒调用一次fetchAsrResult函数
  asrPollingInterval = setInterval(fetchAsrResult, 800);
};

/**
 * 简化注释：停止轮询
 */
const stopAsrPolling = () => {
  if (asrPollingInterval) {
    clearInterval(asrPollingInterval);
    asrPollingInterval = null;
    console.log('ASR轮询已停止。');
  }
};


// --- 页面核心逻辑 ---
const initializePageLogic = () => {
  const $ = window.jQuery;
  if (!$) {
    console.error("jQuery 不可用，初始化中止。");
    return;
  }

  const translations = {
    zh: { controlPanel: "控制面板", useStun: "使用STUN服务器", start: "开始", stop: "停止", recording: "录制控制", startRecording: "开始录制", stopRecording: "停止录制", asrResultTitle: "语音识别结果 (字幕)", interaction: "数字人交互", inputText: "输入文本", inputPlaceholder: "输入您想对数字人说的话，或直接说话...", send: "发送", mediaDisplay: "媒体展示", connectionStatus: "连接状态: 未连接", videoStatus: "视频: 未启动", footerText: "© 2025 数字人交互平台 | 基于WebRTC的下一代AI交互系统" },
    en: { controlPanel: "Control Panel", useStun: "Use STUN Server", start: "Start", stop: "Stop", recording: "Recording Control", startRecording: "Start Recording", stopRecording: "Stop Recording", asrResultTitle: "ASR Result (Subtitles)", interaction: "Digital Human Interaction", inputText: "Input Text", inputPlaceholder: "Enter text or just speak...", send: "Send", mediaDisplay: "Media Display", connectionStatus: "Connection: Disconnected", videoStatus: "Video: Not Started", footerText: "© 2025 Digital Human Platform | Next-gen AI Interaction System" }
  };
  let currentLang = 'zh';

  const applyTranslations = () => {
    $('[data-translate]').each(function() {
      const key = $(this).data('translate');
      $(this).text(translations[currentLang][key]);
    });
    const placeholderKey = $('#message').data('translate-placeholder');
    if (placeholderKey) {
      $('#message').attr('placeholder', translations[currentLang][placeholderKey]);
    }
  };

  if (window.digitalHumanPageInitialized) return;
  window.digitalHumanPageInitialized = true;

  // --- 事件绑定 ---
  $('#start').on('click', function() {
    window.start(); // 简化注释：调用client.js中的全局start函数
    startAsrPolling(); // 简化注释：在建立连接的同时，开始轮询ASR结果
  });

  $('#stop').on('click', function() {
    window.stop(); // 简化注释：调用client.js中的全局stop函数
    stopAsrPolling(); // 简化注释：在断开连接的同时，停止轮询ASR结果
  });

  $('.lang-btn').on('click', function() {
    $('.lang-btn').removeClass('active');
    $(this).addClass('active');
    currentLang = $(this).data('lang');
    applyTranslations();
  });


  $('#echo-form').on('submit', function(e) {
    e.preventDefault();
    const sessionid = parseInt($('#sessionid').val(), 10);
    if (sessionid === 0) {
      alert('请先点击“开始”建立连接！');
      return;
    }

    // 简化注释：优先使用语音识别的文本，如果为空，再使用输入框的文本
    let message = asrText.value.trim();
    if (!message) {
      message = $('#message').val();
    }

    if (!message) {
      alert('请输入或说出您想发送的内容！');
      return;
    }

    console.log('发送给Ollama:', message);

    let fullResponse = '';
    const systemPrompt = '你是芝麻编程的老师，请你说中文并热心简短回复，禁止输出任何表情符号 /no_think';
    const messagesForOllama = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    streamChat(
        'qwen3:0.6b',
        messagesForOllama,
        (chunk) => {
          fullResponse += chunk;
          ollamaResponse.value = fullResponse;
        },
        () => {
          console.log('Ollama流结束，完整回复:', fullResponse);
          const cleanedResponse = fullResponse.replace(/\*其他接受然后\*/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim();
          console.log('清理后发送给数字人的回复:', cleanedResponse);
          fetch('/human', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: cleanedResponse, type: 'echo', interrupt: true, sessionid: sessionid })
          });
        },
        new AbortController().signal
    );

    $('#message').val(''); // 简化注释：提交后清空输入框
    asrText.value = ''; // 简化注释：提交后也清空字幕区，准备下一次对话
  });

  // --- 初始调用 ---
  applyTranslations();
};

// --- Vue生命周期钩子 ---
onMounted(async () => {
  try {
    await loadScript('/js/jquery-3.6.0.min.js');
    await loadScript('/js/client.js'); // 简化注释：确保client.js在初始化逻辑前加载
    initializePageLogic();
  } catch (error) {
    console.error("初始化数字人页面失败:", error);
  }
});

onUnmounted(() => {
  stopAsrPolling(); // 简化注释：组件卸载时确保停止轮询，防止内存泄漏
  loadedScripts.forEach(s => s.remove());
  loadedScripts = [];
  window.digitalHumanPageInitialized = false;
});
</script>

<style>
/* Using a non-scoped style tag to ensure styles are applied globally within this component, just like the original file. */
/* The root wrapper class '.digital-human-body-wrapper' helps prevent these styles from leaking out. */
/* 简化注释：为新增的ASR结果面板添加一些基本样式 */
.asr-result-container {
  background-color: #2c2c2e;
  border: 1px solid #444;
  border-radius: 8px;
  padding: 12px;
  min-height: 80px;
  color: #e0e0e0;
  font-size: 14px;
  line-height: 1.6;
  white-space: pre-wrap; /* 简化注释：让文字可以自动换行 */
  word-wrap: break-word;
}
#asr-text {
  margin: 0;
}
.digital-human-body-wrapper {
  /* CSS Variables */
  --primary: #00c6ff;
  --secondary: #0072ff;
  --dark-bg: #0a192f;
  --card-bg: rgba(15, 35, 65, 0.8);
  --text-light: #e6f1ff;
  --text-secondary: #8892b0;
  --accent: #64ffda;
  --success: #00ff9d;
  --warning: #ffd166;
  --danger: #ef476f;

  /* Global Styles */
  font-family: 'Segoe UI', 'Microsoft YaHei', sans-serif;
  background: linear-gradient(135deg, var(--dark-bg), #0c0e2a);
  color: var(--text-light);
  min-height: 100vh;
  padding: 20px;
  background-attachment: fixed;
  overflow-y: auto; /* 添加垂直滚动条 */
}

.container { max-width: 1400px; margin: 0 auto; }
header { display: flex; justify-content: space-between; align-items: center; padding: 15px 0; margin-bottom: 25px; border-bottom: 1px solid rgba(100, 255, 218, 0.2); }
.logo { display: flex; align-items: center; gap: 15px; }
.logo h1 { font-size: 28px; font-weight: 700; background: linear-gradient(90deg, var(--primary), var(--accent)); -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; }
.logo-icon { width: 50px; height: 50px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24px; font-weight: bold; }
.language-switch { display: flex; gap: 10px; align-items: center; }
.lang-btn { padding: 8px 20px; background: var(--card-bg); border: 1px solid rgba(100, 255, 218, 0.3); color: var(--text-light); border-radius: 30px; cursor: pointer; font-weight: 500; transition: all 0.3s ease; }
.lang-btn:hover, .lang-btn.active { background: var(--primary); color: var(--dark-bg); border-color: var(--primary); }
.main-content { display: grid; grid-template-columns: 1fr 800px; gap: 30px; }
.panel { background: var(--card-bg); border-radius: 16px; padding: 25px; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3); border: 1px solid rgba(100, 255, 218, 0.1); position: relative; overflow: hidden; }
.panel::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(100, 255, 218, 0.05) 0%, rgba(0, 0, 0, 0) 70%); pointer-events: none; }
.panel h2 { font-size: 22px; margin-bottom: 20px; color: var(--accent); display: flex; align-items: center; gap: 10px; }
.panel h2 i { font-size: 24px; font-style: normal; }
.panel h3 { display: flex; align-items: center; gap: 10px; margin-bottom: 10px; }
.panel h3 i { font-style: normal; }
.control-group { margin-bottom: 25px; }
.option { display: flex; align-items: center; margin-bottom: 15px; padding: 10px; background: rgba(10, 25, 47, 0.5); border-radius: 10px; }
input[type="checkbox"] { width: 20px; height: 20px; margin-right: 10px; accent-color: var(--primary); }
.btn-group { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 15px; }
button { padding: 12px 24px; background: linear-gradient(90deg, var(--primary), var(--secondary)); color: white; border: none; border-radius: 30px; cursor: pointer; font-weight: 600; transition: all 0.3s ease; display: flex; align-items: center; justify-content: center; gap: 8px; box-shadow: 0 4px 15px rgba(0, 198, 255, 0.3); }
button:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0, 198, 255, 0.5); }
button:disabled { background: var(--text-secondary); cursor: not-allowed; transform: none; box-shadow: none; }
.btn-stop { background: linear-gradient(90deg, var(--danger), #d90429); box-shadow: 0 4px 15px rgba(239, 71, 111, 0.3); }
.btn-stop:hover { box-shadow: 0 6px 20px rgba(239, 71, 111, 0.5); }
.btn-record { background: linear-gradient(90deg, var(--success), #00c853); box-shadow: 0 4px 15px rgba(0, 255, 157, 0.3); }
.btn-record:hover { box-shadow: 0 6px 20px rgba(0, 255, 157, 0.5); }
.form-group { margin-bottom: 20px; }
textarea { width: 100%; padding: 15px; background: rgba(10, 25, 47, 0.7); border: 1px solid rgba(100, 255, 218, 0.2); border-radius: 10px; color: var(--text-light); font-size: 16px; min-height: 100px; resize: vertical; transition: border-color 0.3s; box-sizing: border-box; }
textarea:focus { outline: none; border-color: var(--primary); }
.submit-btn { background: var(--accent); color: var(--dark-bg); font-weight: 700; padding: 12px 30px; }
.submit-btn:hover { box-shadow: 0 0 15px rgba(100, 255, 218, 0.7); }
.media-container { display: flex; flex-direction: column; gap: 25px; }
.video-container { position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4); background: #000; }
video { width: 100%; height: auto; display: block; background: #000; }
.audio-container { background: rgba(10, 25, 47, 0.5); border-radius: 16px; padding: 20px; display: flex; align-items: center; gap: 15px; }
.audio-visualizer { flex-grow: 1; height: 60px; background: rgba(0, 0, 0, 0.3); border-radius: 10px; position: relative; overflow: hidden; }
.visualizer-bars { display: flex; align-items: flex-end; height: 100%; gap: 2px; padding: 5px; }
.bar { width: 4px; background: var(--primary); border-radius: 2px; height: 10%; transition: height 0.1s ease; }
.status-indicators { display: flex; gap: 20px; margin-top: 15px; }
.status-item { display: flex; align-items: center; gap: 8px; font-size: 14px; color: var(--text-secondary); }
.status-dot { width: 10px; height: 10px; border-radius: 50%; background: var(--text-secondary); }
.status-dot.active { background: var(--success); box-shadow: 0 0 8px var(--success); }
.footer { text-align: center; padding: 30px 0 20px; color: var(--text-secondary); font-size: 14px; margin-top: 40px; border-top: 1px solid rgba(100, 255, 218, 0.1); }
.back-link { color: var(--text-light); text-decoration: none; padding: 8px 20px; background: var(--card-bg); border: 1px solid rgba(100, 255, 218, 0.3); border-radius: 30px; font-weight: 500; transition: all 0.3s ease; }
.back-link:hover { background: var(--accent); color: var(--dark-bg); border-color: var(--accent); }
@media (max-width: 900px) { .main-content { grid-template-columns: 1fr; } header { flex-direction: column; gap: 20px; } .logo { justify-content: center; } }
</style>