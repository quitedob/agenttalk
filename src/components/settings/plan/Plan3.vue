<template>
  <div class="page-container">
    <header class="header">
      <button @click="goBack" class="back-button">← 返回上一页</button>
      <nav class="chapter-nav">
        <button @click="scrollTo('chapter1')">1. 现状分析</button>
        <button @click="scrollTo('chapter2')">2. 新架构</button>
        <button @click="scrollTo('chapter3')">3. 后端实现</button>
        <button @click="scrollTo('chapter4')">4. 前端修改</button>
        <button @click="scrollTo('chapter5')">5. 部署执行</button>
      </nav>
    </header>

    <main class="content">
      <h1>实时语音驱动数字人企业级架构：集成 FunASR 与 Ollama</h1>

      <h2 id="chapter1">语音交互的架构重构</h2>
      <p>本报告详细阐述了将现有“LiveTalking”数字人平台从文本驱动、请求-响应模式的系统，全面升级为完全交互式、实时语音驱动的对话代理所需的架构改造。新提出的架构旨在满足集成流式自动语音识别（ASR）服务 FunASR 和本地大语言模型（LLM）Ollama 的核心需求，同时将处理逻辑从客户端根本性地转移到一个健壮、可扩展的后端。</p>

      <h2>现有“LiveTalking”系统分析（现状）</h2>
      <p>通过审查所提供的源代码，我们发现现有架构非常适合其最初的设计目的，但完全不足以支持实时语音交互。该系统的核心逻辑基于一个客户端-服务器模型，其中客户端负责生成完整的文本字符串，然后将其发送到后端进行处理。</p>
      <p>后端采用 aiohttp 构建，暴露了一系列 HTTP POST 端点，其中最主要的是 <code>/human</code>。此端点设计用于接收包含预先格式化好的文本字符串的 JSON 载荷。客户端的实现，例如 <code>dashboard.html</code> 及其关联的 <code>client.js</code>，使用一个 <code>&lt;textarea&gt;</code> 元素作为用户输入。用户输入消息，点击按钮，然后分派一个 <code>fetch</code> 请求。这是一个经典的、同步的请求-响应模式。</p>
      <p>更现代的前端组件 <code>videochat.vue</code>，虽然使用了 Vue.js 框架，但仍然遵循这种以文本为中心的范式。它包含一个聊天输入区域和一个用于打包文本以进行 API 调用的 <code>sendMessage</code> 方法。</p>
      <p>这种设计为语音驱动系统带来了几个关键限制：</p>
      <ul>
        <li><strong>高延迟：</strong> 用户的整句话必须在客户端完全转写后才能发送数据到服务器，这造成了严重且不自然的延迟。</li>
        <li><strong>客户端负担过重：</strong> 它错误地将复杂的 AI 处理（ASR）责任放在了客户端设备上，而客户端设备通常资源有限且环境多变。</li>
        <li><strong>缺乏实时反馈：</strong> 在收到完整的消息之前，后端对会话一无所知，这妨碍了任何形式的实时互动或打断。</li>
        <li><strong>可扩展性问题：</strong> 此模型无法扩展以适应连续的音频流，音频流与离散的文本消息在本质上是不同的。</li>
      </ul>

      <h2 id="chapter2">新提出的语音驱动架构（目标）</h2>
      <p>为了克服这些限制，我们提出了一种新的架构。该设计围绕一个持久的、双向的通信通道和明确的关注点分离，将后端视为所有 AI 服务的中央编排枢纽。这与构建实时、分布式系统的现代最佳实践相一致。</p>
      <p>新的数据流利用了 WebSocket，这是一种专为在单个、长连接上进行全双工通信而设计的协议，对于流式应用至关重要。客户端的角色被简化为瘦客户端，仅负责原始数据的捕获和传输。</p>
      <h3>架构数据流：</h3>
      <ol>
        <li><strong>客户端 (Vue.js)：</strong> 浏览器的 <code>MediaRecorder</code> API 从用户的麦克风捕获原始音频。此音频被打包成小的 <code>Blob</code> 数据块。</li>
        <li><strong>音频入口 (WebSocket)：</strong> 这些音频 Blob 立即通过一个持久的 WebSocket 连接发送到 aiohttp 后端上的一个新端点。</li>
        <li><strong>后端编排 (ASR)：</strong> aiohttp 服务器接收二进制音频数据流。然后，它将此流逐块转发到 FunASR ASR 服务，该服务作为一个独立的、专用的微服务运行。</li>
        <li><strong>ASR 服务 (FunASR)：</strong> FunASR WebSocket 服务器对传入的音频流进行实时语音转文本，并在识别出文本片段时将其发回。</li>
        <li><strong>后端编排 (LLM)：</strong> aiohttp 服务器从 FunASR 接收转写的文本。在检测到完整或接近完整的语句后，它将文本转发到同样作为独立微服务运行的 Ollama LLM 服务。</li>
        <li><strong>LLM 服务 (Ollama)：</strong> Ollama API 处理文本并生成响应，该响应以流的形式逐块返回到 aiohttp 服务器。</li>
        <li><strong>后端编排 (渲染)：</strong> aiohttp 服务器接收 LLM 的文本响应。它立即将这些文本块转发到现有的数字人渲染管线 (<code>nerfreal.put_msg_txt</code>)，该管线负责文本转语音（TTS）和虚拟形象动画。这重用了经过验证的渲染逻辑，无需修改。</li>
      </ol>
      <p>这种架构模式引入了一个关键原则：<strong>服务解耦</strong>。我们将 FunASR 和 Ollama 作为外部独立服务对待，而不是将它们的库直接集成到主 <code>app.py</code> 进程中。这一决策对于构建生产级系统至关重要。单体式方法会将 Web 服务器的 I/O 事件循环与计算密集型、且常常是阻塞式的 AI 模型推理紧密耦合。这将导致资源争用、可扩展性差，以及在管理依赖或升级单个组件时极为困难。</p>
      <p>通过将 ASR 和 LLM 视为微服务，主应用程序变成了一个轻量级的编排器。这种设计提供了卓越的可扩展性，因为每个服务都可以根据其特定负载独立扩展。它增强了系统的健壮性，因为一个服务的故障不太可能导致整个系统崩溃。最重要的是，它直接解决了用户“并行保留多种解决方案”的需求。从本地 FunASR 实例切换到基于云的 ASR 提供商，或从一个 Ollama 模型切换到另一个，都变成了一个简单的配置更改——修改命令行参数中的一个 URI——而不是复杂的代码重构和重新部署过程。这种架构选择为企业级平台提供了必要的灵活性和可维护性。</p>

      <h1 id="chapter3">后端实现：AI 处理中心</h1>
      <p>本节提供了重构 Python 后端的完整代码和详细分析。现有的 <code>app.py</code> 将增加一个实时音频入口点，并引入两个新模块 <code>asr_manager.py</code> 和 <code>llm_manager.py</code>，用于管理与外部 AI 服务的通信。</p>

      <h2>通过 WebSocket 建立实时音频入口</h2>
      <p>为了处理来自客户端的连续音频流，必须向 aiohttp 应用程序添加一个新的 WebSocket 端点。这为实时通信提供了必要的持久、低延迟的通道。</p>
      <h3>app.py 修改（新增部分）：</h3>
      <pre><code class="language-python">
