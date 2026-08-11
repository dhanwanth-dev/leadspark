import { NextResponse } from "next/server";
import { isDashboardAuthenticated } from "@/lib/auth";
import { listLeads } from "@/lib/leads";

export async function GET() {
  if (!isDashboardAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const leads = await listLeads();
    return NextResponse.json({ leads });
  } catch (err) {
    console.error("[LeadSpark] /api/leads", err);
    return NextResponse.json({ error: "Failed to load leads" }, { status: 500 });
  }
}
