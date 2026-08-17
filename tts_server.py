import base64
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

import requests


ROOT = Path(__file__).resolve().parent
BASE_URL = os.getenv("MIMO_BASE_URL", "https://api.xiaomimimo.com/v1").rstrip("/")
API_KEY = os.getenv("MIMO_API_KEY", "")
MODEL = os.getenv("MIMO_TTS_MODEL", "mimo-v2.5-tts")
DEFAULT_VOICE = os.getenv("MIMO_TTS_VOICE", "冰糖")
DEFAULT_STYLE = os.getenv(
    "MIMO_TTS_STYLE",
    "请用专业、自然、可信赖的企业介绍口吻，普通话，语速适中，停顿清晰，不要过度播音腔。",
)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self.path == "/api/health":
            self.send_json(200, {"ok": True, "apiKeyConfigured": bool(API_KEY), "model": MODEL})
            return
        super().do_GET()

    def do_POST(self):
        if self.path != "/api/tts":
            self.send_error(404, "Not Found")
            return
        if not API_KEY:
            self.send_json(500, {"error": "本地服务未检测到 MIMO_API_KEY 环境变量"})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            payload = json.loads(self.rfile.read(length) or b"{}")
            mode = str(payload.get("mode", "preset")).strip().lower()
            text = str(payload.get("text", "")).strip()
            style = str(payload.get("style", "")).strip() or DEFAULT_STYLE
            if not text:
                self.send_json(400, {"error": "缺少待合成的解说文案"})
                return
            if len(text) > 8000:
                self.send_json(400, {"error": "单页解说文案过长，请控制在 8000 字以内"})
                return
            if mode not in {"preset", "design", "clone"}:
                self.send_json(400, {"error": "不支持的音色模式，请使用 preset、design 或 clone"})
                return
        except (ValueError, json.JSONDecodeError) as error:
            self.send_json(400, {"error": f"请求格式错误：{error}"})
            return

        if mode == "preset":
            model = "mimo-v2.5-tts"
            voice = str(payload.get("voice", "")).strip() or DEFAULT_VOICE
            request_body = {
                "model": model,
                "messages": [
                    {"role": "user", "content": style},
                    {"role": "assistant", "content": text},
                ],
                "audio": {"format": "wav", "voice": voice},
            }
        elif mode == "design":
            model = "mimo-v2.5-tts-voicedesign"
            voice_design = str(payload.get("voiceDesign", "")).strip()
            if not voice_design:
                self.send_json(400, {"error": "音色设计模式需要填写音色描述"})
                return
            user_content = voice_design
            if style:
                user_content += f"\n\n请以以下表达风格朗读：{style}"
            request_body = {
                "model": model,
                "messages": [
                    {"role": "user", "content": user_content},
                    {"role": "assistant", "content": text},
                ],
                "audio": {"format": "wav", "optimize_text_preview": True},
            }
        else:
            model = "mimo-v2.5-tts-voiceclone"
            clone_audio = str(payload.get("cloneAudio", "")).strip()
            if not clone_audio.startswith("data:audio/") or "," not in clone_audio:
                self.send_json(400, {"error": "音色克隆模式需要上传 MP3 或 WAV 参考音频"})
                return
            encoded_sample = clone_audio.split(",", 1)[1]
            if len(encoded_sample) > 10 * 1024 * 1024:
                self.send_json(400, {"error": "参考音频的 Base64 内容不能超过 10 MB"})
                return
            try:
                base64.b64decode(encoded_sample, validate=True)
            except (ValueError, base64.binascii.Error):
                self.send_json(400, {"error": "参考音频内容不是有效的 Base64 数据"})
                return
            request_body = {
                "model": model,
                "messages": [
                    {"role": "user", "content": style},
                    {"role": "assistant", "content": text},
                ],
                "audio": {"format": "wav", "voice": clone_audio},
            }
        try:
            response = requests.post(
                f"{BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {API_KEY}",
                    "Content-Type": "application/json",
                },
                json=request_body,
                timeout=180,
            )
            if not response.ok:
                self.send_json(502, {"error": f"MiMo 返回错误（{response.status_code}）：{response.text[:500]}"})
                return
            response_body = response.json()
            encoded_audio = response_body["choices"][0]["message"]["audio"]["data"]
            audio = base64.b64decode(encoded_audio)
        except (requests.RequestException, KeyError, IndexError, ValueError, base64.binascii.Error) as error:
            self.send_json(502, {"error": f"调用 MiMo 失败：{error}"})
            return

        self.send_response(200)
        self.send_header("Content-Type", "audio/wav")
        self.send_header("Content-Length", str(len(audio)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(audio)

    def send_json(self, status, value):
        data = json.dumps(value, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


if __name__ == "__main__":
    port = int(os.getenv("QIYUE_LOCAL_PORT", "8000"))
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"秋叶项目本地服务已启动：http://localhost:{port}")
    print("打开组合播放后，可在“方案与音频”中保存方案并生成本地音频。")
    server.serve_forever()
