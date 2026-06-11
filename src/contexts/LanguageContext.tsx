import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { safeStorage } from "@/lib/safeStorage";
import { tenantConfig } from "@/tenant.config";
import sr from "@/locales/sr.json";
import en from "@/locales/en.json";

type Language = "en" | "sr";

// Tipovani ključ izveden iz sr.json — tsc hvata nepostojeće ključeve
// kod internih tipovanih poziva; javni t() ostaje string radi kompatibilnosti
// sa postojećim pozivima kroz celu aplikaciju.
export type TranslationKey = keyof typeof sr;

// Rečnici po jeziku — sadržaj živi u src/locales/*.json
const dictionaries: Record<Language, Record<string, string>> = { en, sr };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: "en",
  setLanguage: () => {},
  t: (key: string) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = safeStorage.getItem("app-language") as Language | null;
    // White-label: default jezik dolazi iz tenant configa (Faza 3.1)
    return saved || tenantConfig.defaultLanguage;
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    safeStorage.setItem("app-language", lang);
  };

  const t = useCallback((key: string): string => {
    // Fallback chain: izabran jezik → engleski → key (samo ako i en nedostaje)
    // Ovo sprečava da user koji je izabrao srpski vidi raw key string
    // kad sr prevod fali — pokazuje engleski kao bezbedan default.
    return dictionaries[language][key] || dictionaries.en[key] || key;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
