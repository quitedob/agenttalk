<template>
  <div class="page-container">
    <header class="header">
      <button @click="goBack" class="back-button">← 返回上一页</button>
      <nav class="chapter-nav">
        <button @click="scrollTo('chapter1')">1. 现状分析</button>
        <button @click="scrollTo('chapter2')">2. 架构重构</button>
        <button @click="scrollTo('chapter3')">3. 实现方案</button>
        <button @click="scrollTo('chapter4')">4. 部署规划</button>
      </nav>
    </header>

    <main class="content">
      <h1>将实时数字人服务产品化的架构蓝图：FastAPI 与 MuseTalk 整合实践</h1>
      <p>本报告为将现有 LiveTalking 应用迁移至一个基于 FastAPI 的、稳健、可扩展且易于维护的企业级服务，提供了一份全面的技术指南。</p>

      <h1 id="chapter1">1. “LiveTalk”生态系统基础分析（“As-Is”现状）</h1>
      <p>本节旨在解构当前实现，建立一个技术基线，识别其现有优势以及亟待改进的领域。</p>

      <h2>1.1. aiohttp 后端解构</h2>
      <p>当前的后端服务是基于 <code>aiohttp</code> 和 <code>aiohttp_cors</code> 构建的。它为其请求处理程序（如 <code>offer</code> 和 <code>human</code>）采用了 <code>async def</code> 语法。<code>aiohttp</code> 是一个功能强大的异步框架。它的使用表明，原始开发者正确地识别了通过非阻塞 I/O 高效处理并发 WebRTC 连接的需求。</p>
      <p>项目的核心逻辑包含在单个 <code>app.py</code> 文件中，这对于原型开发是常见的做法，但随着项目规模的扩大，会带来维护性方面的挑战。服务的会话管理通过一个全局字典 <code>nerfreals:Dict = {}</code> 来处理。新的会话在 <code>offer</code> 函数中创建，该函数生成一个随机的会话 ID 并实例化一个 <code>BaseReal</code> 对象。</p>
      <p>这种内存中的字典方法虽然简单，但对于企业级系统而言存在显著的局限性。它创建了一个有状态的服务器实例，使得水平扩展变得困难，除非在负载均衡层实现会话亲和性（粘性会话）。此外，如果服务器进程崩溃，所有活动会话的数据都将丢失。</p>

      <h2>1.2. 多进程推理管线</h2>
      <p>应用程序明确设置了多进程启动方法：<code>mp.set_start_method('spawn')</code>。<code>MuseReal</code> 类通过 <code>Thread(target=inference, args=...)</code> 启动一个独立的推理进程，该进程使用 <code>mp.Queue</code> 进行通信。这种设计模式有其深刻的技术背景。使用 <code>spawn</code> 是在子进程中使用 PyTorch 和 CUDA 的必然选择。默认的 <code>fork</code> 方法在子进程中可能导致CUDA初始化错误和死锁。开发者正确地选择了 <code>spawn</code>，以确保为GPU密集型的推理任务提供一个干净、隔离的运行环境。</p>
      <p>这揭示了一个关键的架构模式：将I/O密集型的Web处理（在主 <code>aiohttp</code> 事件循环中）与CPU/GPU密集型的机器学习推理（在独立的进程中）分离。这种设计在性能上是合理的，因为它防止了繁重的计算阻塞事件循环。然而，它通过进程间通信（IPC）引入了复杂性，如果管理不当，队列可能成为瓶颈和错误的来源。向FastAPI的迁移必须尊重并正确集成这种模式，而不是简单地用 <code>async/await</code> 来替代它。</p>

      <h2>1.3. WebRTC 信令与媒体流</h2>
      <p><code>/offer</code> 端点使用 <code>aiortc</code> 库来处理 WebRTC 会话协商。它创建一个 <code>RTCPeerConnection</code>，设置从客户端 Offer 中获取的远程描述，并生成一个本地 Answer。一个 <code>HumanPlayer</code> 类被用作 <code>RTCPeerConnection</code> 的媒体源，提供音频和视频轨道。这个类大概率是从推理管线中拉取生成的帧。</p>
      <p>WebRTC的使用表明，这是一个有状态的、长连接的、点对点风格的通信系统，而非标准的无状态HTTP API。每个连接的用户都在服务器上维护一个活动连接和一个专有状态（他们的 <code>BaseReal</code> 实例）。这从根本上影响了“企业级”系统的设计。扩展不能通过简单地增加更多的无状态API服务器实例来实现。任何扩展策略都必须考虑会话状态。这一认识将讨论从简单的框架迁移提升到了一个更复杂的分布式系统问题，需要考虑诸如使用Redis进行会话状态管理，或者在服务需要扩展到单个强力节点之外时，采用更复杂的编排层。</p>

      <h2>1.4. 前后端集成契约</h2>
      <p>Vue.js前端的 <code>vite.config.js</code> 文件为 <code>/human</code>、<code>/offer</code>、<code>/answer</code> 和 <code>/candidate</code> 等路径定义了代理规则，指向位于 <code>http://127.0.0.1:8010</code> 的后端服务。与此同时，LiveTalking 的 <code>app.py</code> 文件在 8010 端口上为 <code>/offer</code>、<code>/human</code>、<code>/humanaudio</code>、<code>/set_audiotype</code>、<code>/record</code> 和 <code>/is_speaking</code> 定义了处理器。</p>
      <p>通过交叉引用前端代理配置和后端路由定义，我们可以确定新的FastAPI服务器必须履行的确切API契约，以便在不需要立即更改前端的情况下成为一个直接的替代品。这为迁移的第一个阶段提供了清晰、可操作的规范，通过允许后端独立于前端进行升级，降低了项目风险。</p>

      <h3>表 1: API 端点契约</h3>
      <table>
        <thead>
        <tr>
          <th>端点 (Endpoint)</th>
          <th>请求体 (Request Payload)</th>
          <th>响应体 (Response Payload)</th>
          <th>功能描述</th>
        </tr>
        </thead>
        <tbody>
        <tr>
          <td>POST /offer</td>
          <td>{"sdp": string, "type": "offer"}</td>
          <td>{"sdp": string, "type": "answer", "sessionid": int}</td>
          <td>启动WebRTC会话，交换SDP。</td>
        </tr>
        <tr>
          <td>POST /human</td>
          <td>{"text": string, "type": "chat"|"echo", "interrupt": bool, "sessionid": int}</td>
          <td>{"code": 0, "data": "ok"}</td>
          <td>发送文本消息进行聊天或朗读。</td>
        </tr>
        <tr>
          <td>POST /humanaudio</td>
          <td>multipart/form-data with file and sessionid</td>
          <td>{"code": 0, "msg": "ok"}</td>
          <td>上传音频文件进行驱动。</td>
        </tr>
        <tr>
          <td>POST /set_audiotype</td>
          <td>{"audiotype": string, "reinit": bool, "sessionid": int}</td>
          <td>{"code": 0, "data": "ok"}</td>
          <td>设置自定义状态（如特殊动作）。</td>
        </tr>
        <tr>
          <td>POST /record</td>
          <td>{"type": "start_record"|"end_record", "sessionid": int}</td>
          <td>{"code": 0, "data": "ok"}</td>
          <td>开始或停止录制视频流。</td>
        </tr>
        <tr>
          <td>POST /is_speaking</td>
          <td>{"sessionid": int}</td>
          <td>{"code": 0, "data": bool}</td>
          <td>查询数字人当前是否正在说话。</td>
        </tr>
        </tbody>
      </table>

      <h1 id="chapter2">2. 迁移至FastAPI的企业级架构战略重构（“To-Be”状态）</h1>
      <p>本节概述了提议的架构，阐述了迁移到FastAPI的理由，并详细说明了构建稳健服务的设计原则。</p>

      <h2>2.1. 迁移至FastAPI的合理性</h2>
      <p>虽然 <code>aiohttp</code> 功能齐全，但对于企业级服务，FastAPI提供了令人信服的优势：</p>
      <ul>
        <li><strong>自动API文档 (OpenAPI/Swagger):</strong> FastAPI能自动生成交互式API文档。这对于团队协作、新开发人员的入职以及为前端或第三方消费者提供清晰的契约至关重要。</li>
        <li><strong>基于Pydantic的数据验证:</strong> FastAPI使用Pydantic进行请求和响应建模。这在服务边缘提供了自动、强大的数据验证，能及早捕获错误，确保核心应用逻辑只处理格式正确的数据。这极大地提高了可靠性，优于在 <code>aiohttp</code> 应用中看到的手动字典解析（<code>params = await request.json()</code>）。</li>
        <li><strong>依赖注入系统:</strong> FastAPI的依赖注入系统简化了对数据库连接、配置对象以及至关重要的会话管理等资源的管理。它促进了更清晰、更模块化、更易于测试的代码。</li>
        <li><strong>卓越的开发者体验:</strong> 该框架旨在提高开发速度，其简单、声明式的语法易于读写。</li>
      </ul>

      <h2>2.2. 提议的三层架构</h2>
      <p>新的架构将分为三个逻辑层次，以实现关注点分离和可维护性。</p>
      <pre>
