---
name: opus-motion
description: "All-in-one AI film studio, code-driven animation synthesizer, and voice cloner uniting lemo-opuscar, ClaudeAnimationBase, awesome-opus5-5-videos, VoiceStudio, and CLIProxyAPI. Use when the user asks to direct animated videos, generate prompts for 59+ film styles, build p5/Three.js animation code, clone voices, or dub video scripts."
license: MIT
metadata:
  version: "1.0.0"
  publisher: "opus-motion"
  author: "Antigravity & Entelechae"
  styles_count: 59
  prompts_count: 703
---

# Opus-Motion: All-in-One AI Film & Animation Studio

Opus-Motion unifies the capabilities of five frontier creative and generative tools into a single cohesive production engine:
1. **Lemo-Opuscar**: 59 cinematic film animation styles written entirely in code.
2. **ClaudeAnimationBase**: p5.js & p5.brush character rigging, emotions, brush-wipe transitions, and headless Chrome MP4 renderer.
3. **Awesome-Opus5-5-Videos**: 703 viral code-driven video prompts across Canvas, SVG, Three.js, Shaders, and GSAP.
4. **VoiceStudio (REA)**: Reverse-engineered voice cloning from reference audio, high-fidelity TTS speech synthesis, and timestamped video dubbing.
5. **CLIProxyAPI**: Multi-account LLM proxy router for Claude Opus 5.5, Gemini 3.8 Flash, Gemini 3.1 Pro, GPT-5, Kimi K3, and Grok.

---

## 🎬 Filmmaking Pipeline (The 5-Gate Workflow)

When directed to create an animation, short film, or motion graphic, execute through these 5 sequential gates:

### Gate 1: Visual Style Selection & Narrative Logline
- Identify the visual aesthetic from the 59 styles catalog (e.g. `hd-2d`, `cel-anime-80s`, `watercolor`, `halftone-dossier`, `kino-montage`, `hologram-hud`, `papercut-red`).
- Define the story logline, mood, aspect ratio (16:9 widescreen or 1:1 square), and target runtime (10s to 60s).
- Run: `python opus-motion/cli.py director --style <style> --topic "<story>" --duration <sec>`

### Gate 2: Character Rigging & Emotional Acting
- Choose or design the character rig (e.g. `clawd` mascot, `noir_detective`, `cyber_runner`, or `pixel_wanderer`).
- Map key emotions across the timeline:
  - Anticipation → Action → Overshoot → Reaction.
  - Set emotional states: `happy`, `proud`, `curious`, `focused`, `sad`, `scared`, `love`.
- Enforce the **Zero Static Pauses** rule: breathing, idle bobbing, or atmospheric particles must move on every frame.

### Gate 3: Procedural Code Animation (Canvas / p5 / Three.js)
- Build the scene as a **pure function of time** `renderFrame(t)` or `seek(t)`:
  - No asynchronous race conditions or unmetered timers.
  - Closed-form spring physics for UI motion and elastic movement.
  - Use continuous time `t` (0.00s to runtime).
- Utilize organic transitions: watercolor brush wipes, chromatic glitch cuts, halftone dot dissolves.

### Gate 4: REA Voice Cloning & Dialogue Dubbing
- Clone the speaker's vocal timbre from reference audio:
  - Run: `python opus-motion/cli.py voice --clone <audio_path> --name "<name>"`
  - Or pick an archetype: `narrator-david`, `noir-marlowe`, `anime-rin`, `mascot-clawd`.
- Synthesize dialogue lines:
  - Run: `python opus-motion/cli.py voice --tts "<line>" --profile <profile_id> --out speech.wav`
- Generate synchronized video dubbing cue sheet:
  - Automatically paces syllables and reading speed to match scene transitions.

### Gate 5: Headless Render & Review
- Test the scene interactively in the Opus-Motion Web Studio: `python opus-motion/cli.py studio`
- Export high-resolution contact sheets and final MP4 video using Chrome headless rendering:
  - Run: `node ClaudeAnimationBase/render.mjs --clip --out=out/video.mp4`

---

## 🛠️ CLI Reference

```bash
# Launch interactive web studio
python opus-motion/cli.py studio --port 5173

# Search 59 animation styles
python opus-motion/cli.py styles -q "anime"

# Search 700+ viral video prompts
python opus-motion/cli.py prompts -t "threejs" -n 5

# Generate complete director prompt
python opus-motion/cli.py director --style "hd-2d" --topic "A hero awakens in a shattered sanctuary"

# Clone a voice from audio file
python opus-motion/cli.py voice --clone reference.wav --name "HeroVoice"

# Synthesize speech
python opus-motion/cli.py voice --tts "The dawn approaches." --profile "narrator-david" --out speech.wav
```

---

## 📁 Component Deep-Links
- [Opus-Motion Studio](file:///c:/Users/tantr/OneDrive/Desktop/ENTELECHAE/repos%20entele/motion%20hybrid/opus-motion/studio/index.html)
- [Styles Engine](file:///c:/Users/tantr/OneDrive/Desktop/ENTELECHAE/repos%20entele/motion%20hybrid/opus-motion/core/styles_engine.py)
- [Voice Engine (REA)](file:///c:/Users/tantr/OneDrive/Desktop/ENTELECHAE/repos%20entele/motion%20hybrid/opus-motion/core/voice_engine.py)
- [Animation Engine](file:///c:/Users/tantr/OneDrive/Desktop/ENTELECHAE/repos%20entele/motion%20hybrid/opus-motion/core/animation_engine.py)
- [CLI Proxy Engine](file:///c:/Users/tantr/OneDrive/Desktop/ENTELECHAE/repos%20entele/motion%20hybrid/opus-motion/core/proxy_engine.py)
