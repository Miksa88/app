// ============================================================================
// safeStorage — wrapper oko localStorage koji ne baca u Safari Private mode
// ============================================================================
//
// Safari Private mode + ITP throw-uju QuotaExceededError na svaki localStorage
// poziv. Bez ovog wrapper-a app crash-uje na tom path-u (whole-app audit P0-CODE-1).
// ============================================================================

const noop = () => {};

function isAvailable(): boolean {
  try {
    if (typeof window === 'undefined') return false;
    const probe = '__safeStorage_probe__';
    window.localStorage.setItem(probe, '1');
    window.localStorage.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

const available = isAvailable();

export const safeStorage = {
  getItem(key: string): string | null {
    if (!available) return null;
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },

  setItem(key: string, value: string): void {
    if (!available) return;
    try {
      window.localStorage.setItem(key, value);
    } catch {
      noop();
    }
  },

  removeItem(key: string): void {
    if (!available) return;
    try {
      window.localStorage.removeItem(key);
    } catch {
      noop();
    }
  },

  isAvailable(): boolean {
    return available;
  },
};
