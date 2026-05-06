import { createContext, useContext, useState, ReactNode } from "react";

interface HealthContextType {
  healthConnected: boolean;
  setHealthConnected: (v: boolean) => void;
}

const HealthContext = createContext<HealthContextType>({ healthConnected: true, setHealthConnected: () => {} });

export const HealthProvider = ({ children }: { children: ReactNode }) => {
  const [healthConnected, setHealthConnected] = useState(true);
  return (
    <HealthContext.Provider value={{ healthConnected, setHealthConnected }}>
      {children}
    </HealthContext.Provider>
  );
};

export const useHealth = () => useContext(HealthContext);
