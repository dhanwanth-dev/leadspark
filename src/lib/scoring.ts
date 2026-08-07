import type { LeadFields, LeadScore, Property } from "./types";

/**
 * Deterministic scoring fallback (also used to validate model output).
 * Hot = phone + budget fits listing + timeline is soon.
 */
export function scoreLead(fields: Partial<LeadFields>, property: Property): LeadScore {
  const hasPhone = Boolean(fields.phone && String(fields.phone).replace(/\D/g, "").length >= 10);
  const timeline = (fields.timeline || "").toLowerCase();
  const soon =
    /immediate|asap|this week|15 day|1 month|one month|within a month|urgent|ready/.test(
      timeline
    );

  const budgetMax = fields.budget_max ?? fields.budget_min ?? null;
  const budgetMin = fields.budget_min ?? null;
  let budgetFit = false;
  if (budgetMax != null) {
    // Within ~20% of listing price counts as fit
    budgetFit = budgetMax >= property.price_amount * 0.8;
  }
  if (budgetMin != null && budgetMin > property.price_amount * 1.3) {
    budgetFit = false;
  }

  if (hasPhone && budgetFit && soon) return "hot";
  if (hasPhone && (budgetFit || soon)) return "warm";
  if (hasPhone || budgetMax != null || fields.name) return "warm";
  return "cold";
}
