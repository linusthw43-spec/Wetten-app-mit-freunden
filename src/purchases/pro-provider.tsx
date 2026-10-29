import 'expo-sqlite/localStorage/install';

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react';

/**
 * Pro-Status. In Phase 3 nur simuliert (Test-Schalter auf der Pro-Seite),
 * damit man "werbefrei" testen kann. Phase 4 ersetzt das durch RevenueCat.
 */
type ProState = {
  isPro: boolean;
  /** Nur für Test-Builds: Pro an/aus schalten. */
  setSimulatedPro: (value: boolean) => void;
};

const STORAGE_KEY = 'wettapp.simulatedPro';
const ProContext = createContext<ProState | null>(null);

function readStored(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function ProProvider({ children }: { children: ReactNode }) {
  const [isPro, setIsPro] = useState(readStored);

  const setSimulatedPro = useCallback((value: boolean) => {
    setIsPro(value);
    try {
      localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
    } catch {
      // Ohne Speicher gilt der Wert nur bis zum Neustart.
    }
  }, []);

  return <ProContext.Provider value={{ isPro, setSimulatedPro }}>{children}</ProContext.Provider>;
}

export function usePro() {
  const ctx = useContext(ProContext);
  if (!ctx) throw new Error('usePro muss innerhalb von <ProProvider> verwendet werden');
  return ctx;
}
