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
        <p data-translate="footerText">© 2023 数字人交互平台 | 基于WebRTC的下一代AI交互系统</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, onUnmounted, ref } from 'vue';
import { streamChat } from '@/services/ollama';
import { useChatStore } from '@/store'; // 1. (保持) 引入 Pinia store

// 响应式变量，用于存储来自 Ollama 的消息
const ollamaResponse = ref('');
const chatStore = useChatStore(); // 2. (保持) 获取 store 实例

// 简化注释：用于存储已加载的脚本元素
let loadedScripts = [];
const loadScript = (src) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false; // 简化注释：确保脚本按顺序执行
    script.onload = () => {
      console.log(`脚本已加载: ${src}`);
      loadedScripts.push(script);
      resolve();
    };
    script.onerror = () => reject(new Error(`加载脚本失败: ${src}`));
    document.body.appendChild(script);
  });
};

const initializePageLogic = () => {
  // 简化注释：确保 jQuery 已加载
  const $ = window.jQuery;
  if (!$) {
    console.error("jQuery 不可用，初始化中止。");
    return;
  }

  // 简化注释：多语言翻译文本
  const translations = {
    zh: { controlPanel: "控制面板", useStun: "使用STUN服务器", start: "开始", stop: "停止", recording: "录制控制", startRecording: "开始录制", stopRecording: "停止录制", interaction: "数字人交互", inputText: "输入文本", inputPlaceholder: "输入您想对数字人说的话...", send: "发送", mediaDisplay: "媒体展示", connectionStatus: "连接状态: 未连接", videoStatus: "视频: 未启动", footerText: "© 2025 数字人交互平台 | 基于WebRTC的下一代AI交互系统" },
    en: { controlPanel: "Control Panel", useStun: "Use STUN Server", start: "Start", stop: "Stop", recording: "Recording Control", startRecording: "Start Recording", stopRecording: "Stop Recording", interaction: "Digital Human Interaction", inputText: "Input Text", inputPlaceholder: "Enter text to interact with digital human...", send: "Send", mediaDisplay: "Media Display", connectionStatus: "Connection: Disconnected", videoStatus: "Video: Not Started", footerText: "© 2023 Digital Human Platform | Next-gen AI Interaction System" }
  };
  let currentLang = 'zh';


  const applyTranslations = () => {
    $('[data-translate]').each(function() {
      const key = $(this).data('translate');
      if ($(this).data('dynamic') !== true) {
        $(this).text(translations[currentLang][key]);
      }
    });
    const placeholderKey = $('#message').data('translate-placeholder');
    if(placeholderKey) {
      $('#message').attr('placeholder', translations[currentLang][placeholderKey]);
    }
  };


  const initVisualizer = () => {
    const barsContainer = $('#visualizer-bars');
    if (barsContainer.children().length > 0) return;
    for (let i = 0; i < 32; i++) {
      barsContainer.append('<div class="bar"></div>');
    }
    setInterval(() => {
      $('.bar').each(function() {
        $(this).css('height', (Math.floor(Math.random() * 80) + 10) + '%');
      });
    }, 100);
  };


  const showMessageSentFeedback = () => {
    const btn = $('#echo-form button[type="submit"]');
    const originalText = btn.find('span').text();
    btn.prop('disabled', true).find('span').text(currentLang === 'zh' ? '发送中...' : 'Sending...');
    setTimeout(() => {
      btn.find('span').text(currentLang === 'zh' ? '✓ 已发送' : '✓ Sent');
      setTimeout(() => {
        btn.find('span').text(originalText);
        btn.prop('disabled', false);
      }, 1500);
    }, 800);
  };

  if(window.digitalHumanPageInitialized) return;
  window.digitalHumanPageInitialized = true;

  // --- 事件绑定 ---
  $('#start').on('click', window.start);
  $('#stop').on('click', window.stop);

  $('.lang-btn').on('click', function() {
    $('.lang-btn').removeClass('active');
    $(this).addClass('active');
    currentLang = $(this).data('lang');
    applyTranslations();
  });


  $('#echo-form').on('submit', function(e) {
    e.preventDefault();
    const message = $('#message').val();
    const sessionid = parseInt($('#sessionid').val(), 10);
    if (sessionid === 0) {
      alert('请先点击“开始”建立连接！');
      return;
    }

    console.log('Sending to Ollama:', message);

    // 用于累积Ollama的响应
    let fullResponse = '';

    // 1. (修改) 定义系统提示词，并添加 /no_think 指令以关闭内部推理
    const systemPrompt = '你是芝麻编程的老师，请你说中文并热心简短回复，禁止输出任何表情符号 /no_think';

    // 构建包含 system 和 user 消息的数组
    const messagesForOllama = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    // 调用Ollama服务
    streamChat(
        'qwen3:0.6b', // 2. (修改) 直接指定使用的模型为 'qwen3:0.6b'
        messagesForOllama,
        (chunk) => {
          // 实时处理流式数据
          fullResponse += chunk;
          ollamaResponse.value = fullResponse;
        },
        () => {
          // 流结束时的回调
          console.log('Ollama stream finished. Full response:', fullResponse);

          // 3. (新增) 清理Ollama响应中不需要的文本
          const cleanedResponse = fullResponse.replace(/\*其他接受然后\*/g, '').replace(/<think>[\s\S]*?<\/think>/g, '').trim(); // 清理无用文字并移除所有 <think> 标签及内部内容:contentReference[oaicite:0]{index=0}

          console.log('Cleaned response sent to human:', cleanedResponse);

          // 将清理后的Ollama完整响应发送给数字人
          fetch('/human', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // 4. (修改) 使用清理后的响应
            body: JSON.stringify({ text: cleanedResponse, type: 'echo', interrupt: true, sessionid: sessionid })
          }).then(res => res.json()).then(data => console.log('Human response:', data)).catch(err => console.error('Human error:', err));

          showMessageSentFeedback();
        },
        new AbortController().signal // 中止信号
    );

    $('#message').val('');
  });

  $('#btn_start_record').on('click', function() {
    $(this).prop('disabled', true);
    $('#btn_stop_record').prop('disabled', false);
  });

  $('#btn_stop_record').on('click', function() {
    $(this).prop('disabled', true);
    $('#btn_start_record').prop('disabled', false);
  });

  // --- 初始调用 ---
  applyTranslations();
  initVisualizer();
};

// Vue 组件挂载后执行
onMounted(async () => {
  try {
    // 按顺序加载必要的 JS 库
    await loadScript('/js/jquery-3.6.0.min.js');
    await loadScript('/js/sockjs.min.js');
    await loadScript('/js/client.js');

    // 所有脚本加载完毕后，初始化页面逻辑
    initializePageLogic();
  } catch (error) {
    console.error("初始化数字人页面失败:", error);
  }
});

// Vue 组件卸载时执行清理
onUnmounted(() => {
  loadedScripts.forEach(s => s.remove());
  loadedScripts = [];
  window.digitalHumanPageInitialized = false;
});
</script>

<style>
/* Using a non-scoped style tag to ensure styles are applied globally within this component, just like the original file. */
/* The root wrapper class '.digital-human-body-wrapper' helps prevent these styles from leaking out. */

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
.main-content { display: grid; grid-template-columns: 1fr 600px; gap: 30px; }
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