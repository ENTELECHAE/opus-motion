"""
Opus-Motion CLI
Command-line interface for the hybrid animation, voice cloning, and style prompt system.
"""
import argparse
import json
import os
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.styles_engine import StylesEngine
from core.voice_engine import VoiceEngine
from core.animation_engine import AnimationEngine
from core.proxy_engine import ProxyEngine

def main():
    parser = argparse.ArgumentParser(description="Opus-Motion: All-in-One AI Film, Animation Styles & Voice Cloning Studio")
    subparsers = parser.add_subparsers(dest="command", help="Subcommand to execute")

    # Studio command
    sub_studio = subparsers.add_parser("studio", help="Launch the Opus-Motion Studio Web App")
    sub_studio.add_argument("--port", type=int, default=5173, help="Port to listen on (default: 5173)")

    # Styles command
    sub_styles = subparsers.add_parser("styles", help="Browse and search animation styles")
    sub_styles.add_argument("--query", "-q", type=str, default="", help="Search query")
    sub_styles.add_argument("--category", "-c", type=str, default="", help="Filter by category")

    # Prompts command
    sub_prompts = subparsers.add_parser("prompts", help="Search 700+ viral video prompts")
    sub_prompts.add_argument("--query", "-q", type=str, default="", help="Search query")
    sub_prompts.add_argument("--tech", "-t", type=str, default="", help="Filter by tech (canvas, svg, threejs, gsap)")
    sub_prompts.add_argument("--limit", "-n", type=int, default=10, help="Max items to list")

    # Director prompt command
    sub_director = subparsers.add_parser("director", help="Generate complete AI Director prompt for film creation")
    sub_director.add_argument("--style", "-s", type=str, default="hd-2d", help="Style slug (e.g. hd-2d, watercolor, cel-anime-80s)")
    sub_director.add_argument("--topic", "-t", type=str, required=True, help="Story topic or narrative idea")
    sub_director.add_argument("--character", type=str, default="Clawd", help="Protagonist name or archetype")
    sub_director.add_argument("--duration", "-d", type=int, default=15, help="Video duration in seconds")
    sub_director.add_argument("--model", "-m", type=str, default="claude-opus-5.5", help="Target AI model")

    # Voice commands
    sub_voice = subparsers.add_parser("voice", help="Voice cloning, radar analysis, and synthesis")
    sub_voice.add_argument("--list", action="store_true", help="List all voice profiles")
    sub_voice.add_argument("--takes", action="store_true", help="List all synthesis takes history")
    sub_voice.add_argument("--tts", type=str, default="", help="Synthesize text to speech")
    sub_voice.add_argument("--profile", type=str, default="narrator-david", help="Voice profile ID")
    sub_voice.add_argument("--emotion", type=str, default="neutral", help="Emotion style (neutral, dramatic, whisper, heroic, melancholy)")
    sub_voice.add_argument("--out", type=str, default="output.wav", help="Output WAV file path")
    sub_voice.add_argument("--clone", type=str, default="", help="Path to reference audio file to clone")
    sub_voice.add_argument("--name", type=str, default="Cloned Voice", help="Name for the cloned profile")
    sub_voice.add_argument("--accent", type=str, default="custom", help="Accent / dialect tag")
    sub_voice.add_argument("--analyze", type=str, default="", help="Run VoiceStudio model-free Audio Quality Radar on a WAV file")

    # Proxy command
    sub_proxy = subparsers.add_parser("proxy", help="Check CLIProxyAPI and LLM model status")

    args = parser.parse_args()

    styles_engine = StylesEngine()
    voice_engine = VoiceEngine()
    anim_engine = AnimationEngine()
    proxy_engine = ProxyEngine()

    if args.command == "studio":
        os.environ["PORT"] = str(args.port)
        from server import run_server
        run_server()

    elif args.command == "styles":
        results = styles_engine.search_styles(query=args.query, category=args.category)
        print(f"\n🎬 Found {len(results)} Animation Styles:")
        print("-" * 75)
        for s in results[:25]:
            print(f"[{s.get('slug', 'N/A')}] {s.get('en', '')} ({s.get('cn', '')})")
            print(f"   Category: {s.get('category_en', '')} | Film Demo: {s.get('film', 'N/A')}")
            print(f"   Logline: {s.get('line', '')}")
            print()
        if len(results) > 25:
            print(f"... and {len(results) - 25} more styles.")

    elif args.command == "prompts":
        results = styles_engine.search_prompts(query=args.query, tech=args.tech, limit=args.limit)
        print(f"\n💡 Found {len(results)} Viral Video Prompts:")
        print("-" * 75)
        for p in results:
            techs = ", ".join(p.get("tech_tags", []))
            print(f"• Slug: {p.get('slug', '')} | Tech: {techs} | Category: {p.get('category', '')}")
            prompt_preview = p.get("prompt", "").replace("\n", " ")[:120]
            print(f"  Prompt: {prompt_preview}...")
            print()

    elif args.command == "director":
        res = styles_engine.generate_director_prompt(
            style_slug=args.style,
            story_topic=args.topic,
            character=args.character,
            duration_sec=args.duration,
            target_model=args.model
        )
        print("\n" + "=" * 75)
        print(f" OPUS-MOTION DIRECTOR PROMPT // Style: {args.style.upper()}")
        print("=" * 75 + "\n")
        print(res["prompt"])
        print("\n" + "=" * 75)

    elif args.command == "voice":
        if args.list:
            profiles = voice_engine.list_profiles()
            print(f"\n🎙️ Registered Voice Profiles ({len(profiles)}):")
            print("-" * 75)
            for v in profiles:
                sig = v.get("acoustic_signature", {})
                reg = sig.get("vocal_register", "Standard")
                f0 = round(v.get("base_pitch_hz", 140))
                snr = f" | SNR: {sig.get('snr_db')} dB" if "snr_db" in sig else ""
                print(f"• [{v.get('id')}] {v.get('name')} ({reg}, {f0} Hz{snr})")
                print(f"  Tone: {v.get('tone')} | Accent: {v.get('accent', 'neutral')}")
            print()
        elif args.takes:
            takes = voice_engine.list_takes()
            print(f"\n🎬 Synthesis Takes History ({len(takes)}):")
            print("-" * 75)
            for t in takes:
                print(f"• Take {t.get('take_number')}: [{t.get('profile_name')}] ({t.get('duration_sec')}s, {t.get('emotion')}) at {t.get('timestamp')}")
                print(f"  Text: \"{t.get('clean_text', t.get('text', ''))[:80]}\"")
            print()
        elif args.analyze:
            if not os.path.exists(args.analyze):
                print(f"Error: audio file {args.analyze} not found.")
                return
            with open(args.analyze, "rb") as af:
                data = af.read()
            report = voice_engine.analyze_audio_quality(data)
            print("\n" + "=" * 70)
            print(f" 📡 VOICESTUDIO REA AUDIO QUALITY RADAR // {os.path.basename(args.analyze)}")
            print("=" * 70)
            print(f"Overall Status:    {report['status_badge']}")
            print(f"SNR (Noise Floor): {report['snr_db']} dB")
            print(f"Clipping Saturated:{report['clipping_pct']}%")
            print(f"Duration:          {report['duration_sec']}s (Sample Rate: {report['sample_rate']} Hz)")
            print(f"Recommendation:    {report['recommendation']}")
            if report.get("warnings"):
                print("\nAdvisory Warnings:")
                for w in report["warnings"]:
                    print(f"  • [{w['start']}s - {w['end']}s] {w['message']}")
            print("=" * 70 + "\n")
        elif args.clone:
            if not os.path.exists(args.clone):
                print(f"Error: audio file {args.clone} not found.")
                return
            with open(args.clone, "rb") as af:
                data = af.read()
            profile = voice_engine.clone_voice_from_audio(
                name=args.name,
                audio_data=data,
                audio_filename=os.path.basename(args.clone),
                accent=args.accent
            )
            print(f"✅ Voice cloned successfully! Profile ID: {profile['id']}")
            print(f"Register: {profile['acoustic_signature'].get('vocal_register')} ({round(profile['base_pitch_hz'])} Hz)")
            print(f"Acoustic Signature: {json.dumps(profile['acoustic_signature'], indent=2)}")
        elif args.tts:
            wav_bytes, meta = voice_engine.synthesize_speech(
                text=args.tts,
                profile_id=args.profile,
                emotion=args.emotion
            )
            with open(args.out, "wb") as out_f:
                out_f.write(wav_bytes)
            print(f"✅ Synthesized Take {meta['take_number']} ({meta['duration_sec']}s, {meta['emotion']}) to {args.out} using voice [{meta['profile_name']}].")
        else:
            print("Use --list, --takes, --analyze <file>, --tts '...', or --clone <path>.")

    elif args.command == "proxy":
        health = proxy_engine.check_proxy_health()
        print("\n🌐 CLIProxyAPI & Model Routing Status:")
        print("-" * 65)
        print(f"Status: {health.get('status')}")
        if "message" in health:
            print(f"Note: {health.get('message')}")
        print("\nSupported Routing Models:")
        for m in proxy_engine.list_models():
            print(f"• [{m['id']}] {m['name']} ({m['provider']}) - {m['role']}")
        print()

    else:
        parser.print_help()

if __name__ == "__main__":
    main()
