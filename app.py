import os
import json
import urllib.request
import urllib.error
from flask import Flask, render_template, request, jsonify, Response, stream_with_context
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key-change-in-prod")

ANTHROPIC_API_KEY = os.environ.get("ANTHROPIC_API_KEY", "")
API_URL = "https://api.anthropic.com/v1/messages"
MODEL = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """You are DΞBUG — an elite AI debugging assistant with deep expertise across all programming languages, frameworks, and paradigms.

Your role is to help developers identify, understand, and fix bugs with surgical precision. You are:
- Direct and precise: No filler, no fluff. Every word earns its place.
- Expert-level: You reason like a 20-year veteran engineer.
- Structured: You always organize your analysis clearly.

When analyzing code or errors, structure your response using these sections:

## 🔍 Root Cause
Explain exactly what is wrong and why.

## 💥 Error Breakdown
Break down the error message, stack trace, or problematic code line by line if needed.

## ✅ Fix
Provide the corrected code with clear inline comments explaining the changes.

## 🧠 Why This Happens
Brief explanation of the underlying concept so they won't hit this again.

## ⚡ Pro Tips (optional)
Any additional improvements, edge cases to watch, or best practices.

Always use proper markdown code blocks with language identifiers. Be concise but complete."""


def call_anthropic_stream(messages):
    if not ANTHROPIC_API_KEY:
        yield json.dumps({"error": "ANTHROPIC_API_KEY not set. Add it to your .env file."})
        return

    payload = json.dumps({
        "model": MODEL,
        "max_tokens": 4096,
        "stream": True,
        "system": SYSTEM_PROMPT,
        "messages": messages,
    }).encode("utf-8")

    req = urllib.request.Request(
        API_URL,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-api-key": ANTHROPIC_API_KEY,
            "anthropic-version": "2023-06-01",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(req) as response:
            for raw_line in response:
                line = raw_line.decode("utf-8").rstrip("\n")
                if not line.startswith("data:"):
                    continue
                data_str = line[len("data:"):].strip()
                if data_str == "[DONE]":
                    break
                try:
                    event = json.loads(data_str)
                    etype = event.get("type", "")
                    if etype == "content_block_delta":
                        delta = event.get("delta", {})
                        if delta.get("type") == "text_delta":
                            yield json.dumps({"text": delta.get("text", "")})
                    elif etype == "message_stop":
                        yield json.dumps({"done": True})
                        break
                    elif etype == "error":
                        msg = event.get("error", {}).get("message", "Unknown API error")
                        yield json.dumps({"error": msg})
                        return
                except json.JSONDecodeError:
                    continue
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8")
        try:
            err_data = json.loads(body)
            msg = err_data.get("error", {}).get("message", str(e))
        except Exception:
            msg = str(e)
        if e.code == 401:
            yield json.dumps({"error": "Invalid API key. Check your ANTHROPIC_API_KEY."})
        elif e.code == 429:
            yield json.dumps({"error": "Rate limit reached. Please wait and try again."})
        else:
            yield json.dumps({"error": f"API error {e.code}: {msg}"})
    except Exception as e:
        yield json.dumps({"error": f"Connection error: {str(e)}"})


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/debug", methods=["POST"])
def debug():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    user_message = data.get("message", "").strip()
    history = data.get("history", [])
    language = data.get("language", "")

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    messages = []
    for msg in history:
        if msg.get("role") in ("user", "assistant") and msg.get("content"):
            messages.append({"role": msg["role"], "content": msg["content"]})

    full_message = user_message
    if language:
        full_message = f"[Language/Framework: {language}]\n\n{user_message}"

    messages.append({"role": "user", "content": full_message})

    def generate():
        for chunk in call_anthropic_stream(messages):
            yield f"data: {chunk}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


@app.route("/api/health")
def health():
    return jsonify({"status": "ok", "model": MODEL, "api_key_set": bool(ANTHROPIC_API_KEY)})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get("FLASK_DEBUG", "false").lower() == "true"
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