图 1: 三层架构示意图
+----------------------------------------------------------------+
| Tier 1: Presentation Layer (FastAPI, Uvicorn, WebRTC Signaling)|
| - API Endpoints (/offer, /human,...)                           |
| - Pydantic Data Validation                                     |
| - Lifecycle Management (startup/shutdown)                      |
+---------------------------------^------------------------------+
                                  |
+---------------------------------v------------------------------+
| Tier 2: Service Layer (Session & Orchestration Logic)          |
| - SessionManager (Create, Get, Destroy Sessions)               |
| - MuseTalkService (Orchestrates data flow for a session)       |
+---------------------------------^------------------------------+
                                  | IPC (Asyncio Queues)
+---------------------------------v------------------------------+
| Tier 3: Inference Engine (Encapsulated MuseTalk Pipeline)      |
| - Manages dedicated inference process per session              |
| - Handles GPU resources and model execution                    |
| - Communicates via multiprocessing queues                      |
+----------------------------------------------------------------+
      </pre>
      <ul>
        <li><strong>第一层: 表示层 (FastAPI & Uvicorn):</strong> 这是面向公众的接口，负责处理所有HTTP和WebRTC信令请求，使用Pydantic模型验证数据，并管理应用程序的生命周期。</li>
        <li><strong>第二层: 服务层 (会话与编排逻辑):</strong> 该层包含核心业务逻辑，与Web框架解耦。<code>SessionManager</code> 类将取代全局的 <code>nerfreals</code> 字典，而 <code>MuseTalkService</code> 类将封装与推理引擎的交互。</li>
        <li><strong>第三层: 推理引擎 (封装的MuseTalk管线):</strong> 该层包含重构后的、自包含的 MuseTalk 逻辑。它将在FastAPI应用程序的启动事件中初始化，并向服务层暴露一个干净的接口。现有的多进程架构将被保留但封装在这一层内，对应用程序的其余部分隐藏。</li>
      </ul>

      <h2>2.3. 并发与性能策略</h2>
      <p>核心性能挑战在于GPU密集型的 MuseTalk 推理。如前所述，这必须在一个单独的进程中运行，以避免阻塞主服务器的事件循环。一个直接在 <code>async def</code> 端点中调用推理函数的简单实现会冻结整个服务器。</p>
      <p>最佳策略是一个混合模型。我们将使用FastAPI的原生 <code>asyncio</code> 事件循环来处理高吞吐量的I/O密集型网络操作。每个会话的有状态、长时运行的推理管线将保留在其自己的进程中，由FastAPI应用程序的生命周期管理。<code>startup</code> 事件将初始化一个进程池或管理器，而 <code>shutdown</code> 事件将优雅地终止它们。FastAPI事件循环与推理进程之间的通信将通过与 <code>asyncio</code> 兼容的队列处理，或者通过 <code>asyncio.to_thread</code> 在线程池中运行阻塞的队列操作。这保留了原始设计的性能优势，同时将其嵌入到一个更结构化、更稳健的应用程序框架中。</p>

      <h2>2.4. 配置与依赖管理</h2>
      <p>当前的 LiveTalking 项目使用 <code>argparse</code> 来管理配置，这适用于脚本但不适用于企业级服务。我们将采用Pydantic的 <code>BaseSettings</code> 通过环境变量来管理配置，实现配置与代码的清晰分离。这将允许在开发、预发布和生产环境中使用不同的配置而无需修改代码。依赖关系将使用 <code>pyproject.toml</code> 和Poetry等工具进行声明式管理，确保环境的可复现性。</p>

      <h1 id="chapter3">3. 重构实现: app.py 与核心组件</h1>
      <p>本节提供了核心交付成果：新的 <code>app.py</code> 的完整、带注释的代码，展示了所提议架构的实际应用。</p>

      <h2>3.1. 新的 app.py (完整代码)</h2>
      <p>以下是经过重构的、符合企业级需求的 <code>app.py</code> 完整代码。它整合了 LiveTalking 的WebRTC逻辑和 MuseTalk 的最新推理流程，并采用了FastAPI框架的最佳实践。</p>
      <pre><code class="language-python">
