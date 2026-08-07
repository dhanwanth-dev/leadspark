import type { Property } from "./types";
import { isSupabaseConfigured } from "./config";
import { getServiceSupabase } from "./supabase/server";

/** Built-in sample listing so /demo works before Supabase is connected. */
export const DEMO_PROPERTY: Property = {
  id: "demo-whitefield",
  title: "3 BHK Premium Apartment in Whitefield",
  locality: "Whitefield",
  city: "Bengaluru",
  bhk: 3,
  listing_type: "sale",
  price_amount: 1_25_00_000,
  furnishing: "Semi-furnished",
  amenities: ["Clubhouse", "Swimming pool", "Gym", "Covered parking", "24x7 security"],
  rera_number: "PRM/KA/RERA/1251/446/PR/171015/000123",
  description:
    "Spacious 3 BHK in a gated community near ITPL, ready to move, ideal for end-users and investors.",
};

const LOCAL_PROPERTIES: Property[] = [DEMO_PROPERTY];

export async function getPropertyById(id: string): Promise<Property | null> {
  const local = LOCAL_PROPERTIES.find((p) => p.id === id);
  if (local) return local;

  if (!isSupabaseConfigured()) return null;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    title: data.title,
    locality: data.locality,
    city: data.city,
    bhk: data.bhk,
    listing_type: data.listing_type,
    price_amount: data.price_amount,
    furnishing: data.furnishing || "",
    amenities: data.amenities || [],
    rera_number: data.rera_number,
    description: data.description || undefined,
  };
}

export async function listProperties(): Promise<Property[]> {
  if (!isSupabaseConfigured()) return LOCAL_PROPERTIES;

  const supabase = getServiceSupabase();
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .order("created_at", { ascending: false });

  if (error || !data?.length) return LOCAL_PROPERTIES;

  const fromDb: Property[] = data.map((row) => ({
    id: row.id,
    title: row.title,
    locality: row.locality,
    city: row.city,
    bhk: row.bhk,
    listing_type: row.listing_type,
    price_amount: row.price_amount,
    furnishing: row.furnishing || "",
    amenities: row.amenities || [],
    rera_number: row.rera_number,
    description: row.description || undefined,
  }));

  // Keep demo property available even when DB is live
  const ids = new Set(fromDb.map((p) => p.id));
  return ids.has(DEMO_PROPERTY.id)
    ? fromDb
    : [DEMO_PROPERTY, ...fromDb];
}
