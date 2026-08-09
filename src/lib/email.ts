import { Resend } from "resend";
import {
  formatINR,
  getAgentConfig,
  getAppUrl,
  isResendConfigured,
} from "./config";
import type { Lead, Property } from "./types";

export async function sendHotLeadEmail(lead: Lead, property: Property): Promise<boolean> {
  if (!isResendConfigured()) {
    console.info("[LeadSpark] RESEND_API_KEY missing — skipped hot-lead email", {
      leadId: lead.id,
      score: lead.lead_score,
    });
    return false;
  }

  const agent = getAgentConfig();
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from =
    process.env.RESEND_FROM || "LeadSpark <onboarding@resend.dev>";
  const waLink = lead.phone
    ? `https://wa.me/91${lead.phone.replace(/\D/g, "").slice(-10)}?text=${encodeURIComponent(
        `Hi ${lead.name || "there"}, thanks for your interest in ${property.title}. This is ${agent.name} from ${agent.company}.`
      )}`
    : null;

  const budget =
    lead.budget_min || lead.budget_max
      ? `${lead.budget_min ? formatINR(lead.budget_min) : "?"} – ${
          lead.budget_max ? formatINR(lead.budget_max) : "?"
        }`
      : "Not shared";

  const { error } = await resend.emails.send({
    from,
    to: agent.email,
    subject: `🔥 Hot lead: ${lead.name || "New visitor"} — ${property.locality}`,
    html: `
      <div style="font-family: system-ui, sans-serif; line-height: 1.5; color: #111">
        <p style="font-size: 12px; color: #666; margin: 0 0 12px">LeadSpark</p>
        <h2 style="margin: 0 0 8px">Hot lead on ${property.title}</h2>
        <p style="margin: 0 0 16px; color: #444">${property.locality}, ${property.city} · ${formatINR(property.price_amount)}</p>
        <table style="border-collapse: collapse; width: 100%; max-width: 480px">
          <tr><td style="padding: 6px 0; color: #666">Name</td><td style="padding: 6px 0"><strong>${lead.name || "—"}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #666">Phone</td><td style="padding: 6px 0"><strong>${lead.phone || "—"}</strong></td></tr>
          <tr><td style="padding: 6px 0; color: #666">Budget</td><td style="padding: 6px 0">${budget}</td></tr>
          <tr><td style="padding: 6px 0; color: #666">Timeline</td><td style="padding: 6px 0">${lead.timeline || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #666">Purpose</td><td style="padding: 6px 0">${lead.purpose}</td></tr>
          <tr><td style="padding: 6px 0; color: #666">BHK pref</td><td style="padding: 6px 0">${lead.bhk_preference || "—"}</td></tr>
          <tr><td style="padding: 6px 0; color: #666">Locality pref</td><td style="padding: 6px 0">${lead.locality_pref || "—"}</td></tr>
        </table>
        ${
          waLink
            ? `<p style="margin: 20px 0"><a href="${waLink}" style="background:#25D366;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;display:inline-block">WhatsApp this lead</a></p>`
            : ""
        }
        <p style="margin: 16px 0 0; font-size: 13px; color: #666">
          Open dashboard: <a href="${getAppUrl()}/dashboard">${getAppUrl()}/dashboard</a>
        </p>
      </div>
    `,
  });

  if (error) {
    console.error("[LeadSpark] Resend error", error);
    return false;
  }
  return true;
}