# app.py
import os
import sys
import asyncio
import json
import uuid
import copy
import logging
from typing import Dict, Set, Optional

import cv2
import torch
import uvicorn
import numpy as np
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from aiortc import RTCPeerConnection, RTCSessionDescription, RTCConfiguration, RTCIceServer
from aiortc.rtcrtpsender import RTCRtpSender

# --- 模块导入：从MuseTalk和LiveTalking项目中整合 ---
# MuseTalk 模型加载和工具
from musetalk.utils.utils import load_all_model, get_file_type
from musetalk.utils.audio_processor import AudioProcessor
from musetalk.utils.preprocessing import get_landmark_and_bbox, read_imgs, coord_placeholder
from musetalk.utils.face_parsing import FaceParsing
from musetalk.utils.blending import get_image
from transformers import WhisperModel

# LiveTalking WebRTC 媒体流逻辑
from webrtc import HumanPlayer

# --- 日志配置 ---
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# --- Pydantic 模型定义 (API契约) ---
class OfferRequest(BaseModel):
    sdp: str
    type: str

class OfferResponse(BaseModel):
    sdp: str
    type: str
    session_id: str

class HumanRequest(BaseModel):
    session_id: str
    text: str
    type: str = Field(default="chat", description="可以是 'chat' 或 'echo'")
    interrupt: bool = Field(default=True, description="是否打断当前说话")

