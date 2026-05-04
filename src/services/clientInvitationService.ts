// ============================================================================
// clientInvitationService — trener poziva novog klijenta (P0-1)
// ============================================================================

import { supabase } from "@/integrations/supabase/client";

export interface InviteClientInput {
  email: string;
  firstName?: string;
  lastName?: string;
  weight?: number;
  height?: number;
  dateOfBirth?: string;
  primaryGoal?: string;
  jobType?: string;
  workSchedule?: string;
  injuries?: string[];
  allergies?: string[];
  foodDislikes?: string[];
}

export interface InviteClientResult {
  ok: true;
  userId: string;
  email: string;
}

export async function inviteClient(input: InviteClientInput): Promise<InviteClientResult> {
  const { data, error } = await supabase.functions.invoke<InviteClientResult>("invite-client", {
    body: input,
  });
  if (error) throw new Error(`inviteClient: ${error.message}`);
  if (!data || !data.ok) throw new Error("inviteClient: empty response");
  return data;
}
