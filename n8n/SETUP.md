# LeadSpark WhatsApp qualification (n8n)

**Product:** LeadSpark  
**This week we build one thing only:** inbound WhatsApp enquiry → qualifying questions → scored lead → hot alert.

Do not add portal scraping, follow-up sequences, or a dashboard until this path works on a real phone.

---

## What this automates (and what it does not)

Indian agents lose deals because portal / Instagram / WhatsApp enquiries sit unanswered while they are on site visits. Research and market practice: first useful reply in minutes wins; hours later the buyer has already spoken to 4–12 other brokers.

| We automate now | Human still does |
|---|---|
| Instant WhatsApp reply (24/7) | Site visit |
| Ask name, budget, locality, timeline, purpose, BHK | Negotiation |
| Score hot / warm / cold | Token, loan, registration |
| Log to Google Sheet | Listing on 99acres / Housing |
| Email agent only when **hot** | Closing |

This is **not** a replacement for 99acres. It is the layer *after* the enquiry arrives on WhatsApp.

---

## Stack (cheap / free to start)

| Tool | Role | Cost to start |
|---|---|---|
| **n8n** | The agent brain (workflow) | Cloud trial, or self-host free |
| **Meta WhatsApp Cloud API** | Official send/receive | Test number: free (max 5 numbers). Live: replies to inbound chats are cheap/free in the service window |
| **Google Gemini** | Qualification + natural replies | Free tier: [AI Studio](https://aistudio.google.com/apikey) |
| **Google Sheets** | Mini CRM the agent can open | Free |
| **Gmail** | Hot-lead email | Free |

**Do not** use unofficial WhatsApp Web / QR “connect your personal number” tools for a client. They violate WhatsApp rules and can ban the agent’s number. For production, only Cloud API.

---

## Accounts to create (30–40 min)

1. [n8n Cloud](https://app.n8n.cloud) — sign up (easiest). Self-host later if you want.
2. [Google AI Studio](https://aistudio.google.com/apikey) — create `GEMINI_API_KEY`.
3. Google account — create a Sheet from `n8n/leads-sheet-template.csv`.
4. [Meta for Developers](https://developers.facebook.com/apps/) — create an app → add product **WhatsApp** → **API Setup**.
5. On WhatsApp API Setup:
   - Copy **Phone number ID**, **WhatsApp Business Account ID**, temporary **Access token**.
   - Add **your** mobile as a test recipient (Meta allows ~5).
   - You will chat **to Meta’s test number**, not the agent’s personal WhatsApp, until go-live.

---

## Google Sheet

1. Create a spreadsheet named `LeadSpark Leads`.
2. First tab name: `Leads`.
3. Row 1 headers exactly:

```
phone | wa_name | name | budget_min | budget_max | locality | timeline | purpose | bhk | lead_score | notes | transcript | notified | status | updated_at | last_message
```

4. Share the sheet with the Google account you connect in n8n (Editor).
5. Copy the Sheet ID from the URL: `https://docs.google.com/spreadsheets/d/THIS_IS_THE_ID/edit`

---

## Import the workflow

1. In n8n: **Workflows → Import from File** → `n8n/leadspark-whatsapp-qualify.json`
2. Open the pink **Client config** node. Change:
   - `agent_name`, `agent_company`, `agent_email`
   - property title / locality / city / BHK / price
3. Create credentials (n8n left sidebar → Credentials):

| Credential | Used by | Values |
|---|---|---|
| WhatsApp OAuth | WhatsApp Trigger | Meta App ID + App Secret (App settings → Basic) |
| WhatsApp API | Send WhatsApp Reply | Access token + WhatsApp Business Account ID |
| Gemini Header Auth | Call Gemini | Header name `x-goog-api-key`, value = your Gemini key |
| Google Sheets OAuth | Sheet nodes | Sign in with Google |
| Gmail OAuth | Hot lead email | Sign in with the inbox that should *send* (or agent Gmail) |

4. In **Send WhatsApp Reply**, paste the **Phone number ID** from Meta API Setup.
5. In both Google Sheets nodes, paste your **Sheet ID** and confirm tab `Leads`.
6. In **Hot lead email**, set **To** = the agent’s Gmail (same as `agent_email`).

---

## Connect Meta webhook (the part that usually fails)

WhatsApp will only talk to n8n if this handshake works.

1. In n8n, **turn the workflow ON** (Active). Inactive workflows cannot verify.
2. Open **WhatsApp Trigger** → copy **Production URL** (not Test URL).
3. Meta app → **WhatsApp → Configuration → Webhook**:
   - Callback URL = that Production URL
   - Verify token = any string you choose (e.g. `leadspark-verify`) — n8n’s WhatsApp Trigger accepts Meta’s handshake; workflow must be Active
   - Subscribe to field: **messages**
4. Click **Verify and save**.

If verify fails:

- Workflow is not Active
- You pasted the Test URL instead of Production
- n8n URL is not HTTPS / not public (self-host must set `WEBHOOK_URL`)

On the Trigger node, add option **Receive Message Status Updates** and **clear it** (empty). Otherwise every “delivered/read” tick re-runs the bot.

Meta allows **one webhook per app**. Do not also point the same app at another tool.

---

## Conversation memory fix (required for follow-ups)

In **Get lead row**, the phone filter must be:

```
{{ $('Extract inbound').first().json.phone }}
```

Not `{{ $json.phone }}` — that resolves to `undefined` after Client config and breaks lead lookup / transcript recall.

Keep **Send WhatsApp HTTP** `to` hardcoded to your test buyer during sandbox testing; switch back to Extract inbound phone only after multi-turn works.

## Test (do this before any client demo)

From **your allowlisted phone**, WhatsApp the **Meta test number**:

1. Send `Hi` → bot greets and asks your name.  
2. `Ravi` → asks WhatsApp number / confirms.  
3. Budget `1.2 Cr` → asks timeline.  
4. `Within 1 month` → asks purpose.  
5. `Own stay` → should score **hot** (phone + budget fit + soon).  
6. Open the Google Sheet — one row, transcript filled, `lead_score=hot`.  
7. Agent Gmail should get **LeadSpark** hot-lead mail.

If Gemini key is missing, the workflow still replies with a simple scripted qualify path (see Code node fallback).

---

## What to show a real-estate prospect (10 minutes)

1. “You get enquiries on WhatsApp. Today they wait until you finish a site visit.”
2. Live: you message the number → instant qualify chat.
3. Open the Sheet on your laptop — their ‘lead’ is already scored.
4. Show the hot email.
5. Close: “We connect this to *your* WhatsApp Business number after advance. Same flow. We only change name, property, and API keys.”

---

## Go-live for a paying client (after advance)

Same workflow. Change:

1. Client config node (name, company, listing)
2. Gemini key (yours or theirs)
3. Sheet (new sheet per client — do not mix clients)
4. Gmail To = client
5. Meta: their **WhatsApp Business** number, not the test number  
   - They need Meta Business verification + display name  
   - This takes days; start it the day you take advance

Do **not** put two clients on one Sheet / one WhatsApp number.

---

## Honest limits

- **Test number** only talks to ~5 added phones. Prospects cannot message it unless added.
- You cannot legally auto-reply on the agent’s **personal** WhatsApp via Cloud API. Production needs a **Business API** number (can be a new number they dedicate to LeadSpark).
- 99acres/Housing leads do **not** auto-enter WhatsApp. Typical pattern: portal SMS/call → agent (or a later n8n flow) sends first WhatsApp, **or** the listing CTA is “Chat on WhatsApp”. Build that *after* this qualify bot works.
- Unofficial WhatsApp connectors (QR / Baileys) are faster to demo and dangerous to sell.

---

## Next (only after this works)

1. WhatsApp buttons (BHK / budget chips)  
2. Portal email → create WhatsApp conversation  
3. Follow-up sequence for warm leads  
4. Real dashboard (the Next.js app) reading the same Sheet/DB
