/**
 * Append voice call lead to Google Sheet via n8n webhook (simplest for testing)
 * or direct webhook URL from env.
 */
import type { VoiceProcessResult } from "./voice";

export async function appendVoiceLeadToSheet(
  result: VoiceProcessResult,
  meta?: { duration_sec?: number; source?: string }
): Promise<void> {
  const webhookUrl = process.env.N8N_VOICE_SHEET_WEBHOOK_URL;
  if (!webhookUrl) {
    console.info("[LeadSpark Voice] N8N_VOICE_SHEET_WEBHOOK_URL not set — skipping sheet", result);
    return;
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...result,
      duration_sec: meta?.duration_sec,
      source: meta?.source || "voice-test",
      created_at: new Date().toISOString(),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Sheet webhook failed: ${err}`);
  }
}