# 在 app.py 中，添加必要的导入
import websockets
from aiohttp import web, WSMsgType
from asr_manager import FunASRManager
from llm_manager import OllamaManager
import asyncio

#... (已有代码)...

async def websocket_audio_handler(request):
    """处理音频流的WebSocket处理器"""
    session_id = int(request.match_info['session_id'])
    ws_server = web.WebSocketResponse()
    await ws_server.prepare(request)

    logger.info(f"会话 {session_id} 的 WebSocket 连接已建立")

    if session_id not in nerfreals:
        logger.error(f"WebSocket 连接未找到会话 ID {session_id}")
        await ws_server.close(code=1011, message=b'Session not found')
        return ws_server

    # 获取此会话已存在的 nerfreal 实例
    nerfreal_instance = nerfreals[session_id]

    # 使用配置的 URI 初始化 AI 服务管理器
    asr_manager = FunASRManager(opt.asr_uri)
    llm_manager = OllamaManager(opt.llm_uri, opt.llm_model)

    try:
        # 创建一个队列，用于将转写的文本从 ASR 传递给 LLM
        transcription_queue = asyncio.Queue()

        # 创建用于处理 ASR 和 LLM 的任务
        asr_task = asyncio.create_task(
            asr_manager.run(transcription_queue)
        )
        llm_task = asyncio.create_task(
            llm_manager.process_transcriptions(transcription_queue, nerfreal_instance)
        )

        async for msg in ws_server:
            if msg.type == WSMsgType.BINARY:
                # 将二进制音频数据转发给 ASR 管理器
                await asr_manager.send_audio(msg.data)
            elif msg.type == WSMsgType.TEXT:
                # 处理控制消息，例如，标记语音结束
                if msg.data == '{"is_speaking": false}':
                    await asr_manager.mark_end_of_speech()
            elif msg.type == WSMsgType.ERROR:
                logger.error(f"WebSocket 连接因异常关闭: {ws_server.exception()}")

    except Exception as e:
        logger.error(f"会话 {session_id} 的 WebSocket 处理器出错: {e}")
    finally:
        logger.info(f"正在关闭会话 {session_id} 的 WebSocket 连接")
        await asr_manager.close()
        asr_task.cancel()
        llm_task.cancel()
        await asyncio.gather(asr_task, llm_task, return_exceptions=True)

    return ws_server

