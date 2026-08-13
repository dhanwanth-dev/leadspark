"use client";

import { useMemo, useState } from "react";
import type { Lead, LeadScore } from "@/lib/types";

const scoreOrder: Record<LeadScore, number> = { hot: 0, warm: 1, cold: 2 };

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function LeadList({ leads }: { leads: Lead[] }) {
  const [filter, setFilter] = useState<"all" | LeadScore>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    const filtered =
      filter === "all" ? leads : leads.filter((l) => l.lead_score === filter);
    return [...filtered].sort((a, b) => {
      const scoreDiff = scoreOrder[a.lead_score] - scoreOrder[b.lead_score];
      if (scoreDiff !== 0) return scoreDiff;
      return +new Date(b.created_at) - +new Date(a.created_at);
    });
  }, [leads, filter]);

  if (!leads.length) {
    return (
      <div className="rounded-xl border border-dashed border-black/15 bg-white p-8 text-center text-[#5c6b66]">
        No leads yet. Open{" "}
        <a href="/demo" className="text-[#0f7a63] underline">
          /demo
        </a>{" "}
        and complete a chat as a buyer.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["all", "hot", "warm", "cold"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-sm rounded-lg border ${
              filter === f
                ? "bg-[#0f1f1c] text-white border-[#0f1f1c]"
                : "bg-white border-black/10 text-[#3d4a46]"
            }`}
          >
            {f === "all" ? "All" : f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {sorted.map((lead) => {
          const open = openId === lead.id;
          return (
            <div
              key={lead.id}
              className={`rounded-xl border bg-white overflow-hidden ${
                lead.lead_score === "hot"
                  ? "border-orange-300 ring-1 ring-orange-200"
                  : "border-black/8"
              }`}
            >
              <button
                type="button"
                onClick={() => setOpenId(open ? null : lead.id)}
                className="w-full text-left px-4 py-3 flex items-start gap-3"
              >
                <span
                  className={`mt-0.5 text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0 ${
                    lead.lead_score === "hot"
                      ? "bg-orange-500 text-white"
                      : lead.lead_score === "warm"
                        ? "bg-amber-100 text-amber-900"
                        : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {lead.lead_score}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="font-medium text-[#0f1f1c]">
                      {lead.name || "Unknown visitor"}
                    </p>
                    <p className="text-xs text-[#8a9691]">
                      {formatWhen(lead.created_at)}
                    </p>
                  </div>
                  <p className="text-sm text-[#5c6b66] mt-0.5">
                    {lead.phone || "No phone"} · {lead.timeline || "No timeline"} ·{" "}
                    {lead.purpose}
                  </p>
                </div>
              </button>

              {open && (
                <div className="px-4 pb-4 border-t border-black/5 bg-[#fafaf8]">
                  <dl className="grid grid-cols-2 gap-2 text-sm py-3">
                    <div>
                      <dt className="text-[#8a9691]">Budget max</dt>
                      <dd>
                        {lead.budget_max
                          ? `₹${lead.budget_max.toLocaleString("en-IN")}`
                          : "—"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[#8a9691]">BHK pref</dt>
                      <dd>{lead.bhk_preference || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[#8a9691]">Locality</dt>
                      <dd>{lead.locality_pref || "—"}</dd>
                    </div>
                    <div>
                      <dt className="text-[#8a9691]">Property</dt>
                      <dd className="truncate">{lead.property_id}</dd>
                    </div>
                  </dl>

                  {lead.phone && (
                    <a
                      href={`https://wa.me/91${lead.phone.replace(/\D/g, "").slice(-10)}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex mb-3 text-sm bg-[#25D366] text-white px-3 py-1.5 rounded-lg"
                    >
                      WhatsApp handoff
                    </a>
                  )}

                  <p className="text-xs font-medium text-[#5c6b66] mb-2">
                    Conversation
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {(lead.conversation_transcript || []).map((m, i) => (
                      <div
                        key={i}
                        className={`text-sm px-3 py-2 rounded-lg ${
                          m.role === "user"
                            ? "bg-[#d9fdd3] ml-6"
                            : "bg-white border border-black/5 mr-6"
                        }`}
                      >
                        <span className="text-[10px] uppercase text-[#8a9691]">
                          {m.role}
                        </span>
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
