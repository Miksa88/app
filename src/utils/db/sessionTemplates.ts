// ============================================================================
// sessionTemplates DB helpers
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 3 (Template sistem) + Sekcija 4.3
// ============================================================================
//
// Funkcije za rad sa session_templates tabelom. Glavna je `getActiveTemplate`
// koju onboarding zove kad treba da snapshot-uje template za novu klijentkinju.
//
// DB invarijanta "1 active per position" je enforced kroz partial unique
// index (vidi migration 20260419180200). Ova funkcija samo čita.
// ============================================================================

import type { SessionTemplate, TemplatePosition } from '@/types/training';
import { supabase } from '@/integrations/supabase/client';

interface TemplateRow {
  id: string;
  name: string;
  position: TemplatePosition;
  status: 'active' | 'inactive';
  is_system_default: boolean;
  trainer_id: string | null;
  // SessionSkeleton kao JSONB — pun TS tip se validira u Fazi 2 kroz programGenerator
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  skeleton: any;
  compatible_overlays: SessionTemplate['compatibleOverlays'];
  created_at: string;
  activated_at: string | null;
  deactivated_at: string | null;
}

function rowToTemplate(row: TemplateRow): SessionTemplate {
  return {
    id: row.id,
    name: row.name,
    position: row.position,
    status: row.status,
    isSystemDefault: row.is_system_default,
    trainerId: row.trainer_id,
    skeleton: row.skeleton,
    compatibleOverlays: row.compatible_overlays ?? [],
    createdAt: new Date(row.created_at),
    activatedAt: row.activated_at ? new Date(row.activated_at) : null,
    deactivatedAt: row.deactivated_at ? new Date(row.deactivated_at) : null,
  };
}

// ============================================================================
// getActiveTemplate — bira aktivan template po (position, goalOverlay)
// ============================================================================
//
// Spec 01 §3 (Sistemski default-i): trener pravi 1 aktivan template po
// (pozicija, goal overlay) parovi. GLUTE_FOCUS / FAT_LOSS / TONE imaju
// goal-specific template-e (vidi seed migraciju 20260429*).
//
// Logika izbora:
//   1. Ako je goalOverlay prosleđen — filter compatible_overlays @> [overlay]
//   2. Ako nema match-a, fallback: bilo koji aktivan template za poziciju
//      (npr. "Sistem: Beginner Full Body 3x" sa overlay-ovima
//      {GLUTE_FOCUS,TONE,FAT_LOSS} koji pokriva sve)
//   3. Ako ni to ne postoji → FATAL: sistem integritet narušen
//
// Promene od ranijeg dizajna:
//   - Nije više .maybeSingle() jer može biti više aktivnih po poziciji
//     (po overlay-u). DB constraint je sada (position, overlay[1]) UNIQUE.

export async function getActiveTemplate(
  position: TemplatePosition,
  goalOverlay?: 'GLUTE_FOCUS' | 'TONE' | 'FAT_LOSS',
): Promise<SessionTemplate> {
  const { data: rows, error } = await supabase
    .from('session_templates')
    .select('*')
    .eq('position', position)
    .eq('status', 'active');

  if (error) {
    throw new Error(`getActiveTemplate(${position}) failed: ${error.message}`);
  }

  if (!rows || rows.length === 0) {
    throw new Error(
      `Nijedan aktivan template za poziciju: ${position}. ` +
      `Sistem integritet narušen — proveri seed migracije za sistemske default-e.`,
    );
  }

  // Match 1: ekstaktno overlay match (compatible_overlays sadrži goal)
  if (goalOverlay) {
    const matched = (rows as TemplateRow[]).find((r) => {
      const overlays = (r.compatible_overlays ?? []) as string[];
      return overlays.includes(goalOverlay);
    });
    if (matched) return rowToTemplate(matched);
  }

  // Fallback: prvi aktivan template (legacy generic ili dr.)
  return rowToTemplate(rows[0] as TemplateRow);
}

// ============================================================================
// getTemplateById — load po ID (za snapshot resolve nakon assignTemplateToClient)
// ============================================================================

export async function getTemplateById(
  templateId: string,
): Promise<SessionTemplate | null> {
  const { data, error } = await supabase
    .from('session_templates')
    .select('*')
    .eq('id', templateId)
    .maybeSingle();

  if (error) {
    throw new Error(`getTemplateById(${templateId}) failed: ${error.message}`);
  }

  return data ? rowToTemplate(data as TemplateRow) : null;
}

// ============================================================================
// listInactiveTemplatesForPosition — broji koliko ima u arhivi
// (UI koristi za "arhiva puna" warning pre nego što trener doda 4. inactive)
// ============================================================================

export async function listInactiveTemplatesForPosition(
  position: TemplatePosition,
  trainerId?: string,
): Promise<SessionTemplate[]> {
  let query = supabase
    .from('session_templates')
    .select('*')
    .eq('position', position)
    .eq('status', 'inactive');

  // Ako je trainerId prosledjen, filtriraj samo na njegove custom template-e
  // (sistemske inactive uvek su vidljive svima, ali ne broje se u limit-u)
  if (trainerId) {
    query = query.eq('trainer_id', trainerId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`listInactiveTemplatesForPosition(${position}) failed: ${error.message}`);
  }

  return ((data ?? []) as TemplateRow[]).map(rowToTemplate);
}

// ============================================================================
// assignTemplateToClient — snapshot binding pri završetku onboarding-a
// Spec: 01 Sekcija 5 Korak 2 (Template snapshot)
// ============================================================================

export async function assignTemplateToClient(
  clientId: string,
  template: SessionTemplate,
  macrocycleEndsAt?: Date,
): Promise<void> {
  const { error } = await supabase
    .from('client_template_assignments')
    .upsert({
      client_id: clientId,
      assigned_template_id: template.id,
      assigned_at: new Date().toISOString(),
      position: template.position,
      macrocycle_ends_at: macrocycleEndsAt?.toISOString() ?? null,
    }, { onConflict: 'client_id' });

  if (error) {
    throw new Error(`assignTemplateToClient(${clientId}) failed: ${error.message}`);
  }
}

// ============================================================================
// getClientTemplate — vrati template koji je SNAPSHOT-OVAN za klijentkinju
// (Pravilo 3 iz Sekcije 4.3 — postojeće klijentkinje ostaju na svom snapshot-u
//  čak i ako trener aktivira novi template za poziciju)
// ============================================================================

export async function getClientTemplate(clientId: string): Promise<SessionTemplate | null> {
  const { data: assignment, error: assignErr } = await supabase
    .from('client_template_assignments')
    .select('assigned_template_id')
    .eq('client_id', clientId)
    .maybeSingle();

  if (assignErr) {
    throw new Error(`getClientTemplate(${clientId}) failed: ${assignErr.message}`);
  }

  if (!assignment) return null;

  return getTemplateById(assignment.assigned_template_id);
}
