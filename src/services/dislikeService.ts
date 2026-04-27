// ============================================================================
// dislikeService — manage profiles.food_dislikes (klijent food preferences)
// ============================================================================
//
// Korisnik može dodati dislike preko "Ne volim ovo" dugmeta u meal sheet-u.
// mealPlanGenerator filterByDislikes radi substring match po name + ingredients,
// pa user može dodati specifičan food name ("Oatmeal with Banana") ili
// ingredient ("chicken") — oba rade.
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export async function getFoodDislikes(clientId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("food_dislikes")
    .eq("id", clientId)
    .maybeSingle();

  if (error) throw new Error(`getFoodDislikes: ${error.message}`);
  return data?.food_dislikes ?? [];
}

export async function addFoodDislike(
  clientId: string,
  dislike: string,
): Promise<string[]> {
  const trimmed = dislike.trim();
  if (!trimmed) return [];
  const current = await getFoodDislikes(clientId);
  if (current.some((d) => d.toLowerCase() === trimmed.toLowerCase())) {
    return current; // already present, no-op
  }
  const next = [...current, trimmed];
  const { error } = await supabase
    .from("profiles")
    .update({ food_dislikes: next })
    .eq("id", clientId);
  if (error) throw new Error(`addFoodDislike: ${error.message}`);
  return next;
}

export async function removeFoodDislike(
  clientId: string,
  dislike: string,
): Promise<string[]> {
  const current = await getFoodDislikes(clientId);
  const next = current.filter(
    (d) => d.toLowerCase() !== dislike.toLowerCase(),
  );
  const { error } = await supabase
    .from("profiles")
    .update({ food_dislikes: next })
    .eq("id", clientId);
  if (error) throw new Error(`removeFoodDislike: ${error.message}`);
  return next;
}
