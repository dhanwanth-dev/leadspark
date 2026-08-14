import Link from "next/link";
import { redirect } from "next/navigation";
import { LeadList } from "@/components/dashboard/LeadList";
import { isDashboardAuthenticated } from "@/lib/auth";
import {
  formatINR,
  getAgentConfig,
  getAppUrl,
  isGeminiConfigured,
  isResendConfigured,
  isSupabaseConfigured,
} from "@/lib/config";
import { listLeads } from "@/lib/leads";
import { DEMO_PROPERTY, listProperties } from "@/lib/properties";
import { CopyLinkButton } from "@/components/dashboard/CopyLinkButton";
import { LogoutButton } from "@/components/dashboard/LogoutButton";

export default async function DashboardPage() {
  if (!isDashboardAuthenticated()) {
    redirect("/dashboard/login");
  }

  const agent = getAgentConfig();
  const [leads, properties] = await Promise.all([listLeads(), listProperties()]);
  const appUrl = getAppUrl();
  const sharePath = `/chat/${DEMO_PROPERTY.id}`;

  return (
    <div className="min-h-screen bg-[#f6f7f4] text-[#0f1f1c]">
      <header className="border-b border-black/8 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-semibold tracking-tight">LeadSpark</h1>
            <p className="text-sm text-[#5c6b66]">
              {agent.name} · {agent.company}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/demo" className="text-sm text-[#0f7a63] underline">
              Open demo chat
            </Link>
            <LogoutButton />
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-8">
        <section className="grid sm:grid-cols-3 gap-3">
          <Stat
            label="Hot leads"
            value={String(leads.filter((l) => l.lead_score === "hot").length)}
          />
          <Stat label="Total leads" value={String(leads.length)} />
          <Stat label="Properties" value={String(properties.length)} />
        </section>

        <section className="rounded-xl bg-white border border-black/8 p-4 space-y-3">
          <h2 className="font-medium">Shareable chat link</h2>
          <p className="text-sm text-[#5c6b66]">
            Sample listing: {DEMO_PROPERTY.title} ·{" "}
            {formatINR(DEMO_PROPERTY.price_amount)}
          </p>
          <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <code className="flex-1 text-sm bg-[#f6f7f4] rounded-lg px-3 py-2 break-all">
              {appUrl}
              {sharePath}
            </code>
            <CopyLinkButton value={`${appUrl}${sharePath}`} />
          </div>
          <p className="text-xs text-[#8a9691]">
            WhatsApp handoff number: +{agent.whatsapp} · Alerts → {agent.email}
          </p>
        </section>

        <section className="rounded-xl bg-white border border-black/8 p-4">
          <h2 className="font-medium mb-1">Setup status</h2>
          <ul className="text-sm space-y-1 text-[#5c6b66]">
            <Status ok={isGeminiConfigured()} label="GEMINI_API_KEY (live AI)" />
            <Status
              ok={isSupabaseConfigured()}
              label="Supabase (persistent leads) — memory fallback if off"
            />
            <Status
              ok={isResendConfigured()}
              label="RESEND_API_KEY (hot-lead email)"
            />
          </ul>
        </section>

        <section>
          <h2 className="font-medium mb-3">Leads</h2>
          <LeadList leads={leads} />
        </section>
      </main>

      <footer className="text-center text-xs text-[#8a9691] py-8">
        LeadSpark
      </footer>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-white border border-black/8 px-4 py-3">
      <p className="text-xs text-[#8a9691]">{label}</p>
      <p className="text-2xl font-semibold mt-1">{value}</p>
    </div>
  );
}

function Status({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li>
      <span className={ok ? "text-[#0f7a63]" : "text-amber-700"}>
        {ok ? "●" : "○"}
      </span>{" "}
      {label}
    </li>
  );
}
