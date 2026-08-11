import { NextResponse } from "next/server";
import { z } from "zod";
import {
  emptyLeadFields,
  generateGreeting,
  runQualificationTurn,
} from "@/lib/gemini";
import { upsertLeadFromChat, markLeadNotified } from "@/lib/leads";
import { sendHotLeadEmail } from "@/lib/email";
import { getPropertyById } from "@/lib/properties";
import type { ChatMessage, LeadFields } from "@/lib/types";

const bodySchema = z.object({
  propertyId: z.string().min(1),
  leadId: z.string().optional().nullable(),
  bootstrap: z.boolean().optional(),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string(),
        timestamp: z.string(),
      })
    )
    .default([]),
  fields: z
    .object({
      name: z.string().nullable(),
      phone: z.string().nullable(),
      budget_min: z.number().nullable(),
      budget_max: z.number().nullable(),
      locality_pref: z.string().nullable(),
      timeline: z.string().nullable(),
      purpose: z.enum(["self-use", "investment", "unknown"]),
      bhk_preference: z.string().nullable(),
      lead_score: z.enum(["hot", "warm", "cold"]),
      notes: z.string().nullable(),
    })
    .optional(),
});

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = bodySchema.parse(json);

    const property = await getPropertyById(body.propertyId);
    if (!property) {
      return NextResponse.json({ error: "Property not found" }, { status: 404 });
    }

    const currentFields: LeadFields = body.fields || emptyLeadFields();
    let fields = currentFields;
    let reply: string;
    let transcript: ChatMessage[];

    if (body.bootstrap || body.messages.length === 0) {
      reply = await generateGreeting(property);
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      };
      transcript = [assistantMessage];

      const lead = await upsertLeadFromChat({
        propertyId: property.id,
        leadId: body.leadId,
        fields,
        transcript,
      });

      return NextResponse.json({
        reply,
        leadId: lead.id,
        fields,
        assistantMessage,
      });
    }

    const messages = body.messages as ChatMessage[];
    const turn = await runQualificationTurn({
      property,
      messages,
      currentFields,
    });
    reply = turn.reply;
    fields = turn.fields;

    const assistantMessage: ChatMessage = {
      role: "assistant",
      content: reply,
      timestamp: new Date().toISOString(),
    };
    transcript = [...messages, assistantMessage];

    const lead = await upsertLeadFromChat({
      propertyId: property.id,
      leadId: body.leadId,
      fields,
      transcript,
    });

    if (fields.lead_score === "hot" && !lead.notified_at) {
      const sent = await sendHotLeadEmail(lead, property);
      if (sent) await markLeadNotified(lead.id);
    }

    return NextResponse.json({
      reply,
      leadId: lead.id,
      fields,
      assistantMessage,
    });
  } catch (err) {
    console.error("[LeadSpark] /api/chat", err);
    const message = err instanceof Error ? err.message : "Chat failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
