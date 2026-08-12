import { NextResponse } from "next/server";
import {
  getSessionCookieName,
  signSession,
} from "@/lib/auth";
import { getDashboardPassword } from "@/lib/config";

export async function POST(req: Request) {
  const { password } = (await req.json()) as { password?: string };
  if (!password || password !== getDashboardPassword()) {
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(getSessionCookieName(), signSession(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 14,
  });
  return res;
}
