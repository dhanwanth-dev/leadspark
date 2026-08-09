import {
  GoogleGenerativeAI,
  SchemaType,
  type Content,
  type FunctionDeclaration,
  type Part,
} from "@google/generative-ai";
import { formatINR, getAgentConfig } from "./config";
import { scoreLead } from "./scoring";
import type { ChatMessage, LeadFields, Property } from "./types";

const EMPTY_FIELDS: LeadFields = {
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

const updateLeadTool: FunctionDeclaration = {
  name: "update_lead_profile",
  description:
    "Update structured lead qualification fields whenever the visitor shares new info. Call this whenever name, phone, budget, locality, timeline, purpose, or BHK preference is mentioned or clarified. Omit fields you don't know yet.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      name: { type: SchemaType.STRING, description: "Visitor full name" },
      phone: {
        type: SchemaType.STRING,
        description: "Indian mobile number, digits preferred",
      },
      budget_min: {
        type: SchemaType.NUMBER,
        description: "Budget minimum in INR (rupees, not lakhs)",
      },
      budget_max: {
        type: SchemaType.NUMBER,
        description: "Budget maximum in INR (rupees, not lakhs)",
      },
      locality_pref: {
        type: SchemaType.STRING,
        description: "Preferred locality/area",
      },
      timeline: {
        type: SchemaType.STRING,
        description: "When they want to buy/rent, e.g. 'within 1 month'",
      },
      purpose: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["self-use", "investment", "unknown"],
        description: "Buy purpose",
      },
      bhk_preference: {
        type: SchemaType.STRING,
        description: "BHK preference e.g. 2BHK / 3BHK",
      },
      notes: {
        type: SchemaType.STRING,
        description: "Short note for the agent",
      },
      lead_score: {
        type: SchemaType.STRING,
        format: "enum",
        enum: ["hot", "warm", "cold"],
        description:
          "hot = phone + budget fits + timeline soon; warm = some intent/contact; cold = browsing",
      },
    },
  },
};

function buildSystemPrompt(property: Property): string {
  const agent = getAgentConfig();
  const price = formatINR(property.price_amount);
  const amenities = property.amenities.join(", ") || "standard amenities";

  return `You are LeadSpark, a warm WhatsApp-style property assistant for ${agent.name} at ${agent.company}.
You help qualify inbound real-estate leads in India. You represent the agent's listing only.

PROPERTY CONTEXT
- Title: ${property.title}
- ${property.bhk} BHK, ${property.listing_type}, ${property.furnishing}
- Locality: ${property.locality}, ${property.city}
- Price: ${price} (${property.price_amount} INR)
- Amenities: ${amenities}
- RERA: ${property.rera_number || "Ask agent for RERA details"}
- Notes: ${property.description || "N/A"}

GOAL (over 3–5 natural exchanges, not a rigid form)
Capture: name, phone, budget range, locality preference, timeline, purpose (self-use/investment), BHK preference.
Score lead hot/warm/cold using update_lead_profile.

TONE
- Indian English, warm and professional — not stiff corporate
- Use BHK, ₹ / Lakh / Cr naturally
- Mention RERA when trust/legal questions come up
- Short WhatsApp-length messages (2–4 sentences max)

RULES
1. Open with a warm greeting that references THIS property (if conversation is empty, your first reply is the greeting).
2. Answer price/address/amenity questions from property data, then continue qualifying.
3. If rude or off-topic: stay calm, briefly redirect to the property.
4. Never invent inventory or prices outside the property context.
5. Never say you are Claude or Gemini. You are the listing assistant for ${agent.company}.
6. When you learn new qualification info, ALWAYS call update_lead_profile before or with your reply.
7. Ask only one main question at a time.
8. Once you have phone + budget + timeline, thank them and say ${agent.name} will connect on WhatsApp shortly.`;
}

function toGeminiHistory(messages: ChatMessage[]): Content[] {
  return messages.map((m) => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));
}

function mergeFields(
  current: LeadFields,
  patch: Partial<LeadFields>,
  property: Property
): LeadFields {
  const merged: LeadFields = {
    ...current,
    ...Object.fromEntries(
      Object.entries(patch).filter(([, v]) => v !== undefined && v !== null && v !== "")
    ),
    purpose: patch.purpose || current.purpose || "unknown",
  } as LeadFields;

  // Prefer deterministic score when we have enough signal
  merged.lead_score = scoreLead(merged, property);
  return merged;
}

function parseBudgetFromText(text: string): Partial<LeadFields> {
  const lower = text.toLowerCase();
  const patch: Partial<LeadFields> = {};

  const cr = lower.match(/(\d+(?:\.\d+)?)\s*cr/);
  const lakh = lower.match(/(\d+(?:\.\d+)?)\s*lakh/);
  if (cr) {
    const n = Math.round(parseFloat(cr[1]) * 10_000_000);
    patch.budget_max = n;
  } else if (lakh) {
    const n = Math.round(parseFloat(lakh[1]) * 100_000);
    patch.budget_max = n;
  }

  const phone = text.match(/(?:\+?91[-\s]?)?[6-9]\d{9}/);
  if (phone) patch.phone = phone[0].replace(/\D/g, "").slice(-10);

  return patch;
}

