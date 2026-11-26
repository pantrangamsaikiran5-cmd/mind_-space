import os
import requests

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    # python-dotenv is optional; if it's not installed, environment
    # variables must be set some other way (shell export, systemd, etc).
    pass

API_KEY = os.environ.get("SARVAM_API_KEY")


def generate_reply(message):
    if not API_KEY:
        return (
            "MindBot isn't fully configured yet — the site owner needs to set the "
            "SARVAM_API_KEY environment variable before MindBot can reply."
        )

    url = "https://api.sarvam.ai/v1/chat/completions"

    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }

    data = {
        "model": "sarvam-30b",
        "messages": [
            {
                "role": "system",
                "content": "You are MindBot, a kind and supportive AI mental health companion."
            },
            {
                "role": "user",
                "content": message
            }
        ]
    }

    try:
        response = requests.post(url, headers=headers, json=data, timeout=20)
    except requests.RequestException as exc:
        return f"MindBot couldn't reach its AI service right now ({exc})."

    if response.status_code != 200:
        return f"API Error: {response.text}"

    result = response.json()
    return result["choices"][0]["message"]["content"]
