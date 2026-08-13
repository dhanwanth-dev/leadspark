"use client";

import { useState } from "react";

export function CopyLinkButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="px-4 py-2 rounded-lg bg-[#0f7a63] text-white text-sm font-medium whitespace-nowrap"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
