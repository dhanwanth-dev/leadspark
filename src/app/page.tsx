import Link from "next/link";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#0f1f1c] text-white flex items-center">
      <div className="max-w-2xl mx-auto px-6 py-16 space-y-6">
        <p className="text-sm text-[#8fd6c4]">Personal project</p>
        <h1 className="text-5xl font-semibold tracking-tight">LeadSpark</h1>
        <p className="text-lg text-white/75">
          48-hour close version: WhatsApp-style AI qualification for one real
          estate agent. Demo it live, then swap env vars for the next client.
        </p>
        <div className="flex flex-wrap gap-3 pt-2">
          <Link
            href="/demo"
            className="bg-[#25d366] text-[#0f1f1c] font-medium px-5 py-2.5 rounded-lg"
          >
            Try live demo
          </Link>
          <Link
            href="/dashboard"
            className="border border-white/25 px-5 py-2.5 rounded-lg text-white/90"
          >
            Agent dashboard
          </Link>
          <Link
            href="/chat/demo-whitefield"
            className="border border-white/25 px-5 py-2.5 rounded-lg text-white/90"
          >
            Chat widget only
          </Link>
        </div>
        <ol className="text-sm text-white/55 space-y-1 pt-6 list-decimal list-inside">
          <li>Open demo and chat like a buyer (name, phone, budget, timeline)</li>
          <li>Check dashboard for the scored lead + transcript</li>
          <li>Add GEMINI / Resend / Supabase keys when ready for a real pitch</li>
        </ol>
      </div>
    </main>
  );
}
