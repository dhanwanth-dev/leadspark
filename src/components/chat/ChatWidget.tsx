"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import type { AgentConfig, ChatMessage, LeadFields, Property } from "@/lib/types";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

const emptyFields: LeadFields = {
  name: null,
  phone: null,
  budget_min: null,
  budget_max: null,
  locality_pref: null,
  timeline: null,
  purpose: "unknown",
  bhk_preference: null,
  lead_score: "cold",
  notes: null,
};

export function ChatWidget({
  property,
  agent,
  embedded = false,
}: {
  property: Property;
  agent: AgentConfig;
  /** When true, fill parent instead of forcing full viewport height */
  embedded?: boolean;
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [fields, setFields] = useState<LeadFields>(emptyFields);
  const [leadId, setLeadId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, typing]);

  useEffect(() => {
    if (started) return;
    setStarted(true);
    void sendToApi([], emptyFields, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function sendToApi(
    nextMessages: ChatMessage[],
    nextFields: LeadFields,
    bootstrap = false
  ) {
    setTyping(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          propertyId: property.id,
          leadId,
          bootstrap,
          messages: nextMessages,
          fields: nextFields,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to send");

      setLeadId(data.leadId);
      setFields(data.fields);
      if (bootstrap) {
        setMessages([data.assistantMessage]);
      } else {
        setMessages((prev) => [...prev, data.assistantMessage]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setTyping(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || typing) return;

    const userMessage: ChatMessage = {
      role: "user",
      content: text,
      timestamp: new Date().toISOString(),
    };
    const next = [...messages, userMessage];
    setMessages(next);
    setInput("");
    await sendToApi(next, fields);
  }

  return (
    <div
      className={`flex flex-col w-full max-w-md mx-auto bg-[#efeae2] shadow-xl relative overflow-hidden ${
        embedded ? "h-full" : "h-full min-h-[100dvh]"
      }`}
    >
      {/* WhatsApp-like wallpaper */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23c5b9a8' fill-opacity='0.35'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")",
        }}
      />

      <header className="relative z-10 flex items-center gap-3 px-3 py-2.5 bg-[#075e54] text-white">
        <div className="w-10 h-10 rounded-full bg-[#128c7e] flex items-center justify-center font-semibold text-sm">
          {agent.company.slice(0, 1).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-[16px] leading-tight truncate">
            {agent.name}
          </p>
          <p className="text-[12px] text-white/80 truncate">
            {property.bhk} BHK · {property.locality}
          </p>
        </div>
        {fields.lead_score !== "cold" && (
          <span
            className={`text-[11px] uppercase tracking-wide px-2 py-0.5 rounded-full ${
              fields.lead_score === "hot"
                ? "bg-orange-400 text-white"
                : "bg-white/20 text-white"
            }`}
          >
            {fields.lead_score}
          </span>
        )}
      </header>

      <div className="relative z-10 flex-1 overflow-y-auto py-3">
        <div className="mx-3 mb-3 text-center">
          <span className="inline-block bg-white/90 text-[#54656f] text-[12px] px-3 py-1 rounded-lg shadow-sm">
            Chat about: {property.title}
          </span>
        </div>

        {messages.map((m, i) => (
          <MessageBubble key={`${m.timestamp}-${i}`} message={m} />
        ))}
        {typing && <TypingIndicator />}
        {error && (
          <p className="mx-3 mt-2 text-center text-sm text-red-700 bg-red-50 rounded px-2 py-1">
            {error}
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={onSubmit}
        className="relative z-10 flex items-end gap-2 p-2 bg-[#f0f2f5]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message"
          className="flex-1 rounded-full bg-white px-4 py-2.5 text-[15px] text-[#111b21] outline-none border border-transparent focus:border-[#25d366]"
          disabled={typing}
        />
        <button
          type="submit"
          disabled={typing || !input.trim()}
          className="w-11 h-11 rounded-full bg-[#00a884] text-white flex items-center justify-center disabled:opacity-50 shrink-0"
          aria-label="Send"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        </button>
      </form>

      <footer className="relative z-10 text-center text-[10px] text-[#667781] bg-[#f0f2f5] pb-2">
        LeadSpark
      </footer>
    </div>
  );
}