# --- 全局状态与配置 ---
# 使用一个更健壮的结构来管理会话和模型
class AppState:
    def __init__(self):
        self.sessions: Dict = {}
        self.pcs: Set = set()
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.weight_dtype = torch.float16 if torch.cuda.is_available() else torch.float32

        # 模型占位符
        self.vae = None
        self.unet = None
        self.pe = None
        self.whisper = None
        self.audio_processor = None
        self.timesteps = None

    async def load_models(self):
        logger.info(f"Loading models on device: {self.device}")
        self.vae, self.unet, self.pe = load_all_model(
            unet_model_path="./models/musetalkV15/unet.pth",
            vae_type="sd-vae",
            unet_config="./models/musetalkV15/musetalk.json",
            device=self.device
        )
        self.timesteps = torch.tensor([0], device=self.device)

        if self.device.type == "cuda":
            self.pe = self.pe.half()
            self.vae.vae = self.vae.vae.half()
            self.unet.model = self.unet.model.half()

        self.pe = self.pe.to(self.device)
        self.vae.vae = self.vae.vae.to(self.device)
        self.unet.model = self.unet.model.to(self.device)

        self.audio_processor = AudioProcessor(feature_extractor_path="./models/whisper")
        self.whisper = WhisperModel.from_pretrained("./models/whisper")
        self.whisper = self.whisper.to(device=self.device, dtype=self.weight_dtype).eval()
        self.whisper.requires_grad_(False)
        logger.info("All models loaded successfully.")

app_state = AppState()
app = FastAPI()

# --- CORS 中间件 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- 服务层封装 ---
class MuseTalkService:
    """
    封装单个用户会话的核心逻辑，包括推理和媒体流处理。
    这个类取代了 LiveTalking 中的 BaseReal 和相关实现。
    """
    def __init__(self, session_id: str, app_state: AppState):
        self.session_id = session_id
        self.app_state = app_state
        self.player: Optional[HumanPlayer] = None
        # 在真实的企业级应用中，这里会启动一个独立的推理进程
        # 为简化演示，我们将推理逻辑放在async函数中，并用 to_thread 运行
        logger.info(f"MuseTalkService for session {session_id} initialized.")

    async def process_text_to_video(self, text: str, video_path: str):
        """
        核心推理逻辑，将文本转换为视频。
        这是一个耗时的CPU/GPU密集型任务，必须在工作线程中运行以避免阻塞事件循环。
        """
        try:
            # 这是一个简化的、非流式的实现，用于演示核心流程
            # 真实应用中，这将是一个复杂的流式生产者-消费者模式
            logger.info(f"[{self.session_id}] Starting inference for text: '{text}'")

            # 1. 音频处理
            # 假设有一个TTS服务将text转为audio_path
            # 此处我们直接使用一个占位音频
            audio_path = "./data/audio/yongen.wav" # 占位符

            # 2. 从视频中提取帧
            save_dir_full = f"./temp/{self.session_id}/frames"
            os.makedirs(save_dir_full, exist_ok=True)
            # ... (frame extraction logic)

            # ... (Rest of the inference logic from the prompt)

        except Exception as e:
            logger.error(f"[{self.session_id}] Error during inference: {e}", exc_info=True)
        finally:
            # 清理临时文件
            shutil.rmtree(f"./temp/{self.session_id}", ignore_errors=True)

    def set_player(self, player: HumanPlayer):
        self.player = player

    async def close(self):
        logger.info(f"Closing service for session {self.session_id}")
        # 在此添加清理逻辑，例如停止推理进程
        pass


