# LeadSpark — End-to-End Automations

**Product:** LeadSpark  
One custom instance per real-estate client. Automations live in `n8n/`; the Next.js app is the optional demo UI and agent dashboard.

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Buyer WhatsApp │────▶│  n8n (qualify)   │────▶│  Google Sheets  │
│  or Voice HTML  │     │  + Gemini        │     │  (mini CRM)     │
└─────────────────┘     └────────┬─────────┘     └─────────────────┘
                                 │
                                 ▼ (score = hot)
                        ┌──────────────────┐
                        │  Gmail / Resend  │
                        │  Agent alert     │
                        └──────────────────┘
```

| Path | Trigger | Output |
|------|---------|--------|
| **A. WhatsApp qualify** | Meta WhatsApp Cloud API message | Scored lead in Sheets + WhatsApp reply + hot email |
| **B. Voice call** | `voice-recorder.html` POST | Transcript, summary, extracted fields in `CallLeads` |
| **C. Demo chat UI** | `/chat/[propertyId]` or `/demo` | Lead in dashboard (Supabase or memory) + hot email via Resend |

---

## Automation A — WhatsApp qualification (primary)

**Import:** `n8n/leadspark-whatsapp-qualify.json`  
**Alt (HTTP webhook):** `n8n/leadspark-whatsapp-qualify-webhook.json`  
**Setup:** [`n8n/SETUP.md`](../n8n/SETUP.md)

### Flow (happy path)

1. Buyer messages Meta test / Business number  
2. **WhatsApp Trigger** receives `messages` only (ignore delivery ticks)  
3. **Extract inbound** → `phone`, `text`, `wa_name`  
4. **Client config** → agent name, company, listing price/locality  
5. **Get lead row** (Sheets) by phone — continue transcript if returning buyer  
6. **Gemini** asks for missing fields: name → phone confirm → budget → locality → timeline → purpose → BHK  
7. **Score:** hot / warm / cold  
8. **Send WhatsApp** reply  
9. **Upsert** Sheets row (`transcript`, `lead_score`, `updated_at`)  
10. If newly **hot** → **Gmail** to agent with WhatsApp handoff context  

### Scoring rules

| Score | When |
|-------|------|
| **Hot** | Phone present + budget fits listing (~80%) + timeline soon (week / month / immediate) |
| **Warm** | Has phone or budget or name |
| **Cold** | Browsing / incomplete |

Email fires **once** when score becomes hot (`notified` flag).

### Sheet headers (`Leads`)

See `n8n/leads-sheet-template.csv`.

---

## Automation B — Voice call → structured lead

**Import:** `n8n/leadspark-voice-call.json`  
**Local Whisper variant:** `n8n/leadspark-voice-local-whisper.json`  
**Setup:** [`n8n/VOICE-SETUP.md`](../n8n/VOICE-SETUP.md)

### Flow

1. Open `n8n/voice-recorder.html` on phone  
2. Paste n8n **Production** webhook URL  
3. Record 30–90s mock buyer call (Tamil / Tanglish OK)  
4. POST `{ audioBase64, mimeType, duration_sec }`  
5. Gemini (or local Whisper) → transcript + summary + fields  
6. Append row to Google Sheet tab **`CallLeads`**  
7. JSON response shown on phone  

### Sheet headers (`CallLeads`)

See `n8n/voice-calls-sheet-template.csv`.

---

## Automation C — Web chat demo (Next.js)

| Step | Route / module |
|------|----------------|
| Chat UI | `/demo`, `/chat/[propertyId]` |
| AI + qualify | `POST /api/chat` → Gemini (`src/lib/gemini.ts`) |
| Score | `src/lib/scoring.ts` |
| Persist | Supabase (`supabase/schema.sql`) or in-memory |
| Dashboard | `/dashboard` (password auth) |
| Hot email | Resend (`src/lib/email.ts`) |

Use this for sales pitches when WhatsApp Cloud API is not yet live.

---

## Client launch (one instance)

1. Copy workflow (or redeploy Next app)  
2. New Google Sheet per client — never share Sheets across clients  
3. Update **Client config** node (name, company, listing)  
4. Credentials: Gemini, Sheets, Gmail/WhatsApp (or Resend)  
5. Meta: client Business number after verification (not personal WhatsApp)  
6. Smoke-test: message → sheet row → hot email  

Checklist: see root [README.md](../README.md).

---

## Demo video

Watch the recorded walkthrough of Automation A:

**[docs/media/leadspark-demo.mp4](media/leadspark-demo.mp4)**

Interactive HTML walkthrough: [`docs/demo/n8n-automation-demo.html`](demo/n8n-automation-demo.html)

---

## Out of scope (intentionally)

- Portal scraping (99acres / Housing)  
- Unofficial WhatsApp Web / QR connectors  
- Multi-tenant SaaS (one client = one Sheet + one workflow copy)  
- Real-time voice streaming (batch record → process for now)  

Build those only after WhatsApp qualify works on a real phone.
