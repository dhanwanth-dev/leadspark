import { cookies } from "next/headers";
import { getDashboardPassword } from "./config";

const COOKIE = "leadspark_session";

export function isDashboardAuthenticated(): boolean {
  const token = cookies().get(COOKIE)?.value;
  return token === signSession(getDashboardPassword());
}

export function signSession(password: string): string {
  // Lightweight session token for the 48h single-client version (not multi-tenant auth).
  return Buffer.from(`ls:${password}`).toString("base64url");
}

export function getSessionCookieName() {
  return COOKIE;
}
