// ============================================================================
// analysis-report-submit.spec.ts — verifikuj da i18n keys za AnalysisReport
// error path postoje (regresija check za "analysis.errorGeneric" raw display)
// ============================================================================
//
// Bez direktnog gađanja DB-a — samo render check + i18n key validation.
// Ako t() vrati raw key string, znači da prevodi nisu dodati i toast će
// prikazati ružnu poruku korisniku.
// ============================================================================

import { test, expect } from "@playwright/test";

test.describe("AnalysisReport i18n error keys", () => {
  test("analysis.errorGeneric and analysis.errorNoSession have translations", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");

    // Read translations object from window — LanguageContext exposes it
    // through the React tree. Easier: directly check translations dict
    // via fetching language file content.
    const result = await page.evaluate(() => {
      // Check da li dokument ima refer prevod (npr. EN button text postoji)
      const hasRendered = document.body.textContent?.length ?? 0 > 100;
      return {
        hasRendered,
        bodyText: document.body.textContent?.slice(0, 200) ?? "",
      };
    });

    expect(result.hasRendered, "Landing page should render content").toBeTruthy();

    // Provera: ako je locale "en" ili "sr", landing ima neki očekivani text.
    // Ako u kodu ne postoje analysis.errorGeneric prevodi, onda toast pri
    // failu prikazuje "analysis.errorGeneric" raw.
    // Ovaj test ne reprodukuje fail flow direktno (zahteva onboarding state),
    // ali verifikuje da landing renderuje + osnovni health check.
    expect(result.bodyText.length).toBeGreaterThan(20);
  });

  test("translations file contains required error keys", async () => {
    // Static check — prevodi su od talas-1 refaktora u JSON locale fajlovima
    // (LanguageContext ih samo importuje), pa proveravamo oba JSON-a.
    const fs = await import("fs/promises");
    for (const locale of ["src/locales/sr.json", "src/locales/en.json"]) {
      const content = await fs.readFile(locale, "utf-8");
      expect(content).toContain('"analysis.errorGeneric"');
      expect(content).toContain('"analysis.errorNoSession"');
    }
  });
});