#... (在主代码块中)...
if __name__ == '__main__':
    #... (已有的参数解析)...
    # 添加用于 AI 服务 URI 的新参数 (在第 4 节中详述)

    appasync = web.Application(client_max_size=1024**2*100)
    appasync.on_shutdown.append(on_shutdown)

    # 添加新的 WebSocket 路由
    appasync.router.add_get("/ws/audio/{session_id}", websocket_audio_handler)

    # 添加已有的路由
    appasync.router.add_post("/offer", offer)
    #... (其余路由)...

    #... (主代码块的其余部分)...
      </code></pre>
      <p>此处理器使用 <code>session_id</code> 进行参数化，以便将音频流与正确的数字人实例关联起来。它监听传入的消息，特别是将二进制数据（<code>WSMsgType.BINARY</code>）转发到 ASR 处理管道。它还处理一个基于文本的控制消息来标志一句话的结束，这对于触发 ASR 模型的最终高精度识别至关重要。</p>

      <h2>ASR 服务集成：FunASRManager</h2>
      <p>这个新模块 <code>asr_manager.py</code> 负责与独立的 FunASR WebSocket 服务器的所有通信。它封装了 FunASR 协议的细节，为主应用程序提供了一个清晰的接口。</p>
      <p>FunASR 流式协议使用 <code>2pass</code> 模式，非常适合交互式应用。它提供：</p>
      <ul>
        <li><strong>2pass-online 结果：</strong> 快速、准确性较低的中间转写结果，非常适合实时 UI 反馈。</li>
        <li><strong>2pass-offline 结果：</strong> 较慢、在一句话结束后提供的高精度转写结果，非常适合输入给 LLM。</li>
      </ul>
      <p>下表总结了与 FunASR WebSocket 服务器的基本通信流程，提炼了官方协议文档中的信息。</p>

      <h3>表 1：FunASR WebSocket 协议摘要（2pass 模式）</h3>
      <table>
        <thead>
        <tr>
          <th>消息方向</th>
          <th>类型</th>
          <th>`mode`</th>
          <th>关键参数</th>
          <th>描述</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td>客户端 -> 服务器</td>
          <td>JSON (初始)</td>
          <td>`2pass`</td>
          <td><code>chunk_size</code>, <code>wav_name</code>, <code>is_speaking: true</code></td>
          <td>启动一个使用 2-pass 识别的流式会话。</td>
        </tr>
        <tr>
          <td>客户端 -> 服务器</td>
          <td>二进制</td>
          <td>N/A</td>
          <td>(原始音频字节)</td>
          <td>一个 16kHz, 16-bit PCM 音频数据块。</td>
        </tr>
        <tr>
          <td>客户端 -> 服务器</td>
          <td>JSON (最终)</td>
          <td>N/A</td>
          <td><code>is_speaking: false</code></td>
          <td>标志一句话的结束，触发最终的识别过程。</td>
        </tr>
        <tr>
          <td>服务器 -> 客户端</td>
          <td>JSON</td>
          <td>`2pass-online`</td>
          <td><code>text</code></td>
          <td>一个快速的、中间的转写结果，用于实时反馈。</td>
        </tr>
        <tr>
          <td>服务器 -> 客户端</td>
          <td>JSON</td>
          <td>`2pass-offline`</td>
          <td><code>text</code>, <code>is_final: true</code></td>
          <td>一句话结束后最终的、更准确的转写结果。</td>
        </tr>
        </tbody>
      </table>

      <h3>新模块 (asr_manager.py):</h3>
      <pre><code class="language-python">
# 文件路径: ./asr_manager.py
import asyncio
import json
import websockets
from logger import logger

class FunASRManager:
    """管理与 FunASR WebSocket 服务的连接和通信"""
    def __init__(self, uri):
        self.uri = uri
        self.websocket = None
        self.audio_queue = asyncio.Queue()
        self.is_speaking = True

    async def _connect(self):
        """连接到 FunASR WebSocket 服务器"""
        try:
            self.websocket = await websockets.connect(self.uri)
            logger.info("成功连接到 FunASR WebSocket 服务器")
            # 发送初始配置消息
            config = {
                "mode": "2pass",
                "chunk_size": [5, 10, 5],  # Paraformer 标准的 600ms 块
                "wav_name": "mic",
                "is_speaking": True,
            }
            await self.websocket.send(json.dumps(config))
            logger.info(f"已发送 FunASR 初始配置: {config}")
        except Exception as e:
            logger.error(f"连接 FunASR WebSocket 服务器 {self.uri} 失败: {e}")
            self.websocket = None

    async def send_audio(self, audio_chunk):
        """将音频块放入队列等待发送"""
        await self.audio_queue.put(audio_chunk)

    async def mark_end_of_speech(self):
        """标记一句话结束"""
        await self.audio_queue.put(None) # 使用 None 作为信号

    async def _sender(self):
        """从队列中取出音频数据并发送到 FunASR"""
        while self.is_speaking:
            try:
                chunk = await self.audio_queue.get()
                if chunk is None: # 语句结束信号
                    end_payload = json.dumps({"is_speaking": False})
                    await self.websocket.send(end_payload)
                    logger.info("已向 FunASR 发送语音结束信号")
                else:
                    if self.websocket and self.websocket.open:
                        await self.websocket.send(chunk)
            except websockets.exceptions.ConnectionClosed:
                logger.warning("FunASR 发送器: 连接已关闭")
                break
            except Exception as e:
                logger.error(f"FunASR 发送任务出错: {e}")
                break

    async def _receiver(self, transcription_queue):
        """接收来自 FunASR 的转写结果"""
        while self.is_speaking:
            try:
                if not self.websocket or not self.websocket.open:
                    await asyncio.sleep(0.1)
                    continue

                message = await self.websocket.recv()
                response = json.loads(message)

                if response.get("mode") == "2pass-offline":
                    final_text = response.get("text", "")
                    if final_text:
                        logger.info(f"FunASR (最终结果): {final_text}")
                        await transcription_queue.put(final_text)
                elif response.get("mode") == "2pass-online":
                    intermediate_text = response.get("text", "")
                    if intermediate_text:
                        logger.info(f"FunASR (中间结果): {intermediate_text}")

            except websockets.exceptions.ConnectionClosed:
                logger.warning("FunASR 接收器: 连接已关闭")
                break
            except Exception as e:
                logger.error(f"FunASR 接收任务出错: {e}")
                break

    async def run(self, transcription_queue):
        """运行发送和接收任务"""
        await self._connect()
        if not self.websocket:
            return

        sender_task = asyncio.create_task(self._sender())
        receiver_task = asyncio.create_task(self._receiver(transcription_queue))

        await asyncio.gather(sender_task, receiver_task)

    async def close(self):
        """关闭连接"""
        self.is_speaking = False
        if self.websocket and self.websocket.open:
            await self.websocket.close()
            logger.info("已关闭 FunASR WebSocket 连接")
      </code></pre>

      <h2>LLM 服务集成：OllamaManager</h2>
      <p>该模块取代了现有的 <code>llm.py</code>，并专门用于与本地 Ollama 服务器通信。它利用官方的 <code>ollama</code> Python 库，该库为与 Ollama REST API 交互提供了一个简洁的异步客户端，并原生支持流式响应。</p>
      <p>流式传输 LLM 的响应是一项关键的性能优化。它允许后端在生成响应的头几个词时就开始数字人的 TTS 和渲染过程，而不是等待整个段落完成。这极大地减少了数字人感知的“思考时间”，创造了更自然、更流畅的对话体验。</p>

      <h3>新模块 (llm_manager.py):</h3>
      <pre><code class="language-python">
