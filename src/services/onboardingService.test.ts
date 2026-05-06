import { describe, it, expect, vi, beforeEach } from 'vitest';
import { completeOnboarding } from './onboardingService';
import type { UserStatus } from '@/types/userStatus';
import type { SessionTemplate } from '@/types/training';

// ============================================================================
// Mocks — sve DB i template helper-i
// ============================================================================
//
// onboardingService je orkestrator — testiramo njegovu logiku, ne stvarni DB
// ili template lookup. Svi peer-i mock-ovani.

const mockProfileUpdate = vi.fn(() => Promise.resolve({ error: null }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      update: vi.fn(() => ({
        eq: mockProfileUpdate,
      })),
    })),
  },
}));

const mockSavedStatus = vi.fn();

vi.mock('@/utils/db/userStatus', async () => {
  const actual = await vi.importActual<typeof import('@/utils/db/userStatus')>('@/utils/db/userStatus');
  return {
    ...actual,
    initUserStatus: vi.fn(async (input) => makeFreshStatus(input)),
    saveUserStatus: vi.fn(async (status) => { mockSavedStatus(status); }),
  };
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockGetActiveTemplate = vi.fn<(...args: any[]) => any>();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockAssignTemplate = vi.fn<(...args: any[]) => Promise<void>>(() => Promise.resolve());

vi.mock('@/utils/db/sessionTemplates', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getActiveTemplate: (position: any) => mockGetActiveTemplate(position),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  assignTemplateToClient: (clientId: any, template: any) => mockAssignTemplate(clientId, template),
  getTemplateById: vi.fn(),
  listInactiveTemplatesForPosition: vi.fn(),
  getClientTemplate: vi.fn(),
}));

// ============================================================================
// Fixture helpers
// ============================================================================

function makeFreshStatus(input: { clientId: string; weight: number; height: number; age: number }): UserStatus {
  return {
    clientId: input.clientId,
    lastUpdatedAt: new Date(),
    bio: {
      age: input.age,
      currentWeightMA5: input.weight,
      weightTrend: 'insufficient_data',
      weeklyWeightDelta: 0,
      cycleDay: null, cyclePhase: null, weightDataReliable: true,
      recoveryMultiplier: 1.0,
      sleepLast7DaysAvg: 7, stressLast7DaysAvg: 3, hydrationLast7DaysAvgMl: input.weight * 35,
    },
    training: {
      activeTemplateId: '', position: 'beginner_3', daysPerWeek: 3,
      queue: {
        clientId: input.clientId, mesocycleIndex: 1, templateId: '', sessions: [],
        sessionPointer: 0, currentMicrocycleIndex: 0, swapUsedThisMicrocycle: false,
        partitionLastSeen: {}, returnFromBreakCountdown: {},
        createdAt: new Date(), completedAt: null,
      },
      sessionPointer: 0, nextSessionId: '', nextSessionPartition: 'FullBody',
      partitionLastSeen: {}, isInDeload: false, isInReturnFromBreak: false,
      currentMesocycleIndex: 1, currentMicrocycleIndex: 0, activePauseEvent: null,
    },
    nutrition: {
      bmr: 1400, tdee: 2000, currentCalorieTarget: 1600, targetMode: 'maintenance',
      macros: { proteinG: 130, carbsG: 180, fatG: 60 },
      metabolicFilter: [], isMetabolicNoiseTriggered: false,
      hydrationTargetMl: input.weight * 35, hydrationTodayMl: 0,
      measurementWeekActive: true, measurementWeekDay: 1,
      daysSincePlanChange: 0, activeRefeedDay: false,
    },
    redFlags: {
      skipCount7d: 0, metabolicNoiseDays7d: 0, energyBelowThreshold7d: 0,
      consecutiveFailedWorkouts: 0, daysSinceLastWeeklyCheckIn: 0, isAtRisk: false,
    },
    clientOverrides: [],
  };
}

function makeMockTemplate(): SessionTemplate {
  return {
    id: 'tpl-mock',
    name: 'Mock template',
    position: 'beginner_3',
    status: 'active',
    isSystemDefault: true,
    trainerId: null,
    skeleton: {
      id: 'BEG_FB_3', level: 'beginner', daysPerWeek: 3, name: 'Beg FB 3',
      periodizationType: 'linear',
      days: [
        { dayIndex: 1, dayType: 'FullBody', defaultRepRangeZone: 'hypertrophy', targetRIR: 2, exerciseSlots: [] },
        { dayIndex: 2, dayType: 'Rest', defaultRepRangeZone: 'hypertrophy', targetRIR: 2, exerciseSlots: [] },
        { dayIndex: 3, dayType: 'FullBody', defaultRepRangeZone: 'hypertrophy', targetRIR: 2, exerciseSlots: [] },
        { dayIndex: 4, dayType: 'Rest', defaultRepRangeZone: 'hypertrophy', targetRIR: 2, exerciseSlots: [] },
        { dayIndex: 5, dayType: 'FullBody', defaultRepRangeZone: 'hypertrophy', targetRIR: 2, exerciseSlots: [] },
        { dayIndex: 6, dayType: 'Rest', defaultRepRangeZone: 'hypertrophy', targetRIR: 2, exerciseSlots: [] },
        { dayIndex: 7, dayType: 'Rest', defaultRepRangeZone: 'hypertrophy', targetRIR: 2, exerciseSlots: [] },
      ],
    },
    compatibleOverlays: ['GLUTE_FOCUS', 'TONE', 'FAT_LOSS'],
    createdAt: new Date(),
    activatedAt: new Date(),
    deactivatedAt: null,
  };
}

