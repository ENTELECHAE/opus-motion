# Directing an Opus-Motion Film & Animation

The comprehensive directing guide behind every production created in Opus-Motion Studio.
Pair this with the styles directory ([`data/styles.json`](data/styles.json)), [`TECHNIQUE.md`](TECHNIQUE.md), and character rigs.

You are the director, not a tech demo. In Opus-Motion, a production is judged strictly in this hierarchy:
**1. Voice & Sound → 2. Pacing & Rhythm → 3. Camera Choreography → 4. Directing & Staging (Performance, Emotional Arc, Visual Impact)**.
Visually stunning frames are merely table stakes; emotional resonance and cinematic cohesion define the craft.

---

## 1. Taking the Brief

The director starts with an aesthetic style, a narrative topic or script, and target constraints (duration, language, character rig, voice profile, brand guidelines). 
Clarify crucial gaps once, concisely:

- **Duration:** Default 30–60 seconds. Crisp, tightly edited beats beat rambling showcases. Two to three minutes multiplies render tokens and timeline complexity.
- **Canvas & Framerate:** 1920×1080 at 60 fps (or 24 fps for cinematic stop-motion / cel looks); vertical 1080×1920 for mobile short-form (Reels/TikTok/Shorts).
- **Audio & Subtitles:** Dialogue synced to procedural mouth visemes, rendered with burnt-in captions and exported `.srt`. Target loudness: −14 LUFS.
- **Voice Selection:** 
  - English: Kokoro offline neural voices or VoiceStudio custom clone.
  - Multilingual & Chinese: Edge-TTS neural or LLM audio synthesis.
  - Clone from user reference: Upload a 5–30 second clean `.wav` or `.mp3` to extract acoustic profiles with REA radar.

---

## 2. Choosing the Benchmark

Before drafting code or animatics, identify 1–2 masterwork references (feature films, anime intros, title sequences, boutique indie games) that establish the gold standard for your selected style:

- **What to absorb:** Lighting ratios, color harmonies, staging rhythm, camera vocabulary, typographic layout.
- **What to avoid copying:** Proprietary character designs, copyrighted trademarks, specific licensed melodies.

A concrete benchmark elevates procedural code from sterile mathematics into auteur cinema.

---

## 3. Narrative Architecture (3-Act Micro-Arc)

Even a 15-second animation requires dramatic momentum:

1. **The Hook (0–3s):** Establish the visual environment and character focus immediately. Avoid empty title cards or slow fades.
2. **The Turn / Escalation (Midpoint):** A conflict, physical action, dynamic camera shift, or emotional transformation.
3. **The Native Move (Climax):** A signature visual or mathematical transition intrinsic to the chosen aesthetic (e.g., watercolor bloom in p5.brush, isometric voxel explosion in 3D, neon chromatic aberration in cyberpunk).
4. **The Resonating Resolution (Ending):** Bookend the opening shot, reveal the macro-scale, or complete the character's objective.

---

## 4. Clawd 10-Persona Character Casting

Opus-Motion features 10 fully rigged procedural character archetypes:

| Persona | Slug | Aesthetic Grammar | Best Paired Styles |
|---|---|---|---|
| **Original Warm Clawd** | `clawd` | Rounded terracotta silhouette, expressive eyes, warm bounce | Children's book, watercolor, papercraft |
| **Cyberpunk Clawd** | `cyberpunk` | Neon visor, holographic circuits, chromatic glitch offset | Sci-Fi HUD, synthwave, dark tech keynote |
| **1930s Rubberhose** | `rubberhose` | Pie-eyes, bendy spaghetti limbs, film grain, bounce step | 1930s cartoon, vintage newsreel, silent film |
| **8-Bit Pixel Clawd** | `pixel` | Orthogonal sprite grids, dithered shading, snappy poses | 16-bit RPG, microgame frenzy, game show flat |
| **Claymation Clawd** | `claymation` | Fingerprint normal maps, stop-motion 12fps jitter | Claymation, stop-motion puppet, tilt-shift |
| **Low-Poly Clawd** | `lowpoly` | Flat-shaded facets, geometric vertex joints, ambient occlusion | Low-poly island, 90s console 3D |
| **Origami Fold Clawd** | `origami` | Crisp creased planes, paper texture, unfolding transitions | Paper pop-up book, shadow puppetry, lightbox |
| **Watercolor Clawd** | `watercolor` | Pigment bleed, bleeding wet edges, organic flow lines | Chinese ink wash, urban sketch, gouache |
| **Noir Detective Clawd** | `noir` | Trenchcoat collar, Venetian blind shadows, cigarette smoke | 1940s noir, halftone dossier, visual investigation |
| **Cosmic Astral Clawd** | `cosmic` | Nebular particle trails, celestial aura, starfield glow | Sci-fi hologram, anime fantasy, astral projection |

---

## 5. Camera Grammar & Staging

Every camera movement must serve the narrative:

- **Move with Intent:** Alternate between pushes (intimacy/tension), dollies (kinetic pace), tracking (character agency), and crane/tilt (scale).
- **Depth Layers:** Maintain distinct Foreground (defocused particles/bokeh), Midground (character action), and Background (scenic horizon).
- **Rule of Thirds & Silhouettes:** Staged character poses must read clearly even when reduced to pure silhouette.

---

## 6. VoiceStudio & Sound Design

Sound is more than 50% of the emotional experience:

- **Foley Synchronization:** Every footstep, blink, mechanical whirr, and page fold must land on exact millisecond markers.
- **Three-Tier Audio Mix:**
  1. *Ambience Bed:* Rain, room tone, wind, or low synth drone.
  2. *Dialogue & Visemes:* Centered, clear, with dynamic sidechain ducking of background music (−4dB during speech).
  3. *Musical Score:* Built on tempo-locked bar grids.
- **Acoustic Profiling:** Run VoiceStudio's REA radar on reference clips to ensure optimal clarity (SNR > 25 dB), natural pitch inflection ($F_0$), and warm spectral balance.

---

## 7. The Director's Pre-Flight Checklist

Before final render and export:

- [ ] Does the hook grab attention within the first 3 seconds?
- [ ] Is dialogue synchronized with mouth visemes (`rest`, `A`, `E`, `O`, `M`, `L`)?
- [ ] Are keyframe eases continuous without abrupt pop or linear robotic motion?
- [ ] Are on-screen captions held long enough for human reading speed (minimum 1.8s)?
- [ ] Does the sound mix sit cleanly at −14 LUFS without clipping or harsh sibilance?
