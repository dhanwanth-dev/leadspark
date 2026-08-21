# LeadSpark Voice Call → n8n (test on your phone today)

**Product:** LeadSpark  
Record a mock broker call on your phone → n8n → Gemini (Tamil OK) → Google Sheet.

---

## Files

| File | Purpose |
|---|---|
| `leadspark-voice-call.json` | Import this workflow into n8n |
| `voice-recorder.html` | Open on your phone — records & POSTs to n8n |
| `voice-calls-sheet-template.csv` | Headers for Google Sheet tab |

---

## Step 1 — Google Sheet

1. Open your existing Leads spreadsheet (or create new).
2. Add a new tab named exactly: **`CallLeads`**
3. Row 1 headers (from CSV):

```
created_at | duration_sec | language_detected | transcript | summary | name | phone | budget_min | budget_max | locality | timeline | purpose | bhk | lead_score | notes | source
```

4. Copy **Sheet ID** from URL.

---

## Step 2 — Import workflow

1. n8n → **Workflows** → **Import from file** → `leadspark-voice-call.json`
2. Open **Save to Sheet**:
   - Credential: your Google Sheets OAuth (same as WhatsApp flow)
   - Document ID = your Sheet ID
   - Sheet = **CallLeads**
3. Open **Call Gemini**:
   - Credential: **Header Auth**
   - Header name: `x-goog-api-key`
   - Header value: your Gemini API key
4. **Save → Publish / Activate**

---

## Step 3 — Copy webhook URL

1. Click node **Voice Webhook**
2. Copy **Production URL**  
   Example: `https://your-instance.app.n8n.cloud/webhook/leadspark-voice`

---

## Step 4 — Test on your phone (2 minutes)

### Option A — HTML recorder (recommended)

1. Host `voice-recorder.html` somewhere your phone can open:
   - Upload to GitHub Pages / Netlify / Vercel static, **or**
   - On laptop: `cd n8n && python -m http.server 8080` then phone on same Wi‑Fi: `http://YOUR_LAPTOP_IP:8080/voice-recorder.html`
2. Paste **Production webhook URL** in the page.
3. Tap **Record call** → talk 30–90 sec (Tamil/Tanglish mock buyer call).
4. Tap **Stop & send to n8n**.
5. Check **CallLeads** tab in Google Sheet.

### Option B — curl from laptop (no mic on phone)

```bash
# Record a short webm on phone, transfer to laptop, then:
base64 -w0 your-recording.webm > /tmp/audio.b64
curl -X POST 'YOUR_PRODUCTION_WEBHOOK_URL' \
  -H 'Content-Type: application/json' \
  -d "{\"audioBase64\":\"$(cat /tmp/audio.b64)\",\"mimeType\":\"audio/webm\",\"duration_sec\":45,\"source\":\"curl-test\"}"
```

---

## What success looks like

| Check | Pass |
|---|---|
| n8n Executions | Green run after Stop |
| CallLeads sheet | New row with transcript + summary |
| Phone screen | Summary + transcript shown after send |

---

## Flow

```
Phone (voice-recorder.html)
  → POST JSON { audioBase64, mimeType, duration_sec }
  → n8n Voice Webhook
  → Gemini (transcribe + summarize + extract)
  → Google Sheet CallLeads
  → JSON response back to phone
```

---

## Free stack

| Tool | Cost |
|---|---|
| n8n Cloud trial | Free tier |
| Gemini API | Free tier (AI Studio key) |
| Google Sheets | Free |
| voice-recorder.html | Free (static file) |

---

## Not real-time streaming (yet)

This records **then** sends (batch). Good enough to demo to brokers today.  
Real-time chunk transcription = phase 2.

---

## Next (after this works)

1. WhatsApp reminder to broker with summary + follow-up link  
2. Auto-trigger from Google Drive when broker uploads call recording  
3. Exotel / dialer integration for live calls
