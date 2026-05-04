// ============================================================================
// useNutritionTemplates — React Query hooks (W-7 wire-up)
// ============================================================================

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import {
  listTrainerNutritionTemplates,
  getNutritionTemplateById,
  upsertNutritionTemplate,
  archiveNutritionTemplate,
  type NutritionTemplateRecord,
  type UpsertNutritionTemplateInput,
} from "@/services/nutritionTemplateService";

export type { NutritionTemplateRecord } from "@/services/nutritionTemplateService";

const KEY = ["nutritionTemplates", "trainer"] as const;

export function useNutritionTemplates() {
  const { user } = useAuth();
  const trainerId = user?.id ?? null;

  return useQuery<NutritionTemplateRecord[], Error>({
    queryKey: [...KEY, trainerId ?? "anon"],
    queryFn: async () => (trainerId ? listTrainerNutritionTemplates(trainerId) : []),
    enabled: !!trainerId,
    staleTime: 30 * 1000,
  });
}

export function useNutritionTemplate(id: string | null | undefined) {
  return useQuery<NutritionTemplateRecord | null, Error>({
    queryKey: ["nutritionTemplates", "byId", id ?? "none"],
    queryFn: async () => (id ? getNutritionTemplateById(id) : null),
    enabled: !!id && id !== "new",
    staleTime: 30 * 1000,
  });
}

export function useUpsertNutritionTemplate() {
  const qc = useQueryClient();
  return useMutation<NutritionTemplateRecord, Error, Omit<UpsertNutritionTemplateInput, "trainerId">>({
    mutationFn: async (input) => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error("Not authenticated");
      return upsertNutritionTemplate({ ...input, trainerId: user.id });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}

export function useArchiveNutritionTemplate() {
  const qc = useQueryClient();
  return useMutation<void, Error, string>({
    mutationFn: archiveNutritionTemplate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
  });
}
