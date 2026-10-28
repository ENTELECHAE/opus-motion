"""
Opus-Motion Proxy Engine
Adapted from CLIProxyAPI
Provides multi-model LLM routing, token tracking, and local proxy gateway
for Entelechae-code, Claude Opus 5.5, Gemini, OpenAI, Kimi, and Grok.
"""
from __future__ import annotations
import json
import os
import urllib.request
import urllib.error
from typing import Dict, List, Optional, Any

class ProxyEngine:
    def __init__(
        self,
        proxy_url: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        self.proxy_url = (proxy_url or os.environ.get("BASE_URL", "http://127.0.0.1:31415")).rstrip("/")
        self.api_key = api_key or os.environ.get("LLM_API_KEY", "freellmapi-9e2333b2964142afc0a804b6e5aad81a47ec323949a90e96")
        self.models = [
            {"id": "Entelechae-code", "provider": "Entelechae", "name": "Entelechae-code", "role": "Primary Voice Cloner & Script Director"},
            {"id": "claude-opus-5.5", "provider": "Anthropic", "name": "Claude Opus 5.5", "role": "Cinematic Director & Complex Code"},
            {"id": "gemini-3.8-flash", "provider": "Google", "name": "Gemini 3.8 Flash", "role": "Rapid Agent Loops & Realtime Reasoning"},
            {"id": "gemini-3.1-pro", "provider": "Google", "name": "Gemini 3.1 Pro", "role": "Multimodal Asset Breakdown & Timing"},
            {"id": "gpt-5.6", "provider": "OpenAI", "name": "GPT-5.6", "role": "Design Hierarchy & UI Code Generation"},
            {"id": "kimi-k3", "provider": "Moonshot", "name": "Kimi K3", "role": "Long-Horizon Script Planning (1M Context)"},
            {"id": "grok-4.5", "provider": "xAI", "name": "Grok 4.5", "role": "Fast Motion Graphic Prototyping"}
        ]

    def list_models(self) -> List[Dict[str, Any]]:
        return self.models

    def check_proxy_health(self) -> Dict[str, Any]:
        """
        Pings FreeLLMAPI / CLIProxyAPI instance if running.
        """
        headers = {"User-Agent": "Opus-Motion"}
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        # Try /v1/models first (OpenAI compatible standard)
        for check_path in ["/v1/models", "/health"]:
            url = f"{self.proxy_url}{check_path}"
            try:
                req = urllib.request.Request(url, headers=headers)
                with urllib.request.urlopen(req, timeout=2.0) as resp:
                    port = 31415 if "31415" in self.proxy_url else 8317
                    return {
                        "status": "online",
                        "port": port,
                        "proxy_url": self.proxy_url,
                        "active_model": "Entelechae-code",
                        "has_api_key": bool(self.api_key),
                        "http_code": resp.status
                    }
            except Exception:
                continue

        return {
            "status": "offline_fallback",
            "message": f"Proxy daemon at {self.proxy_url} not reachable. Running in standalone mode.",
            "proxy_url": self.proxy_url
        }

    def route_prompt(
        self,
        prompt: str,
        model_id: str = "Entelechae-code",
        temperature: float = 0.7,
        max_tokens: int = 4096
    ) -> Dict[str, Any]:
        """
        Dispatches prompt to OpenAI-compatible LLM Gateway with API key and auto-fallback.
        """
        headers = {
            "Content-Type": "application/json",
            "User-Agent": "Opus-Motion"
        }
        if self.api_key:
            headers["Authorization"] = f"Bearer {self.api_key}"

        target_models = [model_id]
        if model_id != "auto":
            target_models.append("auto")

        for cand_model in target_models:
            payload: Dict[str, Any] = {
                "messages": [{"role": "user", "content": prompt}],
                "temperature": temperature,
                "max_tokens": max_tokens
            }
            if cand_model:
                payload["model"] = cand_model

            try:
                data = json.dumps(payload).encode("utf-8")
                req = urllib.request.Request(
                    f"{self.proxy_url}/v1/chat/completions",
                    data=data,
                    headers=headers
                )
                with urllib.request.urlopen(req, timeout=30) as resp:
                    res_json = json.loads(resp.read().decode("utf-8"))
                    choices = res_json.get("choices", [])
                    content = ""
                    if choices:
                        content = choices[0].get("message", {}).get("content", "")
                    return {
                        "success": True,
                        "routed_via": "FreeLLMAPI-Gateway",
                        "model": cand_model,
                        "response": res_json,
                        "content": content
                    }
            except urllib.error.HTTPError as e:
                # If specific model is not found, continue loop to fallback
                if e.code in (400, 404):
                    continue
                return {"success": False, "error": f"HTTP {e.code}: {e.read().decode()[:200]}"}
            except Exception as e:
                pass

        # Return formatted agent handoff payload if proxy offline
        return {
            "success": True,
            "routed_via": "opus-motion-agent-handoff",
            "model": model_id,
            "prompt_length": len(prompt),
            "estimated_input_tokens": len(prompt) // 4,
            "status": "ready_for_execution"
        }
