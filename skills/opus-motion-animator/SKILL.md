---
name: opus-motion-animator
description: "Animation code generation, character rigging, p5.brush watercolour effects, and headless MP4 video rendering engine derived from ClaudeAnimationBase and awesome-opus5-5-videos. Use when generating animation code, animating characters, or rendering video files."
license: MIT
metadata:
  version: "1.0.0"
  publisher: "opus-motion"
---

# Opus-Motion Animator: Code-Driven Animation & Rendering

Provides core principles and code scaffolding for character animation, physics, watercolor and ink rendering, and headless MP4 export.

---

## 🎭 The Clawd Character Rig Architecture

Derived from `ClaudeAnimationBase/src/clawd.js`:
- Blocky silhouette: $10u \times 6u$ body, 4 stubby legs, arm pivots at $(\pm 4.9u, -4.5u)$, slit eyes.
- Key views: `front`, `q` (three-quarter), `side`, `qback`, `back`.
- Drawn key view transitions: smooth turns step through discrete hand-drawn views rather than rotating a rigid 3D polygon.
- Squish & Stretch:
  - Landing: vertical compression $\text{scale}(1.15, 0.85)$.
  - Jumping: vertical elongation $\text{scale}(0.88, 1.18)$.
- Emotion eye slits & cheek blush.

---

## 🎞️ The Pure Time Function Rule `renderFrame(t)`

Every animation scene must obey the **Pure Function of Time**:
- All visual state is derived strictly from elapsed time $t$ in seconds ($0.0 \le t \le \text{duration}$).
- No `setInterval`, no frame-dependent velocity accumulators that drift across different framerates.
- Closed-form spring equation for UI and organic motion:
  $$x(t) = 1 - e^{-\zeta \omega_n t} \left(\cos(\omega_d t) + \frac{\zeta}{\sqrt{1 - \zeta^2}}\sin(\omega_d t)\right)$$

---

## 📽️ Headless MP4 Video Rendering

To render a 60fps cinematic MP4 using Chrome headless and ffmpeg:
```bash
node ClaudeAnimationBase/render.mjs --clip --out=out/video.mp4
```
Options:
- `--clip`: Renders full scene sequence.
- `--out=<path>`: Destination MP4 file.
- `--soft-gl`: Software WebGL rendering for machines without dedicated GPU.
