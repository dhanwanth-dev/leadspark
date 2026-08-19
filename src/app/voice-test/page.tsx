"use client";

import { useEffect, useRef, useState } from "react";

type Result = {
  transcript: string;
  summary: string;
  language_detected: string;
  fields: Record<string, unknown>;
  sheet_saved?: boolean;
  sheet_error?: string;
};

export default function VoiceTestPage() {
  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [seconds, setSeconds] = useState(0);
  const [liveHint, setLiveHint] = useState("Tap Record, talk like a broker call, then Stop.");

  const mediaRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function startRecording() {
    setError(null);
    setResult(null);
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/mp4")
          ? "audio/mp4"
          : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => void uploadRecording(mimeType.split(";")[0]);

      recorder.start(1000);
      setRecording(true);
      setSeconds(0);
      setLiveHint("Recording… speak in Tamil / Tanglish like a real buyer call.");
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch {
      setError("Microphone permission denied. Allow mic access in browser settings.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    mediaRef.current?.stop();
    mediaRef.current?.stream.getTracks().forEach((t) => t.stop());
    setRecording(false);
    setLiveHint("Processing with Gemini…");
  }

  async function uploadRecording(mimeType: string) {
    setProcessing(true);
    try {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const form = new FormData();
      form.append("audio", blob, `call.${mimeType.includes("mp4") ? "m4a" : "webm"}`);
      form.append("mimeType", mimeType);
      form.append("durationSec", String(seconds));

      const res = await fetch("/api/voice/process", {
        method: "POST",
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");

      setResult(data);
      setLiveHint(data.sheet_saved ? "Saved to Google Sheet." : "Transcribed (sheet not configured).");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Upload failed");
      setLiveHint("Tap Record to try again.");
    } finally {
      setProcessing(false);
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="min-h-[100dvh] bg-[#0f1f1c] text-white px-4 py-6 max-w-md mx-auto">
      <p className="text-xs text-[#8fd6c4] mb-1">LeadSpark</p>
      <h1 className="text-2xl font-semibold mb-1">Voice call test</h1>
      <p className="text-sm text-white/70 mb-6">
        Record a mock broker call on your phone. Tamil/Tanglish works. Result goes to Google Sheets.
      </p>

      <div className="rounded-2xl bg-white/5 border border-white/10 p-6 text-center mb-4">
        <p className="text-4xl font-mono tabular-nums mb-2">
          {mm}:{ss}
        </p>
        <p className="text-sm text-white/60 min-h-[40px]">{liveHint}</p>
      </div>

      <div className="flex gap-3 mb-6">
        {!recording ? (
          <button
            type="button"
            disabled={processing}
            onClick={startRecording}
            className="flex-1 bg-[#e53935] text-white py-4 rounded-xl font-medium disabled:opacity-50"
          >
            {processing ? "Processing…" : "● Record call"}
          </button>
        ) : (
          <button
            type="button"
            onClick={stopRecording}
            className="flex-1 bg-white text-[#0f1f1c] py-4 rounded-xl font-medium"
          >
            ■ Stop & analyze
          </button>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-300 bg-red-950/50 border border-red-800 rounded-lg px-3 py-2 mb-4">
          {error}
        </p>
      )}

      {result && (
        <div className="space-y-4 text-sm">
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-[#8fd6c4] text-xs uppercase mb-1">Summary</p>
            <p>{result.summary}</p>
            <p className="text-xs text-white/50 mt-2">
              Language: {result.language_detected}
              {result.sheet_saved ? " · Sheet ✓" : result.sheet_error ? ` · Sheet ✗` : ""}
            </p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-[#8fd6c4] text-xs uppercase mb-1">Transcript</p>
            <p className="whitespace-pre-wrap text-white/90">{result.transcript}</p>
          </div>
          <div className="rounded-xl bg-white/5 border border-white/10 p-4">
            <p className="text-[#8fd6c4] text-xs uppercase mb-1">Extracted lead</p>
            <pre className="text-xs overflow-x-auto text-white/80">
              {JSON.stringify(result.fields, null, 2)}
            </pre>
          </div>
        </div>
      )}

      <p className="text-xs text-white/40 mt-8 text-center">
        Tip: Use Chrome on Android. iPhone works in Safari. Talk 30–90 seconds like a real enquiry.
      </p>
    </div>
  );
}
