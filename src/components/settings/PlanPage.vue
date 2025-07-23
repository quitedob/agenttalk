<template>
  <div class="plan-page-container">
    <header class="plan-page-header">
      <h1>项目规划蓝图</h1>
      <p>选择一个项目查看详细的架构分析和实施计划。</p>
    </header>
    <div class="plan-links-container">
      <router-link to="/plan/1" class="plan-link-card">
        <div class="card-content">
          <h2>实时数字人服务产品化</h2>
          <p>从原型到企业级：FastAPI 与 MuseTalk v1.5 整合实践</p>
        </div>
      </router-link>
      <router-link to="/plan/2" class="plan-link-card">
        <div class="card-content">
          <h2>LiveTalking 平台架构升级</h2>
          <p>探索从旧版到集成 MuseTalk 1.5 与 FunASR 的核心技术演进。</p>
        </div>
      </router-link>
      <router-link to="/plan/3" class="plan-link-card">
        <div class="card-content">
          <h2>实时语音驱动数字人企业架构</h2>
          <p>整合 FunASR 与 Ollama 的架构重构方案</p>
        </div>
      </router-link>
    </div>
     <router-link to="/" class="back-link">← 返回主页</router-link>
  </div>
</template>

<script setup>
// No script logic needed for this simple navigation page.
</script>

<style scoped>
.plan-page-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  padding: 40px;
  box-sizing: border-box;
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.plan-page-header {
  text-align: center;
  margin-bottom: 50px;
  color: #333;
}

.plan-page-header h1 {
  font-size: 3rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.plan-page-header p {
  font-size: 1.2rem;
  color: #555;
}

.plan-links-container {
  display: flex;
  gap: 40px;
  justify-content: center;
  flex-wrap: wrap;
}

.plan-link-card {
  display: block;
  width: 350px;
  height: 200px;
  padding: 30px;
  border-radius: 15px;
  text-decoration: none;
  color: white;
  background-size: cover;
  background-position: center;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
  position: relative;
  overflow: hidden;
}

.plan-link-card:hover {
  transform: translateY(-10px);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.plan-link-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  transition: background 0.3s ease;
}

.plan-link-card:hover::before {
  background: rgba(0, 0, 0, 0.6);
}


.plan-link-card:nth-child(1) {
  background-image: linear-gradient(to top right, #0288d1, #26c6da);
}

.plan-link-card:nth-child(2) {
   background-image: linear-gradient(to top right, #673ab7, #9575cd);
}

.card-content {
  position: relative;
  z-index: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.card-content h2 {
  font-size: 1.8rem;
  font-weight: 600;
  margin-bottom: 10px;
}

.card-content p {
  font-size: 1rem;
  line-height: 1.5;
}

.back-link {
  margin-top: 50px;
  color: #555;
  text-decoration: none;
  font-size: 1rem;
  font-weight: 500;
}

.back-link:hover {
  text-decoration: underline;
  color: #000;
}
</style>
