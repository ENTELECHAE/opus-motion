---
name: opus-motion-proxy
description: "Multi-account and multi-model LLM proxy routing skill derived from CLIProxyAPI. Use when configuring API gateways, routing agent prompts to Claude Opus, Gemini, GPT, Kimi, or Grok, or inspecting proxy status."
license: MIT
metadata:
  version: "1.0.0"
  publisher: "opus-motion"
---

# Opus-Motion Proxy: Multi-Model LLM Gateway

Adapted from **CLIProxyAPI** to provide transparent model routing, token optimization, and unified OpenAI/Gemini/Claude endpoints for autonomous coding agents.

---

## 🌐 Supported Model Matrix

| Model Identifier | Provider | Primary Strength in Opus-Motion |
| :--- | :--- | :--- |
| **`claude-opus-5.5`** | Anthropic | Film direction, storyboard breakdown, and complex artistic shaders. |
| **`gemini-3.8-flash`** | Google | Instantaneous coding agent loops, 60fps canvas debugging, and real-time tweaks. |
| **`gemini-3.1-pro`** | Google | Multimodal visual reasoning and frame-by-frame critique. |
| **`gpt-5.6`** | OpenAI | Precise UI hierarchy, geometry calculations, and SVG vectors. |
| **`kimi-k3`** | Moonshot | Long-horizon multi-scene script planning with 1M context window. |
| **`grok-4.5`** | xAI | Fast algorithmic motion graphics and physics simulations. |

---

## ⚡ Local Proxy Setup

To connect Opus-Motion to a running `CLIProxyAPI` instance:
1. Ensure `CLIProxyAPI` is running on port `8317`:
   ```bash
   cd CLIProxyAPI && go run cmd/server/main.go
   ```
2. Verify connectivity:
   ```bash
   python opus-motion/cli.py proxy
   ```
3. Opus-Motion will automatically route all generation traffic through the local proxy with multi-account rotation and rate-limit buffering.
