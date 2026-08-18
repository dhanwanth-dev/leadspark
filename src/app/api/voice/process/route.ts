import { NextResponse } from "next/server";
import { processVoiceAudio } from "@/lib/voice";
import { appendVoiceLeadToSheet } from "@/lib/google-sheets-voice";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("audio");
    const mimeType = (form.get("mimeType") as string) || "audio/webm";

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "Missing audio file" }, { status: 400 });
    }

    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Audio too large (max 20MB)" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const audioBase64 = buffer.toString("base64");
    const durationSec = Number(form.get("durationSec") || 0);

    const result = await processVoiceAudio(audioBase64, mimeType);

    try {
      await appendVoiceLeadToSheet(result, {
        duration_sec: durationSec,
        source: "mobile-voice-test",
      });
    } catch (sheetErr) {
      console.error("[LeadSpark Voice] Sheet append failed", sheetErr);
      return NextResponse.json({
        ...result,
        sheet_saved: false,
        sheet_error: sheetErr instanceof Error ? sheetErr.message : "Sheet failed",
      });
    }

    return NextResponse.json({ ...result, sheet_saved: true });
  } catch (err) {
    console.error("[LeadSpark Voice]", err);
    const message = err instanceof Error ? err.message : "Voice processing failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