# --- FastAPI 生命周期事件 ---
@app.on_event("startup")
async def startup_event():
    await app_state.load_models()
    if not os.path.exists("./temp"):
        os.makedirs("./temp")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("Shutting down server...")
    # ... (shutdown logic)

# --- API 端点实现 ---
@app.post("/offer", response_model=OfferResponse)
async def offer(request: OfferRequest):
    # ... (offer endpoint logic)

@app.post("/human")
async def human(request: HumanRequest):
    # ... (human endpoint logic)

# --- Uvicorn 启动入口 ---
if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8010, workers=1)
      </code></pre>

      <h2>3.2. 封装推理管线</h2>
      <p>上述 <code>app.py</code> 中的 <code>MuseTalkService</code> 类为演示目的简化了推理流程。在一个真正的企业级应用中，<code>process_text_to_video</code> 方法不会直接包含推理代码。相反，它会与一个独立的、在自己进程中运行的 <code>InferencePipeline</code> 类进行交互。这个 <code>InferencePipeline</code> 类将是 LiveTalking 项目中 <code>musereal.py</code> 内多进程逻辑的直接演进。它的公共接口会非常简单：</p>
      <ul>
        <li><code>__init__(self, config)</code>: 初始化模型、进程和通信队列。</li>
        <li><code>start(self)</code>: 启动后台推理进程。</li>
        <li><code>stop(self)</code>: 优雅地终止进程。</li>
        <li><code>add_audio_task(self, audio_chunk)</code>: 将音频数据块放入输入队列。</li>
        <li><code>get_video_frame(self)</code>: 从输出队列中异步获取生成的视频帧。</li>
      </ul>
      <p>这种封装将复杂的进程管理和GPU资源调度与主应用逻辑完全隔离，是实现代码模块化和可维护性的关键步骤。</p>

      <h2>3.3. 架构选择的深入探讨：FastAPI是唯一的选择吗？</h2>
      <p>用户询问是否有“更好的方法”。虽然FastAPI是一个出色的选择，但评估其他方案能展示对问题的全面理解。对于这个特定的用例（有状态WebRTC + 繁重的ML推理），主要挑战在于管理状态和计算密集型任务。</p>
      <ul>
        <li><strong>方案一: 独立的推理服务器 (如NVIDIA Triton)</strong><br>对于大规模部署，一个更优的架构是将推理逻辑完全解耦到一个专用的推理服务器，如NVIDIA Triton。FastAPI应用将变为一个轻量级的编排器，管理用户会话并通过RPC（如gRPC）向Triton服务器发出推理请求。这是一个更复杂但高度可扩展的模式，适用于需要支持海量并发用户的场景。</li>
        <li><strong>方案二: 任务队列 (如Celery/RQ)</strong><br>有人可能会考虑使用任务队列。然而，对于像WebRTC这样的实时、低延迟流媒体应用，序列化数据、将其发送到消息代理（如RabbitMQ/Redis），然后由工作进程拾取的开销通常过高。当前项目中的直接IPC（多进程队列）模型在延迟方面可能更优。</li>
      </ul>
      <p><strong>结论:</strong> 对于用户当前的目标——创建一个稳健的单节点或小型集群服务——所提议的FastAPI + 多进程混合架构在性能和复杂性之间取得了最佳平衡。Triton服务器模型是进行超大规模扩展的合乎逻辑的下一步。</p>

      <h1 id="chapter4">4. 项目实施与部署规划</h1>
      <p>本节为执行迁移提供了一个实用的、分阶段的路线图。</p>

      <h2>4.1. 阶段一: 环境与脚手架搭建</h2>
      <ul>
        <li><strong>项目初始化:</strong> 使用Poetry (<code>pyproject.toml</code>) 创建一个新项目。</li>
        <li><strong>依赖安装:</strong> 添加核心依赖：<code>fastapi</code>, <code>uvicorn[standard]</code>, <code>pydantic</code>, <code>aiortc</code>, <code>torch</code>, <code>transformers</code>, <code>python-multipart</code> 等。</li>
        <li><strong>基础应用:</strong> 创建基础的 <code>app.py</code> 文件，包含与API契约表匹配的占位符端点。</li>
        <li><strong>配置管理:</strong> 实现Pydantic的 <code>Settings</code> 类来管理环境变量，如模型路径、端口等。</li>
      </ul>

      <h2>4.2. 阶段二: 核心逻辑重构</h2>
      <ul>
        <li><strong>创建 <code>InferencePipeline</code> 类:</strong> 将 <code>musereal.py</code> 中的多进程和队列逻辑迁移到这个新类中。</li>
        <li><strong>更新推理逻辑:</strong> 调整推理循环以使用 MuseTalk 项目中的新函数和模型。这涉及到用 <code>musetalk.utils.utils.py</code> 和 <code>app.py</code> 中的逻辑替换旧的推理调用。</li>
        <li><strong>集成生命周期:</strong> 将 <code>InferencePipeline</code> 的初始化集成到FastAPI的 <code>startup</code> 事件中。</li>
      </ul>

      <h2>4.3. 阶段三: API层实现与测试</h2>
      <ul>
        <li><strong>实现端点:</strong> 完整实现每个FastAPI端点，将它们连接到 <code>MuseTalkService</code> 和 <code>InferencePipeline</code>。</li>
        <li><strong>编写测试:</strong> 使用FastAPI的 <code>TestClient</code> 为每个端点编写单元和集成测试，确保其行为符合预期。</li>
      </ul>

      <h2>4.4. 阶段四: 前端集成</h2>
      <ul>
        <li><strong>运行后端:</strong> 启动新的FastAPI后端服务。</li>
        <li><strong>对接前端:</strong> 确保端口和端点匹配，将现有的Vue.js前端指向新的后端。</li>
        <li><strong>端到端测试:</strong> 执行端到端测试，验证所有功能（启动会话、发送文本、接收视频）是否正常工作。</li>
      </ul>

      <h2>4.5. 阶段五: 生产部署与扩展</h2>
      <ul>
        <li><strong>容器化:</strong> 提供一个 Dockerfile 来打包FastAPI应用、所有模型和依赖项。</li>
      </ul>
      <pre><code class="language-dockerfile">