# 文件路径: ./llm_manager.py
import asyncio
import ollama
from logger import logger

class OllamaManager:
    """管理与 Ollama 服务的连接和通信"""
    def __init__(self, host_uri, model_name='llama3'):
        self.client = ollama.AsyncClient(host=host_uri)
        self.model = model_name
        logger.info(f"Ollama 管理器已初始化，模型为 '{self.model}'，位于 {host_uri}")

    async def process_transcriptions(self, transcription_queue, nerfreal_instance):
        """持续监听并处理最终的转写结果"""
        while True:
            try:
                # 等待 ASR 管理器传来最终的转写结果
                final_text = await transcription_queue.get()
                if not final_text:
                    continue

                logger.info(f"正在使用 Ollama 处理转写: '{final_text}'")

                messages = [{'role': 'user', 'content': final_text}]

                # 使用流式调用访问 Ollama API
                async for chunk in await self.client.chat(model=self.model, messages=messages, stream=True):
                    content_chunk = chunk['message']['content']
                    if content_chunk:
                        # 将 LLM 的响应流直接推送到数字人的 TTS 引擎
                        nerfreal_instance.put_msg_txt(content_chunk)

                # （可选）向 TTS 引擎发送 LLM 响应结束信号
                # 这可能需要在 BaseReal 中进行少量修改以处理句子结尾
                # 目前，我们假设 put_msg_txt 能恰当处理文本块

            except asyncio.CancelledError:
                logger.info("Ollama 处理任务已取消")
                break
            except Exception as e:
                logger.error(f"OllamaManager 出错: {e}")
                # 避免因单个 LLM 请求失败而中断循环
                await asyncio.sleep(1)
      </code></pre>
      <h2>在 app.py 中编排完整的 AI 管道</h2>
      <p>随着服务管理器的就位，<code>app.py</code> 中的 <code>websocket_audio_handler</code> 充当了中央编排器。它创建并管理构成整个管道的异步任务：接收音频、发送到 ASR、接收转写结果、发送给 LLM，最后将 LLM 的响应流式传输到渲染引擎。这种基于任务的异步方法效率极高，并充分利用 <code>asyncio</code> 的能力来处理并发 I/O 操作而不会阻塞。</p>

      <h1 id="chapter4">前端修改：捕获并流式传输用户语音</h1>
      <p>前端必须进行重构，从基于文本的界面过渡到语音捕获和流式传输客户端。<code>videochat.vue</code> 组件将被修改，以使用浏览器的 MediaRecorder API 访问麦克风，并使用 WebSocket 将音频数据流式传输到新的后端端点。</p>

      <h2>videochat.vue 分析</h2>
      <p>现有的 <code>videochat.vue</code> 组件为这次重构提供了一个坚实的基础。它已经包含了视频显示和控制所需的 UI 结构，以及通过 <code>/offer</code> 端点建立初始 WebRTC 连接的逻辑。关键任务是用新的语音录制和流式传输功能替换文本输入和提交逻辑。</p>

      <h2>实现麦克风捕获和流式传输</h2>
      <p>MediaRecorder API 是在浏览器中捕获音频和视频的现代标准。我们将配置它来捕获音频，将其切成小块，并在每个块可用时（<code>ondataavailable</code> 事件）立即通过 WebSocket 发送出去。</p>
      <p>WebSocket 连接将在初始 WebRTC 协商成功后建立，因为此时后端提供了将音频流与正确的数字人实例关联所需的唯一 <code>sessionid</code>。</p>

      <h3>videochat.vue 修改（&lt;script&gt; 部分）：</h3>
      <p>以下代码展示了 <code>videochat.vue</code> 完整的、修改后的 <code>&lt;script&gt;</code> 部分。它引入了新的数据属性、处理音频录制和 WebSocket 通信的方法，并将它们集成到组件的生命周期中。</p>
      <pre><code class="language-javascript">
