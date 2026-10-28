"""
Opus-Motion Animation Engine
Unifies p5.js/brush character rigging (ClaudeAnimationBase),
HTML5 Canvas/SVG/Three.js techniques (awesome-opus5-5-videos),
and headless video rendering pipelines.
"""
from __future__ import annotations
import json
import os
import subprocess
from typing import Dict, List, Optional, Any

CLAUDE_ANIM_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "ClaudeAnimationBase")

class AnimationEngine:
    def __init__(self):
        self.presets_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "presets.json")
        self.presets = {}
        if os.path.exists(self.presets_path):
            with open(self.presets_path, "r", encoding="utf-8") as f:
                self.presets = json.load(f)

    def generate_html_scene(
        self,
        style_slug: str,
        title: str,
        duration_sec: float = 12.0,
        character: str = "clawd",
        custom_js: str = ""
    ) -> str:
        """
        Creates a standalone, beautiful HTML5 + p5.js / Canvas animation scene.
        """
        default_canvas_script = """
  // Opus-Motion Procedural Time-Driven Animation Loop
  const canvas = document.getElementById('viewport');
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  
  const DURATION = 12.0;
  let startTime = performance.now();
  let isPlaying = true;
  let manualTime = 0;

  function renderFrame(t) {
    // Background style
    ctx.fillStyle = '#0f111a';
    ctx.fillRect(0, 0, W, H);

    // Dynamic grid & light rays
    ctx.strokeStyle = 'rgba(77, 208, 225, 0.08)';
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 60) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for (let y = 0; y < H; y += 60) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Organic floating energy particles
    const numParticles = 40;
    for (let i = 0; i < numParticles; i++) {
      const pTime = (t * 0.5 + i * 0.25) % DURATION;
      const progress = pTime / DURATION;
      const px = (Math.sin(i * 1.7 + t * 0.8) * 0.4 + 0.5) * W;
      const py = H - (progress * H);
      const rad = (Math.sin(t * 2 + i) * 2 + 4);
      
      const grad = ctx.createRadialGradient(px, py, 0, px, py, rad * 2);
      grad.addColorStop(0, 'rgba(0, 230, 246, 0.9)');
      grad.addColorStop(1, 'rgba(157, 78, 221, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, rad * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Hero Character / Central Motion Motif
    ctx.save();
    ctx.translate(W / 2, H / 2);

    // Natural breathing / bobbing
    const bob = Math.sin(t * 3.5) * 14;
    const squish = Math.cos(t * 3.5) * 0.05;
    ctx.translate(0, bob);
    ctx.scale(1 + squish, 1 - squish);

    // Character Silhouette glow
    ctx.shadowColor = '#00f2fe';
    ctx.shadowBlur = 35;
    ctx.fillStyle = '#1e2438';
    
    // Rounded block body (Clawd style)
    const bw = 160, bh = 110, br = 24;
    ctx.beginPath();
    ctx.roundRect(-bw / 2, -bh / 2, bw, bh, br);
    ctx.fill();

    // Eyes
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#4facfe';
    const blink = Math.sin(t * 1.5) > 0.96 ? 2 : 16;
    const eyeLook = Math.sin(t * 0.8) * 8;
    ctx.fillRect(-45 + eyeLook, -15, 12, blink);
    ctx.fillRect(35 + eyeLook, -15, 12, blink);

    // Cheeks
    ctx.fillStyle = 'rgba(255, 107, 129, 0.45)';
    ctx.beginPath(); ctx.arc(-55, 12, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(55, 12, 10, 0, Math.PI * 2); ctx.fill();

    ctx.restore();

    // Timeline watermark & HUD
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.font = '14px Outfit, sans-serif';
    ctx.fillText(`OPUS-MOTION // SEC: ${t.toFixed(2)}s / ${DURATION.toFixed(1)}s`, 32, 42);
    ctx.fillText(`STYLE: ${window.OPUS_STYLE_NAME || 'CINEMATIC'}`, 32, 64);
  }

  function loop() {
    if (isPlaying) {
      const now = performance.now();
      const t = ((now - startTime) / 1000) % DURATION;
      renderFrame(t);
      const scrubber = document.getElementById('scrubber');
      if (scrubber) scrubber.value = (t / DURATION) * 100;
      const timeDisplay = document.getElementById('time-display');
      if (timeDisplay) timeDisplay.textContent = `${t.toFixed(2)}s / ${DURATION.toFixed(1)}s`;
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  window.seekTime = function(pct) {
    isPlaying = false;
    const t = (pct / 100) * DURATION;
    renderFrame(t);
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) timeDisplay.textContent = `${t.toFixed(2)}s / ${DURATION.toFixed(1)}s`;
  };
  window.togglePlay = function() {
    isPlaying = !isPlaying;
    if (isPlaying) startTime = performance.now();
  };
"""

        js_code = custom_js if custom_js.strip() else default_canvas_script

        html = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{title} - Opus-Motion</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    * {{ box-sizing: border-box; margin: 0; padding: 0; }}
    body {{
      background: #090b10;
      color: #e2e8f0;
      font-family: 'Outfit', sans-serif;
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }}
    .stage {{
      width: min(100%, 1100px);
      background: rgba(18, 22, 34, 0.7);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 242, 254, 0.1);
    }}
    .viewport-box {{
      width: 100%;
      aspect-ratio: 16 / 9;
      background: #000;
      position: relative;
    }}
    canvas {{
      width: 100%;
      height: 100%;
      display: block;
    }}
    .controls {{
      padding: 18px 24px;
      background: rgba(13, 16, 26, 0.95);
      border-top: 1px solid rgba(255, 255, 255, 0.08);
      display: flex;
      gap: 16px;
      align-items: center;
    }}
    .btn {{
      background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
      color: #04101e;
      border: none;
      padding: 10px 20px;
      border-radius: 10px;
      font-weight: 700;
      font-size: 14px;
      cursor: pointer;
      transition: all 0.2s ease;
    }}
    .btn:hover {{
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 242, 254, 0.4);
    }}
    .scrub-bar {{
      flex: 1;
      height: 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.15);
      outline: none;
      accent-color: #00f2fe;
      cursor: pointer;
    }}
    .time-badge {{
      font-family: 'JetBrains Mono', monospace;
      font-size: 13px;
      color: #00f2fe;
      min-width: 130px;
      text-align: right;
    }}
  </style>
