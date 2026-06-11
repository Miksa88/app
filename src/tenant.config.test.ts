// ============================================================================
// tenant.config.test.ts — Faza 3.2: feature flag helper + theme aplikacija
// ============================================================================

import { describe, it, expect } from 'vitest';
import {
  tenantConfig,
  isFeatureEnabled,
  applyTenantTheme,
  type TenantConfig,
} from './tenant.config';

/** Klon default configa sa override-ima — testovi ne diraju živi tenantConfig */
function makeConfig(overrides: Partial<TenantConfig['features']>): TenantConfig {
  return {
    ...tenantConfig,
    features: { ...tenantConfig.features, ...overrides },
  };
}

describe('tenantConfig (default = fitbyivana full)', () => {
  it('default tenant ima full algoritam i sve module uključene', () => {
    expect(tenantConfig.features.algorithm).toBe('full');
    expect(isFeatureEnabled('mesocycles')).toBe(true);
    expect(isFeatureEnabled('smartCut')).toBe(true);
    expect(isFeatureEnabled('emergencyRefeed')).toBe(true);
    expect(isFeatureEnabled('dietBreak')).toBe(true);
    expect(isFeatureEnabled('neatGate')).toBe(true);
    expect(isFeatureEnabled('biofeedbackRules')).toBe(true);
    expect(isFeatureEnabled('metabolicModules')).toBe(true);
    expect(isFeatureEnabled('cycleTracking')).toBe(true);
    expect(isFeatureEnabled('domsDetection')).toBe(true);
    expect(isFeatureEnabled('healthKit')).toBe(true);
  });
});

describe('isFeatureEnabled', () => {
  it("'full' mod poštuje granularne toggles", () => {
    const cfg = makeConfig({ smartCut: false, neatGate: false });
    expect(isFeatureEnabled('smartCut', cfg)).toBe(false);
    expect(isFeatureEnabled('neatGate', cfg)).toBe(false);
    expect(isFeatureEnabled('mesocycles', cfg)).toBe(true);
  });

  it("'simple' mod gasi SVE algoritamske module bez obzira na toggles", () => {
    const cfg = makeConfig({ algorithm: 'simple' });
    expect(isFeatureEnabled('mesocycles', cfg)).toBe(false);
    expect(isFeatureEnabled('smartCut', cfg)).toBe(false);
    expect(isFeatureEnabled('emergencyRefeed', cfg)).toBe(false);
    expect(isFeatureEnabled('dietBreak', cfg)).toBe(false);
    expect(isFeatureEnabled('neatGate', cfg)).toBe(false);
    expect(isFeatureEnabled('biofeedbackRules', cfg)).toBe(false);
    expect(isFeatureEnabled('metabolicModules', cfg)).toBe(false);
    expect(isFeatureEnabled('cycleTracking', cfg)).toBe(false);
    expect(isFeatureEnabled('domsDetection', cfg)).toBe(false);
  });

  it("healthKit je nezavisan od 'simple' moda", () => {
    const cfg = makeConfig({ algorithm: 'simple', healthKit: true });
    expect(isFeatureEnabled('healthKit', cfg)).toBe(true);

    const cfgOff = makeConfig({ algorithm: 'full', healthKit: false });
    expect(isFeatureEnabled('healthKit', cfgOff)).toBe(false);
  });
});

describe('applyTenantTheme', () => {
  it('setuje brend CSS varijable na :root i document.title', () => {
    applyTenantTheme();
    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBe(tenantConfig.colors.primary);
    expect(root.style.getPropertyValue('--secondary')).toBe(tenantConfig.colors.secondary);
    expect(root.style.getPropertyValue('--accent')).toBe(tenantConfig.colors.accent);
    expect(root.style.getPropertyValue('--ring')).toBe(tenantConfig.colors.ring);
    expect(root.style.getPropertyValue('--sidebar-primary')).toBe(tenantConfig.colors.primary);
    expect(document.title).toBe(tenantConfig.appName);
  });

  it('custom boje se primenjuju bez diranja index.css', () => {
    const cfg: TenantConfig = {
      ...tenantConfig,
      appName: 'TestTrener',
      colors: { ...tenantConfig.colors, primary: '200 80% 40%' },
    };
    applyTenantTheme(cfg);
    expect(document.documentElement.style.getPropertyValue('--primary')).toBe('200 80% 40%');
    expect(document.title).toBe('TestTrener');
    // cleanup — vrati default da ne curi u druge testove
    applyTenantTheme();
  });
});
