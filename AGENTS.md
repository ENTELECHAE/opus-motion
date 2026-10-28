# Opus-Motion: Instructions for AI Coding Agents

This repository is an AI-powered code-driven animation studio, visual style library, voice cloner, and multi-model routing gateway.

| User Intent | Workflow | Reference |
|---|---|---|
| Direct or produce an animated film | Follow 3-act structure, select style and character rig | [`DIRECTOR.md`](DIRECTOR.md) |
| Create or modify procedural animation code | Deterministic Canvas 2D / Three.js / p5.brush | [`TECHNIQUE.md`](TECHNIQUE.md) |
| Browse or curate film styles | 157 catalogued styles | [`data/styles.json`](data/styles.json) |
| Clone voice or generate dialogue | REA radar profiling, TTS, takes sync | Studio Voice Tab / Voice API |
| Configure LLM Proxy Gateway | Multi-account load balancing & failover | Proxy Tab / `cli.py proxy` |

---

## Agent Operational Rules

1. **Deterministic Animation:** Never introduce unseeded `Math.random()` or wall-clock timestamps (`Date.now()`) into animation render routines. All frames must be deterministically reproducible from timestamp `t`.
2. **Minimalist UI Standards:** The web studio interface follows a dark, superminimal aesthetic inspired by modern minimalist developer tools: monochromatic zinc palettes, sharp typography, no emojis in production cards, glassmorphic surfaces, and crisp micro-borders.
3. **Audio-Visual Tightness:** Always ensure dialogue tracks land with matching mouth viseme animations and subtitles are legible for at least 1.8 seconds.
4. **Resilience & Offline Operation:** Web pages and studio tools must operate seamlessly offline or on static hosts (like GitHub Pages) by reading relative catalogs (`data/*.json`) when the local server is unavailable.
5. **Security:** Never commit API keys, authentication tokens, or `.env` files into source control. All sensitive keys are loaded via environment variables or the `.env` template.
