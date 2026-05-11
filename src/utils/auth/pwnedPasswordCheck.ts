// ============================================================================
// pwnedPasswordCheck — client-side HaveIBeenPwned proverera (P2-INFRA-1)
// ============================================================================
//
// Supabase "Prevent use of leaked passwords" je Pro-plan feature. Free plan
// koristi ovaj client-side helper koji pita HIBP "Pwned Passwords v3" API
// preko k-anonymity protokola — server vidi SAMO prvih 5 chars SHA-1 hash-a.
//
// Protocol:
//   1. SHA-1 password klijent-side (Web Crypto API).
//   2. Posalji prvih 5 chars (hex) HIBP API-ju: GET /range/{prefix5}.
//   3. Server vrati listu "SUFFIX:count" parova (svi hash-ovi koji počinju
//      tim prefiksom). Klijent proveri da li sufiks (preostalih 35 chars)
//      postoji u listi.
//
// Privacy: password sam nikad ne napušta browser. Server zna samo 5-char
// prefix → ne može da invertuje, ne može da identifikuje korisnika.
//
// Failure: ako mreza/API otkaze → vraćamo `{ pwned: false, error: ... }`
// (fail-open). UX rationale: ne želimo da blokiramo signup zbog 3rd-party
// outage. Sve ostale provere (length, requirements) i dalje rade.
// ============================================================================

const HIBP_RANGE_URL = "https://api.pwnedpasswords.com/range/";

export interface PwnedPasswordResult {
  /** true ako je password u HIBP DB-u (pwned >= 1). */
  pwned: boolean;
  /** Koliko puta je viđen u curenjima (0 ako nije). */
  occurrences: number;
  /** Ako je network/parse fail, ovde stoji razlog. pwned je tada false. */
  error?: string;
}

async function sha1Hex(input: string): Promise<string> {
  const enc = new TextEncoder();
  const buf = await crypto.subtle.digest("SHA-1", enc.encode(input));
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase();
}

export async function checkPwnedPassword(
  password: string,
): Promise<PwnedPasswordResult> {
  if (!password || password.length === 0) {
    return { pwned: false, occurrences: 0 };
  }

  if (typeof crypto?.subtle?.digest !== "function") {
    return {
      pwned: false,
      occurrences: 0,
      error: "Web Crypto API not available",
    };
  }

  let hashHex: string;
  try {
    hashHex = await sha1Hex(password);
  } catch (err) {
    return {
      pwned: false,
      occurrences: 0,
      error: err instanceof Error ? err.message : "sha1 failed",
    };
  }

  const prefix = hashHex.slice(0, 5);
  const suffix = hashHex.slice(5);

  try {
    const res = await fetch(`${HIBP_RANGE_URL}${prefix}`, {
      headers: { "Add-Padding": "true" },
    });
    if (!res.ok) {
      return {
        pwned: false,
        occurrences: 0,
        error: `HIBP ${res.status}`,
      };
    }
    const text = await res.text();
    const lines = text.split(/\r?\n/);
    for (const line of lines) {
      const [s, count] = line.split(":");
      if (!s) continue;
      if (s.trim().toUpperCase() === suffix) {
        return { pwned: true, occurrences: parseInt(count ?? "0", 10) || 0 };
      }
    }
    return { pwned: false, occurrences: 0 };
  } catch (err) {
    return {
      pwned: false,
      occurrences: 0,
      error: err instanceof Error ? err.message : "fetch failed",
    };
  }
}
