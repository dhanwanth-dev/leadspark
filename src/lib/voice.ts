import { GoogleGenerativeAI } from "@google/generative-ai";

export type VoiceLeadFields = {
  name: string | null;
  phone: string | null;
  budget_min: number | null;
  budget_max: number | null;
  locality: string | null;
  timeline: string | null;
  purpose: string | null;
  bhk: string | null;
  lead_score: "hot" | "warm" | "cold";
  notes: string | null;
};

export type VoiceProcessResult = {
  transcript: string;
  summary: string;
  language_detected: string;
  fields: VoiceLeadFields;
};

const PROMPT = `You are LeadSpark, a real estate call assistant for Indian brokers.

Listen to this phone conversation recording. It may be in Tamil, Tanglish, Hindi, or English.

Tasks:
1. Transcribe accurately (keep Tamil in Tamil script where possible, or romanized if unclear).
2. Write a 2-3 sentence English summary for the broker.
3. Extract structured lead data from the conversation.

Return ONLY valid JSON:
{
  "transcript": "full transcription text",
  "summary": "short English summary for broker",
  "language_detected": "tamil|tanglish|hindi|english|mixed",
  "fields": {
    "name": string or null,
    "phone": string or null (digits only, 10 digit Indian mobile if present),
    "budget_min": number in INR or null,
    "budget_max": number in INR or null,
    "locality": string or null,
    "timeline": string or null,
    "purpose": string or null,
    "bhk": string or null,
    "lead_score": "hot"|"warm"|"cold",
    "notes": string or null
  }
}

Scoring: hot = phone + budget fits + timeline soon; warm = some intent; cold = vague inquiry.`;

export async function processVoiceAudio(
  audioBase64: string,
  mimeType: string
): Promise<VoiceProcessResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not set");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: process.env.GEMINI_MODEL || "gemini-2.0-flash",
    generationConfig: { temperature: 0.2, responseMimeType: "application/json" },
  });

  const result = await model.generateContent([
    { text: PROMPT },
    { inlineData: { mimeType, data: audioBase64 } },
  ]);

  const text = result.response.text();
  const cleaned = text.replace(/```json|```/g, "").trim();
  const parsed = JSON.parse(cleaned) as VoiceProcessResult;

  return {
    transcript: parsed.transcript || "",
    summary: parsed.summary || "",
    language_detected: parsed.language_detected || "unknown",
    fields: {
      name: parsed.fields?.name ?? null,
      phone: parsed.fields?.phone ?? null,
      budget_min: parsed.fields?.budget_min ?? null,
      budget_max: parsed.fields?.budget_max ?? null,
      locality: parsed.fields?.locality ?? null,
      timeline: parsed.fields?.timeline ?? null,
      purpose: parsed.fields?.purpose ?? null,
      bhk: parsed.fields?.bhk ?? null,
      lead_score: parsed.fields?.lead_score ?? "cold",
      notes: parsed.fields?.notes ?? null,
    },
  };
}
