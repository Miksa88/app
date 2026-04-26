// ============================================================================
// trainerService — agregacioni queryji za trener dashboard
// Spec: 03_INTEGRATION_LAYER.md Sekcija 6.2 (Trener Dashboard)
// ============================================================================
//
// Trener vidi: at-risk klijentkinje, deload counter, luteal phase counter.
// Svi queryji koriste GENERATED kolone iz user_status tabele (is_at_risk,
// is_in_deload, cycle_phase) — partial indexi su tu pa upiti su brzi.
//
// RLS: trener mora imati profiles.role = 'trainer' da vidi tudje statuse
// (vidi user_status policy iz Faze 1 migracije).
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import type { UserStatus } from '@/types/userStatus';
import type { NutritionCyclePhase } from '@/types/nutrition';

// ============================================================================
// Types
// ============================================================================

export interface AtRiskClientSummary {
  clientId: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  redFlags: UserStatus['redFlags'];
  primaryRedFlag: string;          // human-readable opis najgore stavke
}

export interface TrainerDashboardCounters {
  totalClients: number;
  atRiskCount: number;
  deloadCount: number;
  cyclePhaseCounts: Record<NutritionCyclePhase, number>;
  averageRecoveryMultiplier: number | null;
}

// ============================================================================
// getAtRiskClients — lista klijentkinja za RedFlagsSection
// ============================================================================

export async function getAtRiskClients(): Promise<AtRiskClientSummary[]> {
  const { data, error } = await supabase
    .from('user_status')
    .select(`
      client_id,
      status_json,
      profiles!inner ( first_name, last_name, avatar_url )
    `)
    .eq('is_at_risk', true)
    .order('last_updated_at', { ascending: false });

  if (error) {
    throw new Error(`getAtRiskClients failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as AtRiskRow[]).map(row => {
    const status = row.status_json as unknown as UserStatus;
    return {
      clientId: row.client_id,
      firstName: row.profiles.first_name,
      lastName: row.profiles.last_name,
      avatarUrl: row.profiles.avatar_url,
      redFlags: status.redFlags,
      primaryRedFlag: derivePrimaryRedFlag(status.redFlags),
    };
  });
}

interface AtRiskRow {
  client_id: string;
  status_json: unknown;
  profiles: {
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
  };
}

// ============================================================================
// getAllClients — pun spisak klijentkinja za TrainerClients/Dashboard listu
// ============================================================================
//
// Vraća sve profile sa role='client' + njihov UserStatus snapshot ako postoji.
// Single trainer beta arhitektura — nema explicit trainer→client mapping još,
// trener vidi sve klijente u sistemu.
// ============================================================================

export interface ClientListItem {
  clientId: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  isAtRisk: boolean;
  isInDeload: boolean;
  cyclePhase: NutritionCyclePhase | null;
  lastUpdatedAt: string | null;
}

interface ClientListRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  avatar_url: string | null;
  user_status:
    | {
        is_at_risk: boolean | null;
        is_in_deload: boolean | null;
        cycle_phase: NutritionCyclePhase | null;
        last_updated_at: string | null;
      }
    | { is_at_risk: boolean | null; is_in_deload: boolean | null; cycle_phase: NutritionCyclePhase | null; last_updated_at: string | null }[]
    | null;
}

export async function getAllClients(): Promise<ClientListItem[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select(`
      id,
      first_name,
      last_name,
      email,
      avatar_url,
      user_status ( is_at_risk, is_in_deload, cycle_phase, last_updated_at )
    `)
    .eq('role', 'client')
    .order('first_name', { ascending: true, nullsFirst: false });

  if (error) {
    throw new Error(`getAllClients failed: ${error.message}`);
  }

  return ((data ?? []) as unknown as ClientListRow[]).map(row => {
    const us = Array.isArray(row.user_status) ? row.user_status[0] ?? null : row.user_status;
    return {
      clientId: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      email: row.email,
      avatarUrl: row.avatar_url,
      isAtRisk: us?.is_at_risk ?? false,
      isInDeload: us?.is_in_deload ?? false,
      cyclePhase: us?.cycle_phase ?? null,
      lastUpdatedAt: us?.last_updated_at ?? null,
    };
  });
}

// ============================================================================
// getDashboardCounters — agregat brojevi
// ============================================================================

export async function getDashboardCounters(): Promise<TrainerDashboardCounters> {
  // Paralelni queries (svi su brzi zbog partial indexa)
  const [totalRes, atRiskRes, deloadRes, cycleRes] = await Promise.all([
    supabase.from('user_status').select('client_id', { count: 'exact', head: true }),
    supabase.from('user_status').select('client_id', { count: 'exact', head: true }).eq('is_at_risk', true),
    supabase.from('user_status').select('client_id', { count: 'exact', head: true }).eq('is_in_deload', true),
    supabase.from('user_status').select('cycle_phase').not('cycle_phase', 'is', null),
  ]);

  const cyclePhaseCounts: Record<NutritionCyclePhase, number> = {
    menstrual: 0, follicular: 0, ovulation: 0, luteal: 0,
  };
  for (const row of cycleRes.data ?? []) {
    const phase = row.cycle_phase as NutritionCyclePhase | null;
    if (phase && phase in cyclePhaseCounts) cyclePhaseCounts[phase] += 1;
  }

  return {
    totalClients: totalRes.count ?? 0,
    atRiskCount: atRiskRes.count ?? 0,
    deloadCount: deloadRes.count ?? 0,
    cyclePhaseCounts,
    averageRecoveryMultiplier: null,  // TODO Faza 5 (avg iz status_json je skup query)
  };
}

// ============================================================================
// getClientStatus — pun UserStatus za ClientProfile detaljnu sekciju
// ============================================================================

export async function getClientStatusByTrainer(clientId: string): Promise<UserStatus | null> {
  const { data, error } = await supabase
    .from('user_status')
    .select('status_json')
    .eq('client_id', clientId)
    .maybeSingle();

  if (error) {
    throw new Error(`getClientStatusByTrainer(${clientId}) failed: ${error.message}`);
  }

  return data ? (data.status_json as unknown as UserStatus) : null;
}

// ============================================================================
// derivePrimaryRedFlag — pretvori redFlags u human-readable opis
// ============================================================================

function derivePrimaryRedFlag(flags: UserStatus['redFlags']): string {
  if (flags.metabolicNoiseDays7d >= 2) {
    return `Metabolička buka ${flags.metabolicNoiseDays7d} dana`;
  }
  if (flags.consecutiveFailedWorkouts >= 2) {
    return `${flags.consecutiveFailedWorkouts} uzastopna failovana treninga`;
  }
  if (flags.energyBelowThreshold7d >= 3) {
    return `Niska energija ${flags.energyBelowThreshold7d} dana`;
  }
  if (flags.skipCount7d > 3) {
    return `${flags.skipCount7d} preskočenih obroka u 7 dana`;
  }
  if (flags.daysSinceLastWeeklyCheckIn > 10) {
    return `${flags.daysSinceLastWeeklyCheckIn} dana bez weekly check-in-a`;
  }
  return 'Treba pažnju';
}
