import { randomUUID } from "crypto";
import { isSupabaseConfigured } from "./config";
import { getServiceSupabase } from "./supabase/server";
import type { ChatMessage, Lead, LeadFields } from "./types";

/** In-memory fallback when Supabase isn't set — good for local UI demos only. */
const memoryLeads: Lead[] = [];

export async function listLeads(): Promise<Lead[]> {
  if (!isSupabaseConfigured()) {
    return [...memoryLeads].sort(
      (a, b) => +new Date(b.created_at) - +new Date(a.created_at)
    );
  }

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data || []) as Lead[];
}

export async function upsertLeadFromChat(input: {
  propertyId: string;
  leadId?: string | null;
  fields: LeadFields;
  transcript: ChatMessage[];
}): Promise<Lead> {
  const now = new Date().toISOString();
  const id = input.leadId || randomUUID();

  const payload: Lead = {
    id,
    property_id: input.propertyId,
    ...input.fields,
    conversation_transcript: input.transcript,
    created_at: now,
    notified_at: null,
  };

  if (!isSupabaseConfigured()) {
    const existing = memoryLeads.findIndex((l) => l.id === id);
    if (existing >= 0) {
      payload.created_at = memoryLeads[existing].created_at;
      payload.notified_at = memoryLeads[existing].notified_at;
      memoryLeads[existing] = payload;
    } else {
      memoryLeads.unshift(payload);
    }
    return payload;
  }

  const supabase = getServiceSupabase();
  const { data: existing } = await supabase
    .from("leads")
    .select("id, created_at, notified_at")
    .eq("id", id)
    .maybeSingle();

  const row = {
    id,
    property_id: input.propertyId,
    name: input.fields.name,
    phone: input.fields.phone,
    budget_min: input.fields.budget_min,
    budget_max: input.fields.budget_max,
    locality_pref: input.fields.locality_pref,
    timeline: input.fields.timeline,
    purpose: input.fields.purpose,
    bhk_preference: input.fields.bhk_preference,
    lead_score: input.fields.lead_score,
    notes: input.fields.notes,
    conversation_transcript: input.transcript,
  };

  if (existing) {
    const { data, error } = await supabase
      .from("leads")
      .update(row)
      .eq("id", id)
      .select("*")
      .single();
    if (error) throw error;
    return data as Lead;
  }

  const { data, error } = await supabase
    .from("leads")
    .insert({ ...row, created_at: now })
    .select("*")
    .single();
  if (error) throw error;
  return data as Lead;
}

export async function markLeadNotified(leadId: string): Promise<void> {
  const notifiedAt = new Date().toISOString();

  if (!isSupabaseConfigured()) {
    const lead = memoryLeads.find((l) => l.id === leadId);
    if (lead) lead.notified_at = notifiedAt;
    return;
  }

  const supabase = getServiceSupabase();
  await supabase.from("leads").update({ notified_at: notifiedAt }).eq("id", leadId);
}
