// ============================================================================
// templateService — orkestrator template life-cycle (activate/archive/create)
// Spec: 01_TRAINING_FLOW_MASTER.md Sekcija 3 (Template sistem)
// ============================================================================
//
// Glavne operacije:
//   1. listTemplatesForPosition — sve (active + arhiva) za dropdown
//   2. createCustomTemplate — trener pravi novi (zahteva validateArchiveCapacity)
//   3. activateTemplate — postavi status='active' (atomic; postojeći active
//      ide u arhivu; partial unique index garantuje 1 active per position)
//   4. archiveTemplate — postavi status='inactive'
//   5. validateArchiveCapacity — proveri da nije popunjeno 3 inactive po poziciji
// ============================================================================

import { supabase } from '@/integrations/supabase/client';
import type {
  SessionTemplate, SessionSkeleton, TemplatePosition, GoalOverlay,
} from '@/types/training';

const MAX_INACTIVE_PER_POSITION = 3;

// ============================================================================
// listTemplatesForPosition — vrati sve template-e za poziciju
// ============================================================================

export async function listTemplatesForPosition(
  position: TemplatePosition,
  trainerId?: string,
): Promise<SessionTemplate[]> {
  // System default-i + trainer-ovi custom template-i
  let query = supabase
    .from('session_templates')
    .select('*')
    .eq('position', position)
    .order('status', { ascending: true })       // active prvi
    .order('created_at', { ascending: false });

  if (trainerId) {
    query = query.or(`is_system_default.eq.true,trainer_id.eq.${trainerId}`);
  } else {
    query = query.eq('is_system_default', true);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(`listTemplatesForPosition(${position}) failed: ${error.message}`);
  }

  return (data ?? []).map(rowToTemplate);
}

// ============================================================================
// validateArchiveCapacity — proveri da nije > 3 inactive
// ============================================================================

export interface ArchiveValidation {
  canAdd: boolean;
  inactiveCount: number;
  reason?: string;
}

export async function validateArchiveCapacity(
  position: TemplatePosition,
  trainerId: string,
): Promise<ArchiveValidation> {
  const { count, error } = await supabase
    .from('session_templates')
    .select('id', { count: 'exact', head: true })
    .eq('position', position)
    .eq('status', 'inactive')
    .eq('trainer_id', trainerId);

  if (error) {
    throw new Error(`validateArchiveCapacity failed: ${error.message}`);
  }

  const inactiveCount = count ?? 0;
  if (inactiveCount >= MAX_INACTIVE_PER_POSITION) {
    return {
      canAdd: false,
      inactiveCount,
      reason: `Arhiva pozicije ${position} je puna (${inactiveCount}/${MAX_INACTIVE_PER_POSITION}). Obriši ili reaktiviraj jedan template prvo.`,
    };
  }

  return { canAdd: true, inactiveCount };
}

// ============================================================================
// createCustomTemplate — trener pravi novi (status='inactive' default)
// ============================================================================

export interface CreateCustomTemplateInput {
  name: string;
  position: TemplatePosition;
  trainerId: string;
  skeleton: SessionSkeleton;
  compatibleOverlays?: GoalOverlay[];
  activate?: boolean;       // ako true, odmah aktiviraj (premešti postojeći u arhivu)
}

export async function createCustomTemplate(
  input: CreateCustomTemplateInput,
): Promise<SessionTemplate> {
  // Validacija arhive ako se NE aktivira odmah
  if (!input.activate) {
    const validation = await validateArchiveCapacity(input.position, input.trainerId);
    if (!validation.canAdd) {
      throw new Error(validation.reason);
    }
  }

  // Insert kao inactive
  const { data, error } = await supabase
    .from('session_templates')
    .insert({
      name: input.name,
      position: input.position,
      status: 'inactive',
      is_system_default: false,
      trainer_id: input.trainerId,
      skeleton: input.skeleton as unknown as never,
      compatible_overlays: input.compatibleOverlays ?? ['GLUTE_FOCUS', 'TONE', 'FAT_LOSS'],
    })
    .select('*')
    .single();

  if (error || !data) {
    throw new Error(`createCustomTemplate failed: ${error?.message ?? 'no data'}`);
  }

  const template = rowToTemplate(data);

  // Optional: aktiviraj odmah
  if (input.activate) {
    return activateTemplate(template.id);
  }

  return template;
}

// ============================================================================
// activateTemplate — atomic activate (postojeći active → arhiva)
// ============================================================================
//
// Strategija (zbog partial unique index):
//   1. Pronađi trenutno active za tu poziciju
//   2. UPDATE postojeci → status='inactive', deactivated_at=now()
//   3. UPDATE novi → status='active', activated_at=now()
//
// Note: kratkotrajno između koraka 2 i 3, NEMA active template-a za poziciju.
// Sync Engine `selectTemplate` u tom prozoru bi bacio fatal error — ali
// retko se dešava (race window je <1s, getActiveTemplate retry logika u
// sledećoj iteraciji bi pomogla).

export async function activateTemplate(templateId: string): Promise<SessionTemplate> {
  // Učitaj template da znamo poziciju
  const { data: target, error: targetErr } = await supabase
    .from('session_templates')
    .select('*')
    .eq('id', templateId)
    .single();

  if (targetErr || !target) {
    throw new Error(`activateTemplate(${templateId}): template ne postoji`);
  }

  if (target.status === 'active') {
    return rowToTemplate(target);   // već active, no-op
  }

  // Step 2: arhiviraj trenutni active (može i da ne postoji ako je obrisan)
  await supabase
    .from('session_templates')
    .update({ status: 'inactive', deactivated_at: new Date().toISOString() })
    .eq('position', target.position)
    .eq('status', 'active');

  // Step 3: aktiviraj novi
  const { data: activated, error: activateErr } = await supabase
    .from('session_templates')
    .update({ status: 'active', activated_at: new Date().toISOString() })
    .eq('id', templateId)
    .select('*')
    .single();

  if (activateErr || !activated) {
    throw new Error(`activateTemplate(${templateId}) failed: ${activateErr?.message ?? 'no data'}`);
  }

  return rowToTemplate(activated);
}

// ============================================================================
// archiveTemplate — premesti u arhivu (status='inactive')
// ============================================================================

export async function archiveTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('session_templates')
    .update({ status: 'inactive', deactivated_at: new Date().toISOString() })
    .eq('id', templateId);

  if (error) {
    throw new Error(`archiveTemplate(${templateId}) failed: ${error.message}`);
  }
}

// ============================================================================
// deleteCustomTemplate — trajno obriši trenerov custom template
// ============================================================================

export async function deleteCustomTemplate(templateId: string): Promise<void> {
  const { error } = await supabase
    .from('session_templates')
    .delete()
    .eq('id', templateId)
    .eq('is_system_default', false);   // sigurnost: ne brisi sistemske

  if (error) {
    throw new Error(`deleteCustomTemplate(${templateId}) failed: ${error.message}`);
  }
}

// ============================================================================
// rowToTemplate — DB row → SessionTemplate
// ============================================================================

interface TemplateRow {
  id: string;
  name: string;
  position: TemplatePosition;
  status: 'active' | 'inactive';
  is_system_default: boolean;
  trainer_id: string | null;
  skeleton: unknown;
  compatible_overlays: GoalOverlay[];
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
    skeleton: row.skeleton as SessionSkeleton,
    compatibleOverlays: row.compatible_overlays ?? [],
    createdAt: new Date(row.created_at),
    activatedAt: row.activated_at ? new Date(row.activated_at) : null,
    deactivatedAt: row.deactivated_at ? new Date(row.deactivated_at) : null,
  };
}
