// ============================================================================
// _shared/cors.ts — CORS whitelist helper za sve Edge Functions
// ============================================================================
//
// Umesto "Access-Control-Allow-Origin": "*" — echo-ujemo Origin header SAMO
// ako je na whitelisti. Whitelist dolazi iz ALLOWED_ORIGINS env var-a
// (comma-separated); ako nije setovan, default je lokalni dev + Capacitor.
//
// Upotreba u funkciji:
//   import { corsHeaders } from "../_shared/cors.ts";
//   const HDRS = corsHeaders(req);            // jednom po request-u
//   const HDRS = corsHeaders(req, "x-cron-secret"); // + extra header
// ============================================================================

declare const Deno: {
  env: { get: (k: string) => string | undefined };
};

const DEFAULT_ORIGINS = [
  "http://localhost:8080",
  "capacitor://localhost",
  "http://localhost",
];

export function getAllowedOrigins(): string[] {
  const raw = Deno.env.get("ALLOWED_ORIGINS");
  if (!raw) return DEFAULT_ORIGINS;
  const list = raw
    .split(",")
    .map((o) => o.trim())
    .filter((o) => o.length > 0);
  return list.length > 0 ? list : DEFAULT_ORIGINS;
}

export function corsHeaders(
  req: Request,
  extraAllowedHeaders?: string,
): Record<string, string> {
  const allowed = getAllowedOrigins();
  const origin = req.headers.get("origin");
  // Echo Origin samo ako je whitelist-ovan; inače prvi sa liste
  // (browser sa ne-whitelist origin-om će dobiti CORS fail — namerno).
  const allowOrigin = origin && allowed.includes(origin) ? origin : allowed[0];

  const allowHeaders =
    "authorization, x-client-info, apikey, content-type" +
    (extraAllowedHeaders ? `, ${extraAllowedHeaders}` : "");

  return {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": allowHeaders,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}
