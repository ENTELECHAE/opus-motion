"""
Opus-Motion Server
Unified REST API & Studio Web App Server
Zero external dependency requirement (built on Python standard library)
"""
from __future__ import annotations
import base64
import json
import mimetypes
import os
import sys
import time
import urllib.parse
from http.server import HTTPServer, SimpleHTTPRequestHandler

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")
if hasattr(sys.stderr, "reconfigure"):
    sys.stderr.reconfigure(encoding="utf-8")

# Import Opus-Motion Core
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from core.styles_engine import StylesEngine
from core.voice_engine import VoiceEngine
from core.animation_engine import AnimationEngine
from core.proxy_engine import ProxyEngine

PORT = int(os.environ.get("PORT", 5173))
STUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "studio")

styles_engine = StylesEngine()
voice_engine = VoiceEngine()
anim_engine = AnimationEngine()
proxy_engine = ProxyEngine()

class OpusMotionHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=STUDIO_DIR, **kwargs)

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS, HEAD")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_HEAD(self):
        if self.path.startswith("/api/"):
            self.send_response(200)
            self.send_header("Content-Type", "application/json; charset=utf-8")
            self.send_header("Access-Control-Allow-Origin", "*")
            self.end_headers()
            return
        super().do_HEAD()

    def send_json(self, data: Any, status: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if path == "/api/styles":
            q = params.get("q", [""])[0]
            cat = params.get("category", [""])[0]
            results = styles_engine.search_styles(query=q, category=cat)
            self.send_json({"count": len(results), "styles": results})
            return

        elif path == "/api/styles/clawd":
            clawd_styles = styles_engine.get_clawd_styles()
            chapters = styles_engine.get_clawd_chapters()
            self.send_json({
                "count": len(clawd_styles),
                "chapters": chapters,
                "styles": clawd_styles
            })
            return

        elif path == "/api/prompts":
            q = params.get("q", [""])[0]
            cat = params.get("category", [""])[0]
            tech = params.get("tech", [""])[0]
            limit = int(params.get("limit", [50])[0])
            results = styles_engine.search_prompts(query=q, category=cat, tech=tech, limit=limit)
            self.send_json({"count": len(results), "prompts": results})
            return

        elif path == "/api/presets":
            self.send_json(styles_engine.presets)
            return

        elif path == "/api/voices":
            profiles = voice_engine.list_profiles()
            self.send_json({"count": len(profiles), "voices": profiles})
            return

        elif path == "/api/proxy/status":
            health = proxy_engine.check_proxy_health()
            models = proxy_engine.list_models()
            self.send_json({"health": health, "models": models})
            return

        elif path == "/api/voice/takes":
            takes = voice_engine.list_takes()
            self.send_json({"count": len(takes), "takes": takes})
            return

        elif path == "/api/voice/dsp/presets":
            presets = voice_engine.list_dsp_presets()
            self.send_json({"count": len(presets), "presets": presets})
            return


        elif path.startswith("/api/voice/take/audio/"):
            tid = path.split("/")[-1]
            fpath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "takes", f"{tid}.wav")
            if os.path.exists(fpath):
                with open(fpath, "rb") as af:
                    content = af.read()
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(content)
                return
            else:
                self.send_json({"error": "Take audio not found"}, 404)
                return

        elif path.startswith("/api/voice/audio/"):
            # Serve raw audio file by ID
            vid = path.split("/")[-1]
            fpath = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "voices", f"{vid}.wav")
            if os.path.exists(fpath):
                with open(fpath, "rb") as af:
                    content = af.read()
                self.send_response(200)
                self.send_header("Content-Type", "audio/wav")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(content)
                return
            else:
                self.send_json({"error": "Audio not found"}, 404)
                return
        elif path.startswith("/api/style/frame/"):
            slug = path.split("/")[-1].replace(".jpg", "")
            fpath = os.path.join(STUDIO_DIR, "frames", f"{slug}.jpg")
            if not os.path.exists(fpath):
                fpath = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "lemo-opuscar", "docs", "frames", f"{slug}.jpg")
            if os.path.exists(fpath):
                with open(fpath, "rb") as im:
                    content = im.read()
                self.send_response(200)
                self.send_header("Content-Type", "image/jpeg")
                self.send_header("Content-Length", str(len(content)))
                self.send_header("Cache-Control", "public, max-age=86400")
                self.send_header("Access-Control-Allow-Origin", "*")
                self.end_headers()
                self.wfile.write(content)
                return
            else:
                self.send_json({"error": "Frame image not found"}, 404)
                return

        elif path == "/favicon.ico":
            self.send_response(204)
            self.end_headers()
            return

        # Serve static files
        super().do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        content_len = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(content_len).decode("utf-8") if content_len > 0 else "{}"
        try:
            payload = json.loads(body)
        except Exception:
            payload = {}

        if path == "/api/director/prompt":
            style_slug = payload.get("style", "hd-2d")
            topic = payload.get("topic", "A journey through a neon forest")
            character = payload.get("character", "Clawd")
            duration = int(payload.get("duration", 15))
            model = payload.get("model", "claude-opus-5.5")
            res = styles_engine.generate_director_prompt(
                style_slug=style_slug,
                story_topic=topic,
                character=character,
                duration_sec=duration,
                target_model=model
            )
            self.send_json(res)
            return

        elif path == "/api/voice/analyze":
            audio_b64 = payload.get("audio_base64", "")
            if audio_b64.startswith("data:"):
                audio_b64 = audio_b64.split(",", 1)[-1]
            audio_bytes = base64.b64decode(audio_b64) if audio_b64 else b""
            report = voice_engine.analyze_audio_quality(audio_bytes)
            self.send_json(report)
            return

        elif path == "/api/voice/clone":
            name = payload.get("name", "New Voice Clone")
            tone = payload.get("tone", "")
            gender = payload.get("gender", "neutral")
            accent = payload.get("accent", "custom")
            transcript = payload.get("transcript", "")
            audio_b64 = payload.get("audio_base64", "")
            
            if audio_b64.startswith("data:"):
                audio_b64 = audio_b64.split(",", 1)[-1]
            
            audio_bytes = base64.b64decode(audio_b64) if audio_b64 else b""
            if not audio_bytes:
                # Synthesize demo acoustic seed with articulate neural speech
                seed_profile = {
                    "id": f"clone-seed-{int(time.time())}",
                    "gender": gender,
                    "accent": accent,
                    "base_pitch_hz": 150.0
                }
                audio_bytes, _, _ = voice_engine._synthesize_accurate_speech(
                    text="This is an articulate reference voice sample for zero-shot voice profile calibration.",
                    profile=seed_profile,
                    speed=1.0,
                    pitch=1.0,
                    emotion="neutral"
                )

            profile = voice_engine.clone_voice_from_audio(
                name=name,
                audio_data=audio_bytes,
                audio_filename=payload.get("filename", "reference.wav"),
                tone_description=tone,
                gender=gender,
                accent=accent,
                transcript=transcript
            )
            self.send_json({"success": True, "profile": profile})
            return

        elif path == "/api/voice/design":
            name = payload.get("name", "Designed Voice")
            desc = payload.get("description", "Acoustically designed voice")
            gender = payload.get("gender", "neutral")
            accent = payload.get("accent", "natural")
            base_pitch = float(payload.get("base_pitch_hz", 145.0))
            warmth = float(payload.get("warmth", 0.85))
            clarity = float(payload.get("clarity", 0.90))
            breathiness = float(payload.get("breathiness", 0.0))
            speaking_rate = float(payload.get("speaking_rate", 1.0))
            preset_type = payload.get("preset_type", "custom")
            sample_script = payload.get("sample_script", "This voice was synthesized through VoiceStudio parametric voice design.")

            profile, ref_wav = voice_engine.design_voice(
                name=name,
                description=desc,
                gender=gender,
                accent=accent,
                base_pitch_hz=base_pitch,
                warmth=warmth,
                clarity=clarity,
                breathiness=breathiness,
                speaking_rate=speaking_rate,
                preset_type=preset_type,
                sample_script=sample_script
            )
            dsp_preset = payload.get("dsp_preset", "warm")
            # Also synthesize Take 01 for this designed voice
            wav_bytes, meta = voice_engine.synthesize_speech(
                text=sample_script,
                profile_id=profile["id"],
                speed=speaking_rate,
                pitch=1.0,
                emotion="neutral",
                warmth=warmth,
                clarity=clarity,
                dsp_preset=dsp_preset
            )
            b64_audio = base64.b64encode(wav_bytes).decode("utf-8")
            self.send_json({
                "success": True,
                "profile": profile,
                "take": meta,
                "audio_base64": f"data:audio/wav;base64,{b64_audio}"
            })
            return

        elif path == "/api/voice/synthesize":
            text = payload.get("text", "Welcome to Opus-Motion.")
            profile_id = payload.get("profile_id", "narrator-david")
            speed = float(payload.get("speed", 1.0))
            pitch = float(payload.get("pitch", 1.0))
            emotion = payload.get("emotion", "neutral")
            warmth = float(payload.get("warmth", 0.85))
            clarity = float(payload.get("clarity", 0.90))
            dsp_preset = payload.get("dsp_preset", "broadcast")

            wav_bytes, meta = voice_engine.synthesize_speech(
                text=text,
                profile_id=profile_id,
                speed=speed,
                pitch=pitch,
                emotion=emotion,
                warmth=warmth,
                clarity=clarity,
                dsp_preset=dsp_preset
            )
            b64_audio = base64.b64encode(wav_bytes).decode("utf-8")
            self.send_json({
                "success": True,
                "metadata": meta,
                "audio_base64": f"data:audio/wav;base64,{b64_audio}"
            })
            return


        elif path == "/api/voice/take/promote":
            take_id = payload.get("take_id", "")
            name = payload.get("name", "Promoted Voice")
            profile = voice_engine.promote_take_to_profile(take_id, name)
            if profile:
                self.send_json({"success": True, "profile": profile})
            else:
                self.send_json({"error": "Failed to promote take"}, 400)
            return

        elif path == "/api/voice/profile/delete":
            pid = payload.get("profile_id", "")
            ok = voice_engine.delete_profile(pid)
            self.send_json({"success": ok})
        elif path == "/api/voice/ai-script":
            topic = payload.get("topic", "A moment of quiet determination in a neon rainstorm.")
            profile_id = payload.get("profile_id", "narrator-david")
            emotion = payload.get("emotion", "neutral")
            duration = float(payload.get("duration", 12.0))
            res = voice_engine.generate_voice_script(
                topic=topic,
                profile_id=profile_id,
                emotion=emotion,
                duration_sec=duration
            )
            self.send_json(res)
            return

        elif path == "/api/voice/ai-enrich":
            name = payload.get("name", "Custom Voice")
            tone = payload.get("tone", "")
            transcript = payload.get("transcript", "")
            res = voice_engine.ai_enrich_voice_clone(
                name=name,
                tone=tone,
                transcript=transcript
            )
            self.send_json(res)
            return

        elif path == "/api/voice/dub":
            cues = payload.get("cues", [])
            dur = float(payload.get("video_duration_sec", 15.0))
            res = voice_engine.build_dubbing_timeline(cues, dur)
            self.send_json(res)
            return

        elif path == "/api/scene/generate":
            style_slug = payload.get("style", "hd-2d")
            title = payload.get("title", "Opus Motion Film")
            duration = float(payload.get("duration", 12.0))
            char = payload.get("character", "clawd")
            custom_js = payload.get("custom_js", "")
            html = anim_engine.generate_html_scene(
                style_slug=style_slug,
                title=title,
                duration_sec=duration,
                character=char,
                custom_js=custom_js
            )
            self.send_json({"html": html})
            return

        elif path == "/api/proxy/route":
            prompt = payload.get("prompt", "")
            model = payload.get("model", "claude-opus-5.5")
            res = proxy_engine.route_prompt(prompt, model)
            self.send_json(res)
            return

        self.send_json({"error": f"Unknown endpoint {path}"}, 404)

def run_server():
    server = HTTPServer(("0.0.0.0", PORT), OpusMotionHandler)
    print(f"==================================================")
    print(f" Opus-Motion Studio is live on http://localhost:{PORT}")
    print(f" Integrated Animation Styles: 59 | Prompts: 703")
    print(f" VoiceStudio Cloner & CLIProxyAPI Gateway Ready")
    print(f"==================================================")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")

if __name__ == "__main__":
    run_server()
