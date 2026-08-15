import Link from "next/link";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { getAgentConfig } from "@/lib/config";
import { DEMO_PROPERTY } from "@/lib/properties";

export default function DemoPage() {
  const agent = getAgentConfig();

  return (
    <div className="min-h-screen bg-[#0f1f1c] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-12 grid md:grid-cols-2 gap-8 items-start">
        <section className="space-y-5 md:pt-6">
          <p className="text-sm text-[#8fd6c4] tracking-wide">
            Personal project
          </p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight leading-[1.1]">
            LeadSpark
          </h1>
          <p className="text-lg text-white/75 max-w-md">
            AI WhatsApp-style lead qualification for Indian real estate agents.
            Instant reply, hot/warm/cold scoring, dashboard + email alert.
          </p>
          <ul className="text-sm text-white/70 space-y-2">
            <li>· Try the live chat on a sample Whitefield 3 BHK →</li>
            <li>· Share name, phone, budget, timeline like a real buyer</li>
            <li>
              · Then open the{" "}
              <Link href="/dashboard" className="text-[#8fd6c4] underline">
                agent dashboard
              </Link>
            </li>
          </ul>
          <p className="text-xs text-white/45 pt-4">
            Demo for {agent.company}. Swap agent name + API keys before go-live.
          </p>
        </section>

        <div className="rounded-2xl overflow-hidden border border-white/10 shadow-2xl h-[70vh] min-h-[520px]">
          <ChatWidget property={DEMO_PROPERTY} agent={agent} embedded />
        </div>
      </div>
    </div>
  );
}