const baseInput = {
  clientId: 'test-client',
  firstName: 'Marija',
  dateOfBirth: '1996-04-15',
  weightKg: 65,
  heightCm: 168,
  experienceLevel: 'beginner' as const,
  trainingDays: 3 as const,
  primaryGoal: 'fat_loss' as const,
  metabolicConditions: [],
  injuries: [],
  allergies: [],
  sleepHoursAvg: 7,
  stressLevel: 3 as const,
  cycleTrackingEnabled: false,
};

// ============================================================================
// Tests
// ============================================================================

describe('completeOnboarding', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProfileUpdate.mockReturnValue(Promise.resolve({ error: null }));
    mockGetActiveTemplate.mockReset();
  });

  it('full happy path — template postoji, queue se generise, status se save-uje', async () => {
    mockGetActiveTemplate.mockResolvedValueOnce(makeMockTemplate());

    const result = await completeOnboarding(baseInput);

    expect(result.templateAssigned).toBe(true);
    expect(result.warnings).toEqual([]);
    expect(result.status.training.activeTemplateId).toBe('tpl-mock');
    expect(result.status.training.queue.sessions.length).toBeGreaterThan(0);
    expect(result.status.training.nextSessionId).toBeTruthy();
    expect(mockAssignTemplate).toHaveBeenCalledOnce();
    expect(mockSavedStatus).toHaveBeenCalledOnce();
  });

  it('graceful fallback ako nema active template-a', async () => {
    mockGetActiveTemplate.mockRejectedValueOnce(new Error('Nijedan aktivan template za poziciju: beginner_3'));

    const result = await completeOnboarding(baseInput);

    expect(result.templateAssigned).toBe(false);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toMatch(/Nema active template-a/);
    // I dalje save-uje status — klijentkinja moze nastaviti onboarding
    expect(mockSavedStatus).toHaveBeenCalledOnce();
  });

  it('cycle tracker enabled — postavlja cyclePhase u status', async () => {
    mockGetActiveTemplate.mockResolvedValueOnce(makeMockTemplate());

    // Datum 20 dana pre danas → luteal faza
    const twentyDaysAgo = new Date(Date.now() - 20 * 86400_000);
    const result = await completeOnboarding({
      ...baseInput,
      cycleTrackingEnabled: true,
      lastPeriodStart: twentyDaysAgo.toISOString().slice(0, 10),
    });

    expect(result.status.bio.cyclePhase).toBe('luteal');
    expect(result.status.bio.cycleDay).toBeGreaterThanOrEqual(15);
  });

  it('IR profil — postavlja metabolicFilter i sync rules ce ga koristiti', async () => {
    mockGetActiveTemplate.mockResolvedValueOnce(makeMockTemplate());

    const result = await completeOnboarding({
      ...baseInput,
      metabolicConditions: ['insulin_resistance'],
    });

    expect(result.status.nutrition.metabolicFilter).toContain('insulin_resistance');
    // Carbs ne smeju da budu vise od 23% kcal (Spec 02 Sekcija 4.5)
    const carbsKcal = result.status.nutrition.macros.carbsG * 4;
    expect(carbsKcal / result.status.nutrition.currentCalorieTarget).toBeLessThanOrEqual(0.235);
  });

  it('beginner+3 dana → position = beginner_3', async () => {
    mockGetActiveTemplate.mockResolvedValueOnce(makeMockTemplate());

    const result = await completeOnboarding(baseInput);
    expect(result.status.training.position).toBe('beginner_3');
    expect(mockGetActiveTemplate).toHaveBeenCalledWith('beginner_3');
  });

  it('intermediate+5 dana → position = intermediate_5', async () => {
    mockGetActiveTemplate.mockResolvedValueOnce(makeMockTemplate());

    await completeOnboarding({
      ...baseInput,
      experienceLevel: 'intermediate',
      trainingDays: 5,
    });

    expect(mockGetActiveTemplate).toHaveBeenCalledWith('intermediate_5');
  });

  it('throw ako profile update padne', async () => {
    mockProfileUpdate.mockReturnValueOnce(Promise.resolve({ error: { message: 'RLS denied' } }));

    await expect(completeOnboarding(baseInput)).rejects.toThrow(/profile update failed/);
  });
});
