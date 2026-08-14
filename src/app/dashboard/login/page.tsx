"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export default function DashboardLoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setLoading(false);
    if (!res.ok) {
      setError("Wrong password");
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-[#f6f7f4] flex items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm bg-white border border-black/5 shadow-sm rounded-xl p-6 space-y-4"
      >
        <div>
          <h1 className="text-xl font-semibold text-[#0f1f1c]">LeadSpark</h1>
          <p className="text-sm text-[#5c6b66]">Agent dashboard login</p>
        </div>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Dashboard password"
          className="w-full border border-black/10 rounded-lg px-3 py-2.5 outline-none focus:border-[#0f7a63]"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-[#0f7a63] text-white rounded-lg py-2.5 font-medium disabled:opacity-60"
        >
          {loading ? "Checking…" : "Enter dashboard"}
        </button>
        <p className="text-[11px] text-[#8a9691] text-center">
          Default for local demo: check DASHBOARD_PASSWORD in .env
        </p>
      </form>
    </div>
  );
}
