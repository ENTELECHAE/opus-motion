# 🎬 OPUS-MOTION (中文文档)

[English](README.md) · [简体中文](README.zh-CN.md) · [导演手册](DIRECTOR.md) · [技术架构与原理](TECHNIQUE.md) · [AI 编码助手指南](AGENTS.md)

> **全功能 AI 电影与动画工作室：集成 157 种代码动画电影风格（包含 98 部 Clawd 奥斯卡最佳影片提名作品全集）、10 套 Clawd 角色绑定、703 个现象级提示词库、VoiceStudio REA 声音克隆与雷达质检、以及多模型 LLM 智能网关。**

[![CI](https://github.com/Entelechae/opus-motion/actions/workflows/ci.yml/badge.svg)](https://github.com/Entelechae/opus-motion/actions/workflows/ci.yml)
[![Pages](https://github.com/Entelechae/opus-motion/actions/workflows/pages.yml/badge.svg)](https://github.com/Entelechae/opus-motion/actions/workflows/pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Styles: 157](https://img.shields.io/badge/Film%20Styles-157%20%E6%AC%BE%E9%A3%8E%E6%A0%BC-00f2fe)](data/styles.json)
[![Clawd Characters: 10](https://img.shields.io/badge/Clawd%20Rigs-10%20%E5%A5%97%E8%A7%92%E8%89%B2-f97316)](studio/app.js)
[![Prompts: 703](https://img.shields.io/badge/Viral%20Prompts-703%20%E4%B8%AA%E6%8F%90%E7%A4%BA%E8%AF%8D-9d4edd)](data/prompts.json)
[![Voice Cloner: VoiceStudio REA](https://img.shields.io/badge/Voice%20Cloner-VoiceStudio%20REA-10b981)](core/voice_engine.py)

---

## 🌟 什么是 Opus-Motion？

**Opus-Motion** 是一个开源的创意计算平台，将五个业界顶尖的开源项目融为一体：
1. **[lemo-opuscar](https://github.com/lemomo-ai/lemo-opuscar):** 157 种电影级代码视觉风格、分镜指导、电影母本参考、提示词规范，以及 98 部 Clawd 奥斯卡最佳影片系列（1927–2025）。
2. **awesome-opus5-5-videos:** 703 个风靡全网的创意代码提示词库，涵盖 Canvas 2D、Three.js、WebGL 着色器、p5.js 和 GSAP。
3. **ClaudeAnimationBase:** 10 套高精度可控 Clawd 角色骨骼、p5.brush 物理水彩仿真以及无头 MP4 渲染引擎。
4. **VoiceStudio (REA):** 逆向音频工程（REA）六维声学雷达评测、共振峰提取（$F_1, F_2, F_3$）、声音克隆及音画口型嘴形同步（Visemes）。
5. **CLIProxyAPI / Entelechae 网关:** 高并发多账号负载均衡网关，无缝路由 Claude Opus、Gemini 2.5 Flash、GPT-4o 及 Entelechae-code。

---

## ⚡ 快速开始

### 环境依赖
- Python 3.9+ 或 [uv](https://docs.astral.sh/uv/)
- Node.js 18+（可选，用于无头浏览器高帧率视频压制）
- FFmpeg（用于音视频复用与 −14 LUFS 响度标准化）

### 1. 本地安装
```bash
git clone https://github.com/Entelechae/opus-motion.git
cd opus-motion
pip install -e .
```

### 2. 配置环境变量
复制 `.env.example` 配置文件：
```bash
cp .env.example .env
```
配置您的大模型 API 密钥与代理网关地址（原生支持 OpenAI、Anthropic、Gemini 以及本地 CLIProxyAPI 网关）。

### 3. 启动交互式 Web 工作室
```bash
# 启动本地工作室，访问 http://localhost:5173
opus-motion studio
# 或直接运行
python server.py
```

---

## 🖥️ 核心功能

- 🎨 **风格图书馆（157 款风格）：** 浏览经典电影视觉风格与 98 部 Clawd 奥斯卡获奖影片。支持多分类检索、提示词一键导出与高清剧照预览。
- 💡 **爆款提示词库（703 个创意方案）：** 按作者和技术栈（Three.js、Canvas 2D、SVG、GLSL 着色器）即时查询。
- 🎬 **导演舞台与实时画布：** 在 60fps 确定性画布上以时间戳 $t$ 驱动运镜，任意切换 **10 种 Clawd 角色人格**（赛博朋克、橡皮管、像素、粘土动画、折纸、水彩、黑色侦探、星空宇宙），并实时切换喜怒哀乐等情绪状态。
- 🎙️ **VoiceStudio REA 声音克隆系统：**
  - **六维六角形音频质量雷达：** 实时检测信噪比 SNR (>25dB)、爆音削波 (0%)、有效时长 (5-15s)、静音留白、RMS 动态能量与音高稳定性。
  - **共振峰声学剖析（$F_1, F_2, F_3$）：** 实时可视化喉部与口腔共鸣腔。
  - **参数化角色声音设计：** 提供 6 种预设声音（纪录片旁白、硬汉侦探、热血动漫女主、Clawd 吉祥物、赛博 AI、智者先知），支持自然语言调音。
  - **舞台配音嘴型同步：** 配音音频与画布人物嘴型动作实时咬合。
- 🌐 **代理网关监控台：** 实时测试多模型分发链路与 Token 遥测。

---

## 🛠️ CLI 命令行操作指南

```bash
# 检索动画风格
opus-motion styles -q "anime"
opus-motion styles --category Cinema

# 查看现象级提示词
opus-motion prompts -t "threejs" -n 5

# 自动生成完整导演分镜提示词
opus-motion director --style "hd-2d" --topic "云海中的古老钟楼" --duration 30

# 列出已克隆的声音档案
opus-motion voice --list

# 从参考音频中克隆声音
opus-motion voice --clone sample.wav --name "NarratorPrime"

# 测试大模型代理网关联通性
opus-motion proxy
```

---

## 📚 详细技术文档

- [`DIRECTOR.md`](DIRECTOR.md) — 导演与编剧指南：三幕结构、镜头语言、节奏把控。
- [`TECHNIQUE.md`](TECHNIQUE.md) — 技术架构与原理：画布渲染数学、Levinson-Durbin LPC 声学提取与口型同步。
- [`AGENTS.md`](AGENTS.md) — AI 编码助手行为规范。
- [`MAINTAINING.md`](MAINTAINING.md) — 风格库扩展与发布维护手册。

---

## 📄 开源许可证

本项目基于 [MIT 许可证](LICENSE) 发布。版权所有 © 2026 Antigravity & Entelechae。