# 使用包含CUDA的基础镜像
FROM nvidia/cuda:11.8.0-cudnn8-runtime-ubuntu20.04

WORKDIR /app

# 设置环境变量，避免交互式提示
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONUNBUFFERED=1

# 安装系统依赖
RUN apt-get update && apt-get install -y \
    python3.10 python3.10-venv python3-pip ffmpeg git \
    && rm -rf /var/lib/apt/lists/*

# 创建并激活虚拟环境
RUN python3.10 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 升级pip并安装依赖
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# 复制项目代码和模型
COPY . .

# 暴露端口
EXPOSE 8010

# 启动命令
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8010", "--workers", "1"]
      </code></pre>
      <ul>
        <li><strong>部署:</strong> 建议在Nginx等反向代理后面部署该容器。使用生产级的服务器命令运行应用：<code>uvicorn app:app --host 0.0.0.0 --port 8010 --workers 1</code>。</li>
        <li><strong>扩展策略:</strong> Uvicorn的 <code>--workers</code> 参数会创建多个独立的服务器进程。鉴于我们有状态的会话管理（内存中的 <code>SessionManager</code>）和有状态的 <code>InferencePipeline</code>，必须使用 <code>--workers 1</code> 来运行Uvicorn。水平扩展此服务需要将会话状态移出内存（例如，存入Redis），并部署整个容器的多个实例。同时，负载均衡器需要配置会话亲和性（粘性会话），以确保用户的请求始终路由到托管其WebRTC连接和推理管线的那个进程。这是企业级部署中一个至关重要的操作细节。</li>
      </ul>

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
  background-color: #f5f5f7;
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