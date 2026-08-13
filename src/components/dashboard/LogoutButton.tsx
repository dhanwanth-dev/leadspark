"use client";

import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/dashboard/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={logout}
      className="text-sm text-[#5c6b66] hover:text-[#0f1f1c]"
    >
      Log out
    </button>
  );
}
