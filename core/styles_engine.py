"""
Opus-Motion Styles & Prompts Engine
Unifies 59+ cinematic styles from lemo-opuscar and 703 viral video prompts from awesome-opus5-5-videos.
"""
from __future__ import annotations
import json
import os
import re
from typing import Dict, List, Optional, Any

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")

class StylesEngine:
    def __init__(self):
        self.styles_path = os.path.join(DATA_DIR, "styles.json")
        self.prompts_path = os.path.join(DATA_DIR, "prompts.json")
        self.presets_path = os.path.join(DATA_DIR, "presets.json")
        self.opuscar98_path = os.path.join(DATA_DIR, "opuscar98_styles.json")
        
        self.styles: List[Dict[str, Any]] = []
        self.clawd_styles: List[Dict[str, Any]] = []
        self.clawd_chapters: List[Dict[str, Any]] = []
        self.all_styles: List[Dict[str, Any]] = []
        self.prompts: List[Dict[str, Any]] = []
        self.presets: Dict[str, Any] = {}
        
        self.load_data()

    def load_data(self):
        if os.path.exists(self.styles_path):
            with open(self.styles_path, "r", encoding="utf-8") as f:
                self.styles = json.load(f)
                for s in self.styles:
                    slug = s.get("slug", "")
                    if not s.get("video_url"):
                        s["video_url"] = f"https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/{slug}.mp4"
                    if not s.get("frame_url"):
                        s["frame_url"] = f"frames/{slug}.jpg"
                    if not s.get("poster_url"):
                        s["poster_url"] = f"frames/{slug}.jpg"
                    if "dur" in s and s["dur"]:
                        d = float(s["dur"])
                        mins = int(d // 60)
                        secs = int(d % 60)
                        s["duration_formatted"] = f"{mins}:{secs:02d}"
                    else:
                        s["duration_formatted"] = "0:45"
                    s["is_clawd"] = False

        if os.path.exists(self.opuscar98_path):
            try:
                with open(self.opuscar98_path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    self.clawd_chapters = data.get("chapters", [])
                    chapter_map = {c["id"]: c.get("en", c["id"]) for c in self.clawd_chapters}
                    chapter_map_zh = {c["id"]: c.get("zh", c["id"]) for c in self.clawd_chapters}
                    
                    films = data.get("films", [])
                    self.clawd_styles = []
                    for film in films:
                        c_id = film.get("chapter", "C1")
                        c_en = chapter_map.get(c_id, "Silents & Talkies")
                        c_zh = chapter_map_zh.get(c_id, "默片与有声")
                        clean_title = re.sub(r"[^a-zA-Z0-9]+", "-", film.get("title", "").lower()).strip("-")
                        num = int(film.get("no", 1))
                        num_str = f"{num:02d}"
                        slug = f"clawd-{num_str}-{clean_title}"
                        dur = float(film.get("dur", 5.0))
                        mins = int(dur // 60)
                        secs = int(dur % 60)
                        
                        t0_val = float(film.get("t0", 0))
                        t1_val = t0_val + dur
                        style_obj = {
                            "slug": slug,
                            "en": f"{film.get('title', '')} ({film.get('year', '')}) · {film.get('style_en', '')}",
                            "cn": f"{film.get('zh', '')} · {film.get('style_zh', '')}",
                            "category_en": f"Clawd 98: {c_en}",
                            "category_cn": f"Clawd 98: {c_zh}",
                            "category_id": c_id,
                            "film": film.get("title", ""),
                            "year": film.get("year", ""),
                            "no": num,
                            "t0": t0_val,
                            "dur": dur,
                            "t1": t1_val,
                            "duration_formatted": f"{mins}:{secs:02d}",
                            "frame_url": f"frames/opuscar98/{num_str}.jpg",
                            "poster_url": f"frames/opuscar98/{num_str}.jpg",
                            "video_url": "https://github.com/lemomo-ai/lemo-opuscar/releases/download/films/opuscar98.mp4",
                            "embed_url": f"https://lemomo-ai.github.io/lemo-opuscar/opuscar98/#t={t0_val}",
                            "line": film.get("desc_en", ""),
                            "style_md": film.get("prompt_en", ""),
                            "prompt_en": film.get("prompt_en", ""),
                            "prompt_zh": film.get("prompt_zh", ""),
                            "shots": film.get("shots", []),
                            "direction_en": film.get("direction_en", ""),
                            "direction_zh": film.get("direction_zh", ""),
                            "blend": film.get("blend_en", []),
                            "dim": film.get("dim", "3D"),
                            "render": film.get("render", "3D"),
                            "is_clawd": True,
                            "uses": [film.get("title", ""), film.get("year", ""), "Clawd", c_en, film.get("style_en", "")]
                        }
                        self.clawd_styles.append(style_obj)
            except Exception as e:
                print(f"Error loading opuscar98_styles: {e}")

        # Combined pool of styles
        self.all_styles = list(self.styles) + list(self.clawd_styles)

        if os.path.exists(self.prompts_path):
            with open(self.prompts_path, "r", encoding="utf-8") as f:
                self.prompts = json.load(f)
        if os.path.exists(self.presets_path):
            with open(self.presets_path, "r", encoding="utf-8") as f:
                self.presets = json.load(f)

    def get_all_styles(self) -> List[Dict[str, Any]]:
        return self.all_styles

    def get_base_styles(self) -> List[Dict[str, Any]]:
        return self.styles

    def get_clawd_styles(self) -> List[Dict[str, Any]]:
        return self.clawd_styles

    def get_clawd_chapters(self) -> List[Dict[str, Any]]:
        return self.clawd_chapters

    def find_style(self, query_or_slug: str) -> Optional[Dict[str, Any]]:
        q = query_or_slug.strip().lower()
        for s in self.all_styles:
            if s.get("slug", "").lower() == q or s.get("folder", "").lower() == q:
                return s
            if s.get("en", "").lower() == q or s.get("cn", "").lower() == q:
                return s
        # Fuzzy match
        for s in self.all_styles:
            if q in s.get("en", "").lower() or q in s.get("slug", "").lower() or q in s.get("film", "").lower():
                return s
        return None

    def search_styles(self, query: str = "", category: str = "", tech: str = "") -> List[Dict[str, Any]]:
        results = self.all_styles
        if category:
            cat_lower = category.lower()
            if cat_lower == "clawd" or cat_lower == "clawd-98":
                results = [s for s in results if s.get("is_clawd")]
            else:
                results = [s for s in results if cat_lower in s.get("category_en", "").lower() or cat_lower in s.get("category_cn", "").lower()]
        if query:
            q = query.lower()
            results = [
                s for s in results
                if q in s.get("en", "").lower()
                or q in s.get("slug", "").lower()
                or q in s.get("line", "").lower()
                or q in s.get("category_en", "").lower()
                or q in s.get("film", "").lower()
                or any(q in u.lower() for u in s.get("uses", []))
            ]
        return results

    def search_prompts(self, query: str = "", category: str = "", tech: str = "", limit: int = 50) -> List[Dict[str, Any]]:
        results = self.prompts
        if category:
            cat_lower = category.lower()
            results = [p for p in results if p.get("category", "").lower() == cat_lower]
        if tech:
            t_lower = tech.lower()
            results = [p for p in results if t_lower in [t.lower() for t in p.get("tech_tags", [])]]
        if query:
            q = query.lower()
            results = [
                p for p in results
                if q in p.get("slug", "").lower()
                or q in p.get("author", "").lower()
                or q in p.get("prompt", "").lower()
                or any(q in t.lower() for t in p.get("tech_tags", []))
            ]
        return results[:limit]

    def generate_director_prompt(
        self,
        style_slug: str,
        story_topic: str,
        character: str = "Clawd",
        duration_sec: int = 15,
        target_model: str = "claude-opus-5.5",
        aspect_ratio: str = "16:9",
        include_voiceover: bool = True
    ) -> Dict[str, Any]:
        """
        Builds a comprehensive, high-tier code-animation director prompt.
        """
        style = self.find_style(style_slug) or (self.styles[0] if self.styles else {})
        style_name = style.get("en", "Cinematic Motion")
        style_film = style.get("film", "Untitled")
        style_line = style.get("line", "")
        style_rules = style.get("style_md", "")

        # Extract guidance from style_rules if present
        guidance_excerpt = ""
        if style_rules:
            # Grab up to first 800 chars of style markdown
            clean_md = re.sub(r"#+.*", "", style_rules).strip()
            guidance_excerpt = clean_md[:600].replace("\n\n", "\n")

        fps = 24
        total_frames = duration_sec * fps

        prompt = f"""<director_brief>
Style: {style_name} (Reference: "{style_film}")
Topic / Narrative: {story_topic}
Protagonist / Subject: {character}
Target Specs: {duration_sec}s runtime, {fps}fps ({total_frames} frames), Aspect Ratio: {aspect_ratio}
Target Engine: HTML5 Canvas, p5.js/p5.brush, SVG/GSAP or Three.js
Target AI Model: {target_model}
</director_brief>

<visual_direction>
Style Aesthetic:
{style_line}

Aesthetic Guidance:
{guidance_excerpt if guidance_excerpt else "Handmade tactile texture, distinct silhouette lighting, boiling linework, zero static pauses."}

Core Filmmaking Rules:
1. Every frame, every cut, and every transition must be driven programmatically through time t (seek(t)). No asynchronous race conditions or unmetered timers.
2. Character Acting: Root in physical weight, anticipatory squash-and-stretch, eye direction leading body turns, and emotional expression shifts on beat drops.
3. Camera & Composition: Dynamic framing—wides for environmental stakes, dramatic profile zooms for contemplation, snappy match cuts on impact.
4. Transitions: Organic brush wipes, halftone dissolves, or motion vector smearing. No hard generic cuts without narrative justification.
</visual_direction>

<audio_and_dubbing>
Voiceover Track: {"Include synced narrator/character voice lines with exact timestamp markers [t=0.0s..{:.1f}s]".format(duration_sec) if include_voiceover else "Silent / Diegetic sound effects only"}
Pacing & Beats: 120 BPM tempo grid. Align major keyframe events and shot changes on downbeats.
</audio_and_dubbing>

<deliverables>
1. Storyboard shot breakdown with timestamped cues and camera angles.
2. Complete, standalone executable HTML/JS file containing all drawing code, shaders, and timeline logic.
3. Audio dialogue script with emotion tags and timestamps for voice cloning dub sync.
</deliverables>"""

        return {
            "style": style,
            "topic": story_topic,
            "character": character,
            "duration_sec": duration_sec,
            "prompt": prompt,
            "fps": fps,
            "total_frames": total_frames
        }
