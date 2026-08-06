import type { AgentConfig } from "./types";

/**
 * Single-client config for the 48h close version.
 * For each new client: copy the project (or redeploy) and change these env vars.
 * No multi-tenant complexity — one LeadSpark instance per agent.
 */
export function getAgentConfig(): AgentConfig {
  return {
    name: process.env.AGENT_NAME || "Rahul Sharma",
    email: process.env.AGENT_EMAIL || "agent@example.com",
    phone: process.env.AGENT_PHONE || "+919876543210",
    whatsapp: (process.env.AGENT_WHATSAPP || "919876543210").replace(/\D/g, ""),
    company: process.env.AGENT_COMPANY || "Sharma Properties",
  };
}

export function getAppUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export function isResendConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY);
}

export function getDashboardPassword(): string {
  return process.env.DASHBOARD_PASSWORD || "leadspark-demo";
}

export function formatINR(amount: number): string {
  if (amount >= 10_000_000) {
    const cr = amount / 10_000_000;
    return `₹${cr % 1 === 0 ? cr.toFixed(0) : cr.toFixed(2)} Cr`;
  }
  if (amount >= 100_000) {
    const lakh = amount / 100_000;
    return `₹${lakh % 1 === 0 ? lakh.toFixed(0) : lakh.toFixed(1)} Lakh`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}
