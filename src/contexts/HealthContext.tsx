import { createContext, useContext, useState, ReactNode } from "react";
import { isFeatureEnabled } from "@/tenant.config";

interface HealthContextType {
  healthConnected: boolean;
  setHealthConnected: (v: boolean) => void;
}

const HealthContext = createContext<HealthContextType>({ healthConnected: true, setHealthConnected: () => {} });

export const HealthProvider = ({ children }: { children: ReactNode }) => {
  // White-label (Faza 3.3): HealthKit je placeholder UI — ako tenant gasi
  // features.healthKit, kontekst startuje disconnected (UI ulazi su sakriveni
  // u Profile + PermissionsScreen). Default flag = true → nula promene.
  const [healthConnected, setHealthConnected] = useState(isFeatureEnabled("healthKit"));
  return (
    <HealthContext.Provider value={{ healthConnected, setHealthConnected }}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => useContext(HealthContext);