export async function generateGreeting(property: Property): Promise<string> {
  const agent = getAgentConfig();
  const price = formatINR(property.price_amount);
  const fallback = `Hi! 👋 Thanks for your interest in the ${property.bhk} BHK in ${property.locality} (${price}). I'm assisting ${agent.name} from ${agent.company}. May I know your name?`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return fallback;

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
      systemInstruction: buildSystemPrompt(property),
    });
    const result = await model.generateContent(
      "The visitor just opened the chat. Send only your warm opening greeting that references this property and asks for their name. No tools."
    );
    return result.response.text().trim() || fallback;
  } catch {
    return fallback;
  }
}

export async function runQualificationTurn(input: {
  property: Property;
  messages: ChatMessage[];
  currentFields: LeadFields;
}): Promise<{ reply: string; fields: LeadFields }> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return mockTurn(input);
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    systemInstruction: buildSystemPrompt(input.property),
    tools: [{ functionDeclarations: [updateLeadTool] }],
  });

  let fields = { ...input.currentFields };
  const history = toGeminiHistory(input.messages.slice(0, -1));
  const lastUser = input.messages[input.messages.length - 1];

  // Heuristic extract from latest user text (helps if model forgets tool call)
  fields = mergeFields(fields, parseBudgetFromText(lastUser.content), input.property);

  const chat = model.startChat({ history });
  const result = await chat.sendMessage(lastUser.content);
  let response = result.response;
  let reply = "";

  for (let i = 0; i < 3; i++) {
    const calls = response.functionCalls();
    if (!calls?.length) {
      reply = response.text();
      break;
    }

    const parts: Part[] = [];
    for (const call of calls) {
      if (call.name === "update_lead_profile") {
        const args = call.args as Partial<LeadFields>;
        fields = mergeFields(fields, args, input.property);
        parts.push({
          functionResponse: {
            name: call.name,
            response: { ok: true, lead_score: fields.lead_score },
          },
        });
      }
    }

    const follow = await chat.sendMessage(parts);
    response = follow.response;
    try {
      reply = response.text();
    } catch {
      reply = "";
    }
    if (reply) break;
  }

  if (!reply) {
    reply =
      "Thanks for sharing that — just so I can help better, what's a good number to reach you on WhatsApp?";
  }

  return { reply: reply.trim(), fields };
}

/** Offline demo replies so UI works before GEMINI_API_KEY is set. */
function mockTurn(input: {
  property: Property;
  messages: ChatMessage[];
  currentFields: LeadFields;
}): { reply: string; fields: LeadFields } {
  const agent = getAgentConfig();
  const userText = input.messages[input.messages.length - 1]?.content || "";
  let fields = mergeFields(
    input.currentFields,
    parseBudgetFromText(userText),
    input.property
  );

  const lower = userText.toLowerCase();
  if (/^[a-zA-Z][a-zA-Z\s]{1,40}$/.test(userText.trim()) && !fields.name) {
    fields = mergeFields(fields, { name: userText.trim() }, input.property);
  }
  if (/(self|own stay|end use|family)/.test(lower)) {
    fields = mergeFields(fields, { purpose: "self-use" }, input.property);
  }
  if (/invest/.test(lower)) {
    fields = mergeFields(fields, { purpose: "investment" }, input.property);
  }
  if (/(month|week|immediate|asap|urgent)/.test(lower)) {
    fields = mergeFields(fields, { timeline: userText.trim() }, input.property);
  }
  if (/\d\s*bhk/.test(lower)) {
    const m = lower.match(/(\d)\s*bhk/);
    if (m) fields = mergeFields(fields, { bhk_preference: `${m[1]}BHK` }, input.property);
  }

  const price = formatINR(input.property.price_amount);
  let reply: string;

  if (input.messages.filter((m) => m.role === "user").length <= 1 && !fields.name) {
    reply = `Hi! 👋 Thanks for your interest in the ${input.property.bhk} BHK in ${input.property.locality}. I'm assisting ${agent.name} from ${agent.company}. May I know your name?`;
  } else if (!fields.name) {
    reply = `Got it. Before we go further on this ${input.property.locality} ${input.property.bhk} BHK (${price}), could I get your name?`;
  } else if (!fields.phone) {
    reply = `Nice to meet you, ${fields.name}! What's the best WhatsApp number to reach you on?`;
  } else if (fields.budget_max == null) {
    reply = `Thanks. This home is listed around ${price}. What's your budget range in mind?`;
  } else if (!fields.timeline) {
    reply = `Understood on budget. Are you looking to finalise in the next few weeks, or still exploring?`;
  } else if (fields.purpose === "unknown") {
    reply = `Almost done — is this for your own stay or more of an investment?`;
  } else {
    reply = `Perfect, ${fields.name}. I've noted your details for the ${input.property.locality} ${input.property.bhk} BHK. ${agent.name} will connect with you on WhatsApp shortly. Anything else you'd like to know about the property?`;
  }

  if (/price|cost|how much/.test(lower)) {
    reply = `This ${input.property.bhk} BHK in ${input.property.locality} is listed at ${price}. ${reply}`;
  }

  return { reply, fields };
}

export function emptyLeadFields(): LeadFields {
  return { ...EMPTY_FIELDS };
}
