import { describe, it, expect } from "vitest";
import sr from "@/locales/sr.json";
import en from "@/locales/en.json";

// Parity test: sr.json i en.json moraju imati identičan skup ključeva.
// Ako neko doda prevod samo u jedan fajl, ovaj test pada.
describe("locale key parity", () => {
  const srKeys = Object.keys(sr).sort();
  const enKeys = Object.keys(en).sort();

  it("sr i en imaju identičan skup ključeva", () => {
    const missingInEn = srKeys.filter((k) => !(k in en));
    const missingInSr = enKeys.filter((k) => !(k in sr));
    expect(missingInEn).toEqual([]);
    expect(missingInSr).toEqual([]);
    expect(srKeys).toEqual(enKeys);
  });

  it("nema praznih vrednosti", () => {
    const emptySr = srKeys.filter((k) => !(sr as Record<string, string>)[k]);
    const emptyEn = enKeys.filter((k) => !(en as Record<string, string>)[k]);
    expect(emptySr).toEqual([]);
    expect(emptyEn).toEqual([]);
  });
});
