# MindSpace

An anonymous mental-health support community: a public feed, a login-gated
"Private Sector," a MindBot AI chat companion, a guided breathing exercise,
and a feedback form — all backed by the FastAPI app you already had.

## What's new in this pass

- **Full frontend** in `static/` (`index.html`, `css/style.css`, `js/app.js`) —
  no framework, no build step, just drop it behind the FastAPI app.
- **Fixed a leaked secret.** `sarvam_client.py` had a live Sarvam API key
  hardcoded in it. It now reads `SARVAM_API_KEY` from the environment instead.
  **Rotate that old key in your Sarvam dashboard** — treat it as compromised
  since it was in a file you shared.
- Small robustness fixes: the Sarvam call now has a timeout and won't crash
  the request if the API is unreachable or the key is missing.

## Run it

```bash
python -m venv .venv
source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -r requirements.txt

cp .env.example .env
# edit .env and paste your (rotated) Sarvam key into SARVAM_API_KEY

uvicorn app:app --reload
```

Then open **http://127.0.0.1:8000**.

The SQLite file (`mindspace.db`) is created automatically on first run with
a handful of seed posts, matching the schema already in `app.py`.

## How the frontend maps to your API

| UI | Endpoint |
|---|---|
| Community feed | `GET /api/posts/public` |
| Share (public) | `POST /api/posts/public` |
| Private Sector feed | `GET /api/posts/private` (Bearer token) |
| Share (private) | `POST /api/posts/private` (Bearer token) |
| Log in / create alias | `POST /api/auth/login` / `POST /api/auth/register` |
| Hug / Feel reactions | `POST /api/posts/{id}/react?reaction=hug|feel` |
| MindBot chat | `POST /api/chat/mindbot` |
| Feedback form | `POST /api/feedback` |

The login token from `/api/auth/*` (`token_<alias>`) is stored in
`localStorage` and sent back as `Authorization: Bearer token_<alias>` — this
matches the check already in `app.py`. It's a simple scheme (not real
session security) — fine for a prototype, but if this goes to real users,
swap it for signed JWTs or server-side sessions before launch.

## Worth knowing about `moderation.py`

The crisis-detection and profanity filters are pattern/word-list based, which
is good for a first pass but has two known rough edges you may want to
revisit later:

1. **Substring matching** on words longer than 3 characters can false-positive
   on innocent words that contain a blocked substring (the classic
   "Scunthorpe problem").
2. It's a static list — no ML-based sentiment or intent model. For a
   production mental-health product, consider pairing this with a more
   robust safety classifier, since crisis detection quality is genuinely
   safety-critical here.

The frontend surfaces `resources.contacts` and `immediate_tips` from a
`crisis_detected` response in a dedicated modal, both from post composing and
from MindBot chat, so those improvements would flow straight through to
the UI with no frontend changes needed.

## Design notes

The visual identity is a "twilight before rest" palette — deep indigo dusk,
lavender light, warm coral — built around a single signature motif: a
pulsing "breathing orb" that shows up as the hero centerpiece, the MindBot
avatar, and the literal guided-breathing exercise. Typefaces are Fraunces
(display) and Plus Jakarta Sans (body/UI), loaded from Google Fonts.
