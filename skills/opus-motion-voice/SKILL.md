---
name: opus-motion-voice
description: "REA-extracted voice cloning, acoustic profiling, audio quality radar, text-to-speech synthesis, takes management, and video dubbing synchronization skill derived from VoiceStudio. Use when cloning voices from reference audio, analyzing audio quality, generating dialogue takes, or syncing spoken tracks with animations."
license: MIT
metadata:
  version: "1.2.0"
  publisher: "opus-motion"
---

# Opus-Motion Voice: REA VoiceStudio Cloning & Dubbing

This skill implements the high-fidelity reverse-engineered architecture of **VoiceStudio** using Reverse Engineer Anything (REA) techniques:
- **Audio Quality Radar**: Model-free advisory engine (Signal-to-Noise Ratio in dB, saturated clipping %, silence gaps, and 5–15s duration window guards).
- **Acoustic Profiling & Signature Extraction**: Autocorrelation fundamental pitch frequency ($F_0$), formant cavity resonance estimation ($F_1, F_2, F_3$), vocal register classification (Bass, Baritone, Tenor, Alto, Soprano), timbre warmth and clarity metrics.
- **Takes Management & Promotion**: Numbered synthesis takes history (`Take 01`, `Take 02`...), instant auditioning, side-by-side comparison, WAV downloads, and "Promote Take to Voice Profile".
- **Zero-Shot Formant Vocal Synthesizer**: 22050Hz 16-bit PCM wave generator with harmonic overtones, pitch jitter/vibrato, SSML quick tags, and emotional color (neutral, dramatic, whisper, heroic, melancholy).
- **Video Dubbing & Viseme Mouth-Flap Sync**: Generates timestamped cues and phonetic visemes (`A`, `O`, `E`, `M`, `F`, `L`, `REST`) for driving 60fps canvas character rigs.

---

## 🧬 REA Architecture Pipeline

### 1. Audio Quality Preflight Radar (`VoiceEngine.analyze_audio_quality`)
Scans 100ms audio windows using VoiceStudio's model-free rules:
1. **SNR Calculation**: Computes active speech level baseline vs noise floor in dB.
2. **Clipping Guard**: Detects saturated samples ($\ge 99\%$) to prevent distorted clones.
3. **Duration Bounds**:
   - $< 3.0$s: Warns that zero-shot clone may be thin or unstable.
   - $5.0$s – $15.0$s: Optimal VoiceStudio reference window.
   - $> 15.0$s: Automatically trims to the best 15s window.
4. **Silence Gaps**: Identifies dead-air gaps ($\le -50$ dB) longer than 1 second.

### 2. Acoustic Feature Extraction (`VoiceEngine._extract_deep_acoustic_signature`)
1. Autocorrelation lag analysis across $60\text{ Hz} - 450\text{ Hz}$ to detect fundamental pitch $F_0$.
2. Formant cavity peaks:
   - $F_1$ (Throat/Chest): $\approx 3.6 \times F_0$
   - $F_2$ (Oral cavity): $\approx 9.5 \times F_0$
   - $F_3$ (Timbre color): $\approx 16.0 \times F_0$
3. Classifies vocal register:
   - Bass ($< 115\text{ Hz}$)
   - Baritone ($115 - 165\text{ Hz}$)
   - Tenor ($165 - 210\text{ Hz}$)
   - Alto ($210 - 280\text{ Hz}$)
   - Soprano ($> 280\text{ Hz}$)

### 3. Takes Workflow & Promotion (`VoiceEngine.promote_take_to_profile`)
- Generates numbered takes (`take_001`, `take_002`...).
- Any generated take can be promoted to a new permanent voice profile with one click.

---

## 🛠️ CLI Operations

```bash
# List all registered voice profiles with registers and SNR
python opus-motion/cli.py voice --list

# Inspect synthesis takes history
python opus-motion/cli.py voice --takes

# Run VoiceStudio Audio Quality Radar on any audio sample
python opus-motion/cli.py voice --analyze sample.wav

# Clone a voice profile from a reference audio clip
python opus-motion/cli.py voice --clone sample.wav --name "Commander Sarah" --accent "British"

# Synthesize speech take with emotion and save output WAV
python opus-motion/cli.py voice --tts "The simulation begins now." --profile "Commander Sarah" --emotion dramatic --out take1.wav
```