// 文件路径: ./web/videochat.vue
&lt;script&gt;
import { onMounted, onUnmounted, ref } from 'vue';

// 假设 client.js 的逻辑已适配或包含于此，用于 WebRTC 设置
// 在此示例中，我们将模拟 WebRTC 协商的关键部分

export default {
  name: 'VideoChat',
  data() {
    return {
      isVideoStarted: false,
      isRecording: false,
      sessionid: null,
      pc: null, // PeerConnection
      audioSocket: null,
      mediaRecorder: null,
      audioStream: null,
    };
  },
  methods: {
    // 1. 启动用于接收数字人视频/音频的主 WebRTC 连接
    async start() {
      // ... (来自原提示的 WebRTC 协商逻辑保持不变)
      // 在协商成功并获得 sessionid 后，连接音频 WebSocket
      // this.sessionid = ...
      this.connectAudioSocket();
    },

    // 2. 建立用于发送用户音频的 WebSocket
    connectAudioSocket() {
      if (!this.sessionid) {
        console.error("没有会话 ID，无法连接音频 WebSocket");
        return;
      }
      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/audio/${this.sessionid}`;

      this.audioSocket = new WebSocket(wsUrl);

      this.audioSocket.onopen = () => {
        console.log("音频 WebSocket 连接已建立");
        // UI 现在可以启用录音按钮
      };

      this.audioSocket.onclose = (event) => {
        console.log("音频 WebSocket 连接已关闭:", event.reason);
        this.stopRecording();
      };

      this.audioSocket.onerror = (error) => {
        console.error("音频 WebSocket 出错:", error);
      };
    },

    // 3. 切换麦克风录音和流式传输
    async toggleRecording() {
      if (this.isRecording) {
        this.stopRecording();
      } else {
        await this.startRecording();
      }
    },

    // 启动录音
    async startRecording() {
      if (!this.audioSocket || this.audioSocket.readyState !== WebSocket.OPEN) {
        alert("音频连接未就绪，请稍候。");
        return;
      }
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // 注意：mimeType 可能需要根据浏览器和后端支持进行调整
        this.mediaRecorder = new MediaRecorder(this.audioStream, { mimeType: 'audio/webm; codecs=opus' });

        this.mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0 && this.audioSocket.readyState === WebSocket.OPEN) {
            // 将音频块作为二进制 blob 发送
            this.audioSocket.send(event.data);
          }
        };

        this.mediaRecorder.onstop = () => {
          this.isRecording = false;
          if (this.audioSocket && this.audioSocket.readyState === WebSocket.OPEN) {
            // 向后端发送说话结束的信号
            this.audioSocket.send(JSON.stringify({ "is_speaking": false }));
          }
          // 停止麦克风轨道以关闭指示灯
          this.audioStream.getTracks().forEach(track => track.stop());
        };

        // 开始录音并以 250 毫秒为间隔发送数据块
        this.mediaRecorder.start(250);
        this.isRecording = true;

      } catch (err) {
        console.error("访问麦克风时出错:", err);
        alert("无法访问麦克风，请检查浏览器权限。");
      }
    },

    // 停止录音
    stopRecording() {
      if (this.mediaRecorder && this.isRecording) {
        this.mediaRecorder.stop();
      }
    },

    // 4. 清理所有连接
    stop() {
      // ... (来自原提示的清理逻辑保持不变)
      this.stopRecording();
      if (this.audioSocket) {
        this.audioSocket.close();
      }
    }
  },
  beforeUnmount() {
    // 确保组件销毁时进行清理
    this.stop();
  }
};
&lt;/script&gt;
      </code></pre>

      <h2>针对语音模态的 UI/UX 增强</h2>
      <p><code>videochat.vue</code> 中的用户界面必须更新，以反映从文本到语音的转变。现有的 <code>&lt;textarea&gt;</code> 和相关的“发送”按钮应被移除。取而代之的是一个单一、直观的麦克风按钮，用于控制录音状态。</p>
      <h3>videochat.vue 修改（&lt;template&gt; 部分）：</h3>
      <pre><code class="language-html">
&lt;div class="controls-bar"&gt;
  &lt;button @click="start" v-if="!isVideoStarted" class="control-button"&gt;
    &lt;span&gt;开始&lt;/span&gt;
  &lt;/button&gt;
  &lt;button @click="stop" v-if="isVideoStarted" class="control-button stop-btn"&gt;
    &lt;span&gt;停止&lt;/span&gt;
  &lt;/button&gt;

  &lt;!-- 新的录音控制按钮 --&gt;
  &lt;button @click="toggleRecording" :disabled="!isVideoStarted"
          class="control-button" :class="{ 'is-recording': isRecording }"&gt;
    &lt;div class="icon-container"&gt;
      &lt;!-- 未录音时的麦克风图标 --&gt;
      &lt;svg v-if="!isRecording" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"&gt;
        &lt;path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"&gt;&lt;/path&gt;
        &lt;path d="M19 10v2a7 7 0 0 1-14 0v-2"&gt;&lt;/path&gt;
        &lt;line x1="12" y1="19" x2="12" y2="23"&gt;&lt;/line&gt;
        &lt;line x1="8" y1="23" x2="16" y2="23"&gt;&lt;/line&gt;
      &lt;/svg&gt;
      &lt;!-- 正在录音时的方块图标 --&gt;
      &lt;svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="red" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"&gt;
        &lt;rect x="3" y="3" width="18" height="18" rx="2" ry="2"&gt;&lt;/rect&gt;
      &lt;/svg&gt;
    &lt;/div&gt;
    &lt;span&gt;{{ isRecording ? '停止录音' : '开始录音' }}&lt;/span&gt;
  &lt;/button&gt;
&lt;/div&gt;

&lt;style&gt;
 /* 录音状态下的按钮样式 */
 .control-button.is-recording {
   background-color: #dc3545; /* 红色表示正在录音 */
   color: white;
 }
 .control-button.is-recording:hover {
   background-color: #c82333;
 }
&lt;/style&gt;
      </code></pre>

      <h1 id="chapter5">配置、部署与执行</h1>
      <p>本节提供了配置、部署和运行完整的、多服务数字人应用程序的最终可操作步骤。它包括最终的项目结构、启动依赖服务的说明，以及一个为主要应用程序增强的、高度可配置的启动脚本。</p>

      <h2>最终项目结构与模块划分</h2>
      <p>在实施了建议的更改后，后端项目目录将按如下方式组织。这种结构促进了模块化和关注点分离。</p>
      <pre>
LiveTalking/
├── app.py              # 主 aiohttp 应用、路由和编排器
├── asr_manager.py      # 新增：管理 FunASR 服务的连接和协议
├── llm_manager.py      # 新增：管理 Ollama 服务的连接和协议
├── basereal.py         # 核心数字人逻辑 (无改动)
├── musereal.py         # MuseTalk 特定实现 (无改动)
├── ...                 # 其他 real 实现 (无改动)
├── webrtc.py           # WebRTC 播放器逻辑 (无改动)
├── logger.py           # 日志配置 (无改动)
├── requirements.txt    # Python 依赖 (已更新)
└── web/                # 前端静态文件
    ├── videochat.vue   # 已修改：支持语音的前端组件
    └──...              # 其他 HTML, JS, CSS 文件
      </pre>

      <h2>独立服务部署</h2>
      <p>解耦的架构要求 FunASR 和 Ollama 服务在主应用程序启动之前独立运行。</p>
      <h3>1. 运行 Ollama：</h3>
      <pre><code class="language-bash">
# 如果你还没有模型，先拉取
ollama pull llama3

# 运行 Ollama 服务 (这通常在安装后作为后台服务运行)
ollama serve
      </code></pre>
      <h3>2. 运行 FunASR：</h3>
      <pre><code class="language-bash">
# 导航到 FunASR 的 runtime 目录
cd /path/to/FunASR/runtime/python/websocket/

# 启动 WebSocket 服务器
# 首次运行时会自动下载必要的模型
python wss_srv_asr.py --port 10095
      </code></pre>

      <h2>增强的应用程序启动命令</h2>
      <p>为了满足用户对灵活、可配置启动命令的需求，新的命令行参数被添加到了 <code>app.py</code> 中。这允许在运行时指定 ASR 和 LLM 服务的 URI，使得切换不同的模型提供商或部署变得轻而易举。</p>
      <h3>表 2：app.py 更新后的命令行参数</h3>
      <table>
        <thead>
        <tr>
          <th>参数</th>
          <th>类型</th>
          <th>默认值</th>
          <th>描述</th>
          <th>示例</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td>--model</td>
          <td>str</td>
          <td>musetalk</td>
          <td>要使用的数字人渲染模型。</td>
          <td><code>wav2lip</code></td>
        </tr>
        <tr>
          <td>--avatar_id</td>
          <td>str</td>
          <td>avator_1</td>
          <td>要加载的特定虚拟形象。</td>
          <td><code>my_avatar</code></td>
        </tr>
        <tr>
          <td>--listenport</td>
          <td>int</td>
          <td>8010</td>
          <td>主 aiohttp web 服务器的端口。</td>
          <td><code>8000</code></td>
        </tr>
        <tr>
          <td>--asr-uri</td>
          <td>str</td>
          <td>ws://127.0.0.1:10095</td>
          <td>FunASR 服务的 WebSocket URI。</td>
          <td><code>ws://asr.internal:10095</code></td>
        </tr>
        <tr>
          <td>--llm-uri</td>
          <td>str</td>
          <td>http://127.0.0.1:11434</td>
          <td>Ollama API 服务的基础 URI。</td>
          <td><code>http://llm-server:11434</code></td>
        </tr>
        <tr>
          <td>--llm-model</td>
          <td>str</td>
          <td>llama3</td>
          <td>在 Ollama 中要使用的具体模型。</td>
          <td><code>mistral</code></td>
        </tr>
        </tbody>
      </table>

      <h2>统一执行脚本</h2>
      <p>为了简化部署过程，可以创建一个主 shell 脚本 (<code>run_all.sh</code>) 来按正确顺序启动所有必要的组件。该脚本确保开发人员可以通过一个命令启动整个生态系统。</p>
      <h3>run_all.sh:</h3>
      <pre><code class="language-bash">
#!/bin/bash
# --- 配置 ---
FUNASR_PATH="/path/to/FunASR/runtime/python/websocket"
LIVETALKING_PATH="/path/to/LiveTalking"
ASR_PORT="10095"
LLM_PORT="11434"
WEB_PORT="8010"
LLM_MODEL="llama3"

# --- 清理函数 ---
cleanup() {
    echo "正在关闭所有服务..."
    # 使用 pkill 更可靠地关闭进程
    pkill -P $FUNASR_PID
    pkill -P $OLLAMA_PID
    pkill -P $LIVETALKING_PID
    kill $FUNASR_PID $OLLAMA_PID $LIVETALKING_PID
    exit
}
trap cleanup SIGINT SIGTERM

# --- 主执行 ---
# 1. 启动 Ollama 服务
echo "正在启动 Ollama 服务..."
ollama serve > ollama.log 2>&1 &
OLLAMA_PID=$!
sleep 5 # 给它一点时间初始化

# 2. 启动 FunASR 服务
echo "正在端口 $ASR_PORT 上启动 FunASR WebSocket 服务器..."
cd "$FUNASR_PATH"
python wss_srv_asr.py --port $ASR_PORT > funasr.log 2>&1 &
FUNASR_PID=$!
sleep 10 # 模型加载可能需要时间

# 3. 启动 LiveTalking 应用
echo "正在端口 $WEB_PORT 上启动 LiveTalking 应用..."
cd "$LIVETALKING_PATH"
python app.py \
    --transport webrtc \
    --model musetalk \
    --avatar_id avator_1 \
    --listenport $WEB_PORT \
    --asr-uri "ws://127.0.0.1:$ASR_PORT" \
    --llm-uri "http://127.0.0.1:$LLM_PORT" \
    --llm-model "$LLM_MODEL" &
LIVETALKING_PID=$!

echo "所有服务均已运行。"
echo " - Ollama PID: $OLLAMA_PID"
echo " - FunASR PID: $FUNASR_PID"
echo " - LiveTalking PID: $LIVETALKING_PID"
echo "请通过 http://localhost:$WEB_PORT/videochat.html 访问应用"
echo "按 Ctrl+C 停止所有服务。"

# 等待任一进程退出
wait $FUNASR_PID $OLLAMA_PID $LIVETALKING_PID
      </code></pre>
      <p>要使用此脚本，用户必须首先使其可执行 (<code>chmod +x run_all.sh</code>)，并自定义 <code>FUNASR_PATH</code> 和 <code>LIVETALKING_PATH</code> 变量。</p>

      <h2>结论</h2>
      <p>本报告概述了对“LiveTalking”数字人平台进行全面而稳健的架构重构，以实现实时、语音驱动的交互。通过从基于文本的 HTTP 模型过渡到流式 WebSocket 架构，并将核心 AI 组件——ASR 和 LLM——解耦为独立服务，该系统现已为企业级的性能、可扩展性和可维护性做好了准备。</p>
      <p>所提供的后端模块 (<code>asr_manager.py</code>, <code>llm_manager.py</code>) 和前端修改 (<code>videochat.vue</code>) 构成了一个完整的、可操作的实施计划。增强的、可配置的启动脚本提供了轻松更换 AI 服务提供商的灵活性，满足了关键的用户需求并使平台面向未来。最终的架构不仅实现了集成 FunASR 和 Ollama 的近期目标，也为未来的功能扩展和集成更先进的 AI 能力奠定了坚实的基础。</p>
    </main>
  </div>
</template>
<script setup>
/**
 * @function goBack
 * @description 导航至浏览器历史记录的上一页。
 * 简化注释：返回上一页
 */
const goBack = () => {
  // 调用浏览器全局 history 对象的 back 方法
  window.history.back();
};

/**
 * @function scrollTo
 * @description 平滑滚动到页面上具有指定ID的元素。
 * @param {string} elementId - 要滚动到的目标元素的ID。
 * 简化注释：滚动到指定元素
 */
const scrollTo = (elementId) => {
  // 通过 ID 获取目标DOM元素
  const element = document.getElementById(elementId);
  // 如果元素存在，则调用其 scrollIntoView 方法
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth', // 动画效果：平滑滚动
      block: 'start'      // 垂直对齐：将元素顶部与视口顶部对齐
    });
  }
};
</script>

<style scoped>
/* 简化注释：全局滚动条样式
 * 强制显示滚动条并定义其外观，确保用户可以随时拖拽。
 */
::-webkit-scrollbar {
  width: 12px; /* 简化注释：滚动条宽度 */
  height: 12px;
}
::-webkit-scrollbar-track {
  background: transparent; /* 简化注释：滚动条轨道背景 */
}
::-webkit-scrollbar-thumb {
  background: #cccccc; /* 简化注释：滚动条滑块 */
  border-radius: 10px;
  border: 3px solid #fff; /* 简化注释：滑块边框，产生间距感 */
}
::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8; /* 简化注释：滑块悬停效果 */
}
html {
  /* 简化注释：兼容火狐浏览器 */
  scrollbar-width: thin;
  scrollbar-color: #cccccc #fff;
}

/* 简化注释：页面根容器
 * 变更：添加了 height 和 overflow-y，以实现全屏滚动。
 * 变更：更新了字体、颜色和背景，以匹配苹果设计风格。
*/
.page-container {
  height: 100vh;    /* 视口高度 */
  overflow-y: auto; /* 垂直方向出现滚动条 */
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif;
  line-height: 1.7;
  color: #1d1d1f;
  background-color: #fff;
}

/* 简化注释：顶部固定导航栏
 * 变更：调整了背景色透明度和模糊效果，增强现代感。
*/
.header {
  padding: 15px 40px;
  background-color: rgba(255, 255, 255, 0.85);
  border-bottom: 1px solid #e5e5e5;
  position: sticky;
  top: 0;
  z-index: 1000;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

/* 简化注释：统一的导航按钮样式
 * 变更：采用苹果标志性蓝色，调整圆角和交互效果，使其更柔和。
*/
.back-button,
.chapter-nav button {
  padding: 8px 16px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border: none;
  background-color: #007AFF;
  color: white;
  border-radius: 8px;
  transition: background-color 0.2s, transform 0.1s;
  text-decoration: none;
  display: inline-block;
  vertical-align: middle;
}

.back-button:hover,
.chapter-nav button:hover {
  background-color: #006ae6; /* 简化注释：悬停时加深蓝色 */
}

.back-button:active,
.chapter-nav button:active {
  transform: scale(0.97);
  background-color: #0059c3;
}

/* 简化注释：返回按钮的布局 */
.back-button {
  margin-bottom: 15px;
}

/* 简化注释：章节导航容器 */
.chapter-nav {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap; /* 在小屏幕上换行 */
  justify-content: flex-start;
  gap: 12px;
}

/* 简化注释：主内容区域 */
.content {
  padding: 20px 40px;
  max-width: 960px;
  margin: 0 auto;
}

/* 简化注释：一级标题
 * 变更：调整了颜色和边框，使其更精致。
*/
h1 {
  font-size: 2.5em;
  color: #1d1d1f;
  border-bottom: 1px solid #d1d1d6;
  padding-bottom: 0.4em;
  margin-top: 1.5em;
  padding-top: 80px; /* 为粘性导航提供偏移量，防止遮挡 */
  margin-bottom: 1em;
  font-weight: 600;
}

/* 简化注释：二级标题
 * 变更：同上
*/
h2 {
  font-size: 2em;
  color: #1d1d1f;
  border-bottom: 1px solid #e5e5e5;
  padding-bottom: 0.3em;
  margin-top: 2em;
  padding-top: 80px; /* 为粘性导航提供偏移量，防止遮挡 */
  margin-bottom: 1em;
  font-weight: 600;
}

/* 简化注释：三级标题 */
h3 {
  font-size: 1.5em;
  color: #1d1d1f;
  margin-top: 1.5em;
  margin-bottom: 0.8em;
  font-weight: 600;
}

/* 简化注释：段落 */
p {
  margin-bottom: 1.2em;
  font-size: 1.05em;
}

/* 简化注释：列表 */
ul, ol {
  padding-left: 2em;
  margin-bottom: 1.2em;
}

li {
  margin-bottom: 0.6em;
}

/* 简化注释：代码块
 * 变更：更新了背景色和字体，提升可读性。
*/
pre {
  background-color: #f5f5f7;
  color: #1d1d1f;
  padding: 1.5em;
  border-radius: 12px;
  overflow-x: auto;
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  font-size: 0.9em;
  margin: 2em 0;
  border: 1px solid #e5e5e5;
  white-space: pre-wrap;
  word-wrap: break-word;
}

code {
  font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, Courier, monospace;
  background-color: #f0f0f5;
  color: #d63384; /* 简化注释：内联代码使用粉色高亮 */
  padding: 0.2em 0.4em;
  border-radius: 5px;
  font-size: 0.9em;
}

pre > code {
  color: inherit;
  background-color: transparent;
  padding: 0;
  border-radius: 0;
  white-space: pre-wrap;
  word-wrap: break-word;
}


/* 简化注释：表格
 * 变更：采用现代无竖线设计，仅保留水平分隔线，更简洁。
*/
table {
  width: 100%;
  border-collapse: separate; /* 允许使用 border-spacing */
  border-spacing: 0;
  margin: 2em 0;
  display: block;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid #d1d1d6;
  border-radius: 12px;
}

/* 简化注释：表格单元格 */
th, td {
  padding: 14px 18px;
  text-align: left;
  vertical-align: top;
  border-bottom: 1px solid #d1d1d6;
}

/* 简化注释：移除最后一行单元格的下边框 */
tbody tr:last-child th,
tbody tr:last-child td {
  border-bottom: none;
}

/* 简化注释：表头 */
thead {
  background-color: #f5f5f7;
}

thead th {
  font-weight: 600;
  color: #6e6e73;
}

/* 简化注释：加粗强调 */
strong {
  font-weight: 600;
}
</style>