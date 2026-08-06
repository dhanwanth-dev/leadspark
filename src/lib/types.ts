export type LeadScore = "hot" | "warm" | "cold";
export type ListingType = "sale" | "rent";
export type Purpose = "self-use" | "investment" | "unknown";

export type ChatRole = "user" | "assistant";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  timestamp: string;
}

export interface Property {
  id: string;
  title: string;
  locality: string;
  city: string;
  bhk: number;
  listing_type: ListingType;
  price_amount: number;
  furnishing: string;
  amenities: string[];
  rera_number: string | null;
  description?: string;
}

export interface LeadFields {
  name: string | null;
  phone: string | null;
  budget_min: number | null;
  budget_max: number | null;
  locality_pref: string | null;
  timeline: string | null;
  purpose: Purpose;
  bhk_preference: string | null;
  lead_score: LeadScore;
  notes: string | null;
}

export interface Lead extends LeadFields {
  id: string;
  property_id: string;
  conversation_transcript: ChatMessage[];
  created_at: string;
  notified_at: string | null;
}

export interface AgentConfig {
  name: string;
  email: string;
  phone: string;
  whatsapp: string;
  company: string;
}
