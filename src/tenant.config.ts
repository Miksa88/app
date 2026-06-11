// ============================================================================
// tenant.config.ts — JEDINI izvor brendinga i feature flagova po tenantu
// ============================================================================
//
// White-label model (PLAN_RADA_WHITELABEL.md, Faza 3): isti kod se klonira po
// treneru — svaki trener dobija svoj Supabase projekat + deploy. Pri kloniranju
// se menja SAMO ovaj fajl. Ništa drugo (index.css, komponente, utils) se NE dira.
//
// - branding: ime appa, logoi, default jezik, kontakt, brend boje
// - features: koje module algoritma tenant koristi ('full' | 'simple' + granularno)
//
// Default vrednosti = trenutna fitbyivana konfiguracija (Ivana, full algoritam).
// ============================================================================

export interface TenantBrandColors {
  /** HSL string bez hsl() wrappera, npr. "325 82% 51%" — format koji koristi index.css */
  primary: string;
  primaryForeground: string;
  secondary: string;
  secondaryForeground: string;
  accent: string;
  accentForeground: string;
  ring: string;
}

export interface TenantFeatures {
  /**
   * 'full'   — kompletni Master Algoritam; granularni toggles ispod se poštuju.
   * 'simple' — gasi SVE algoritamske module (granularni toggles se ignorišu);
   *            app radi kao običan workout/nutrition tracker.
   */
  algorithm: 'full' | 'simple';
  /** Mezociklus banneri (overreach/deload/return-from-break/diet break UI) */
  mesocycles: boolean;
  /** Smart Cut hijerarhija (banneri + pauza signali) */
  smartCut: boolean;
  /** Emergency Refeed (dan punjenja banner) */
  emergencyRefeed: boolean;
  /** Diet Break posle 4 mezociklusa (banner) */
  dietBreak: boolean;
  /** NEAT 10k gate ("hodaj više" banner) */
  neatGate: boolean;
  /** Biofeedback reactive rules §4.3 (pre-workout fatigue dialog, libido/water
   *  retention/DOMS banneri, libido slider u weekly check-inu) */
  biofeedbackRules: boolean;
  /** Metabolic moduli: Hashimoto / PCOS / anemija */
  metabolicModules: boolean;
  /** Cycle tracking (luteal logika) */
  cycleTracking: boolean;
  /** DOMS chronic detection (2+ "Teško" → -1 serija banner) */
  domsDetection: boolean;
  /** HealthKit placeholder UI (Apple Health red u Profile + HealthPage + onboarding korak) */
  healthKit: boolean;
}

export interface TenantConfig {
  /** Puno ime aplikacije — <title>, document.title, share meta */
  appName: string;
  /** Kratko ime (home screen / manifest) */
  appShortName: string;
  /** Putanje do logoa (svetla i tamna tema) */
  logo: {
    light: string;
    dark: string;
  };
  /** Default jezik za nove korisnike (pre nego što sami izaberu) */
  defaultLanguage: 'sr' | 'en';
  /** Kontakt / social — Profile "Zaprati nas" + support */
  contact: {
    email: string;
    instagram: string; // pun URL ili prazno = sakrij red
    tiktok: string;    // pun URL ili prazno = sakrij red
  };
  /** Brend boje — primenjuju se na CSS varijable preko applyTenantTheme() */
  colors: TenantBrandColors;
  features: TenantFeatures;
}

// ============================================================================
// AKTIVNI TENANT — jedino mesto koje se menja po kloniranju
// ============================================================================

export const tenantConfig: TenantConfig = {
  appName: 'fitbyivana',
  appShortName: 'fitbyivana',
  logo: {
    light: '/src/assets/logo-light.webp',
    dark: '/src/assets/logo-dark.webp',
  },
  defaultLanguage: 'en',
  contact: {
    email: '',
    instagram: '',
    tiktok: '',
  },
  // Ekstraktovano iz src/index.css :root — promena ovde NE zahteva diranje CSS-a.
  // Brend varijable su identične u light i dark temi pa je bezbedno setovati na :root.
  colors: {
    primary: '325 82% 51%',
    primaryForeground: '0 0% 100%',
    secondary: '289 63% 42%',
    secondaryForeground: '0 0% 100%',
    accent: '325 82% 51%',
    accentForeground: '0 0% 100%',
    ring: '325 82% 51%',
  },
  features: {
    algorithm: 'full',
    mesocycles: true,
    smartCut: true,
    emergencyRefeed: true,
    dietBreak: true,
    neatGate: true,
    biofeedbackRules: true,
    metabolicModules: true,
    cycleTracking: true,
    domsDetection: true,
    // HealthKit nije realno povezan (placeholder UI) — ali gašenje menja vidljivi
    // UI (Profile red, HealthPage, onboarding korak), pa default ostaje true.
    healthKit: true,
  },
};

// ============================================================================
// Helpers
// ============================================================================

type FeatureKey = Exclude<keyof TenantFeatures, 'algorithm'>;

/** Algoritamski moduli koje 'simple' mod gasi (healthKit NIJE deo algoritma). */
const ALGORITHM_FEATURES: ReadonlySet<FeatureKey> = new Set([
  'mesocycles',
  'smartCut',
  'emergencyRefeed',
  'dietBreak',
  'neatGate',
  'biofeedbackRules',
  'metabolicModules',
  'cycleTracking',
  'domsDetection',
]);

/**
 * Da li je feature uključen za aktivnog tenanta.
 * - 'simple' algoritam → svi algoritamski moduli OFF bez obzira na toggles.
 * - 'full' algoritam  → poštuje granularne toggles.
 * - healthKit je nezavisan od algorithm moda.
 */
export function isFeatureEnabled(key: FeatureKey, config: TenantConfig = tenantConfig): boolean {
  if (config.features.algorithm === 'simple' && ALGORITHM_FEATURES.has(key)) {
    return false;
  }
  return config.features[key];
}

/**
 * Primenjuje tenant brend boje na CSS varijable na :root.
 * Poziva se jednom u main.tsx pre prvog rendera — index.css se NE dira.
 * Inline style na documentElement ima viši prioritet od :root i .dark pravila;
 * brend varijable su identične u obe teme pa ovo ne kvari dark mode.
 */
export function applyTenantTheme(config: TenantConfig = tenantConfig): void {
  const root = document.documentElement;
  const c = config.colors;
  const vars: Record<string, string> = {
    '--primary': c.primary,
    '--primary-foreground': c.primaryForeground,
    '--secondary': c.secondary,
    '--secondary-foreground': c.secondaryForeground,
    '--accent': c.accent,
    '--accent-foreground': c.accentForeground,
    '--ring': c.ring,
    // Sidebar koristi iste brend boje (index.css ih duplira)
    '--sidebar-primary': c.primary,
    '--sidebar-primary-foreground': c.primaryForeground,
    '--sidebar-ring': c.ring,
  };
  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
  document.title = config.appName;
}
