# Technique: Technical Implementation & Architecture

This document specifies the internal rendering, audio synthesis, and procedural animation architecture behind **Opus-Motion Studio**.

```
                           ┌──────────────────────────────┐
                           │   Timeline & Director Cues   │
                           │   (Single Source of Truth)   │
                           └──────────────┬───────────────┘
                                          │
             ┌────────────────────────────┼────────────────────────────┐
             ▼                            ▼                            ▼
   ┌───────────────────┐        ┌───────────────────┐        ┌───────────────────┐
   │ Visual Pipeline   │        │ Audio & Voice     │        │ Character Rigging │
   │ • Canvas 2D       │        │ • REA Radar DSP   │        │ • 10 Clawd Arche- │
   │ • Three.js 3D     │        │ • LPC-16 Formants │        │   types           │
   │ • p5.brush Ink    │        │ • TTS Synthesis   │        │ • Viseme Sync     │
   │ • GLSL Shaders    │        │ • Foley & Ducking │        │ • Inverse Kinemat.│
   └─────────┬─────────┘        └─────────┬─────────┘        └─────────┬─────────┘
             │                            │                            │
             └────────────────────────────┼────────────────────────────┘
                                          ▼
                               ┌─────────────────────┐
                               │  Headless Exporter  │
                               │  Chrome + Puppeteer │
                               │  FFmpeg Mux & Audio │
                               └──────────┬──────────┘
                                          ▼
                               ┌─────────────────────┐
                               │ Final Master MP4    │
                               │ (-14 LUFS, 60fps)   │
                               └─────────────────────┘
```

---

## 1. Visual Rendering Architecture

Opus-Motion treats every animation frame as a pure, deterministic mathematical function of continuous time $t \in [0, \text{Duration}]$:

$$\text{Frame}(t) = \mathcal{R}\big(\text{Scene}(t),\, \text{Camera}(t),\, \text{Character}(t),\, \text{ShaderPasses}(t)\big)$$

### Rules for Deterministic Playback:
1. **Zero Unseeded Randomness:** `Math.random()` and wall-clock time (`Date.now()`, `performance.now()`) are forbidden in render loops. All pseudo-randomness uses seeded PRNGs (e.g., Mulberry32 or MurmurHash3).
2. **Frame Independence:** Every frame must render identically whether played in sequence or jumped to at arbitrary seek positions.
3. **Multi-Engine Support:**
   - **Canvas 2D:** High-performance procedural vector graphics, particle emitters, Bézier character rigs.
   - **Three.js (WebGL):** 3D low-poly geometries, PBR material lighting, HDRI reflections, shadow maps.
   - **p5.brush:** Watercolor physics simulation, capillary pigment bleeds, wet-on-wet blending.
   - **GLSL Post-Processing Passes:** Vignetting, CRT scanline dithering, film grain synthesis, and bloom.

---

## 2. VoiceStudio: REA Acoustic Profiling & DSP

The voice cloning and acoustic evaluation engine in Opus-Motion uses Reverse-Engineered Audio (REA) signal processing algorithms:

### 2.1 Acoustic Radar Dimensions
The interactive radar chart evaluates six core voice dimensions:
- **Pitch ($F_0$ Fundamental Frequency):** Monitored in Hz (deep baritone 80–120Hz to soprano 220–280Hz).
- **Warmth (Low-End Spectral Energy):** Integrated energy below 500 Hz relative to mid-band energy.
- **Clarity (Formant Definition):** High-frequency resolution (2.5 kHz – 4.5 kHz "singer's formant" presence).
- **Dynamic Range:** Ratio of peak RMS signal level to background floor level ($>18\text{ dB}$ required for broadcast).
- **Signal-to-Noise Ratio (SNR):** Computed via spectral subtraction; green threshold $\ge 22\text{ dB}$.
- **Pace & Rhythm:** Syllable cadence calculated via envelope onset detection.

### 2.2 Formant Extraction (Levinson-Durbin LPC-16)
Linear Predictive Coding (LPC-16) models the vocal tract filter:

$$S(z) = \frac{G}{1 - \sum_{k=1}^{p} a_k z^{-k}}$$

Roots of the predictor polynomial correspond to vocal tract resonances (formants $F_1, F_2, F_3$), driving real-time mouth viseme matching.

---

## 3. Viseme Mouth Synchronization

Mouth geometry updates dynamically at 60 fps based on phoneme intensity and formant frequencies:

| Viseme State | Phoneme Group | Mouth Width | Mouth Height | Jaw Drop |
|---|---|---|---|---|
| `rest` | Silence / Neutral | 1.00 | 0.15 | 0.00 |
| `A` | /ɑ/, /æ/, /ʌ/ (Open vowels) | 1.15 | 1.40 | 0.85 |
| `E` | /i/, /e/, /eɪ/ (Front vowels) | 1.45 | 0.65 | 0.35 |
| `O` | /oʊ/, /u/, /w/ (Round vowels)| 0.70 | 1.25 | 0.60 |
| `M` | /m/, /b/, /p/ (Bilabial stops) | 0.90 | 0.05 | 0.00 |
| `L` | /l/, /d/, /t/, /n/ (Alveolar) | 1.10 | 0.80 | 0.40 |

Interpolation between visemes uses cubic Hermite easing (`smoothstep`) with a 45ms transition window to eliminate jitter.

---

## 4. Headless MP4 Video Render Pipeline

The headless rendering script (`tools/render_video.py` or Node Puppeteer runner):
1. Spins up a headless Chromium instance with fixed viewport dimensions (e.g. `1920x1080`, `--disable-gpu-vsync`, `--force-color-profile=srgb`).
2. Iterates frame-by-frame: evaluates `window.render(t)` for $t = \frac{n}{\text{fps}}$, captures the canvas buffer via `toDataURL('image/jpeg', 0.95)`, and streams raw image pipes directly to FFmpeg.
3. Encodes video with H.264 (`-c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p`).
4. Muxes master audio tracks, dialogue takes, and sound effects with a two-pass EBU R128 loudness filter (`loudnorm=I=-14:LRA=7:TP=-1.5`).