</head>
<body>
  <div class="stage">
    <div class="viewport-box">
      <canvas id="viewport" width="1920" height="1080"></canvas>
    </div>
    <div class="controls">
      <button class="btn" onclick="window.togglePlay()">Play / Pause</button>
      <input type="range" class="scrub-bar" id="scrubber" min="0" max="100" value="0" oninput="window.seekTime(this.value)">
      <span class="time-badge" id="time-display">0.00s / {duration_sec:.1f}s</span>
    </div>
  </div>

  <script>
    window.OPUS_STYLE_NAME = "{style_slug.upper()}";
    {js_code}
  </script>
</body>
</html>
"""
        return html

    def run_headless_render(self, scene_js_path: str, out_mp4_path: str) -> Dict[str, Any]:
        """
        Bridges to ClaudeAnimationBase/render.mjs to render MP4 with Chrome and ffmpeg.
        """
        render_script = os.path.join(CLAUDE_ANIM_BASE, "render.mjs")
        if not os.path.exists(render_script):
            return {"success": False, "error": f"Renderer not found at {render_script}"}

        cmd = ["node", render_script, "--clip", f"--out={out_mp4_path}"]
        try:
            res = subprocess.run(cmd, cwd=CLAUDE_ANIM_BASE, capture_output=True, text=True, timeout=120)
            return {
                "success": res.returncode == 0,
                "output": res.stdout,
                "error": res.stderr if res.returncode != 0 else None
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
