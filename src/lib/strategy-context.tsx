import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import { usePersistentState } from './usePersistentState';
import {
  getStrategy,
  normalizeStrategyId,
  type Core6Strategy,
  type StrategyId,
} from './core6-strategies';

/**
 * The teacher's current Core 6 strategy spotlight, shared by every coaching tool. The choice is
 * not personal data (a week number), so it is persisted on the device like the class context.
 */
const STORAGE_KEY = 'tmb.core6.strategy.v1';

type StrategyContextValue = {
  /** '' means no spotlight (general dialogic coaching). */
  activeStrategy: StrategyId | '';
  strategy: Core6Strategy | null;
  setActiveStrategy: (id: string) => void;
};

const StrategyContext = createContext<StrategyContextValue | null>(null);

export function StrategyProvider({ children }: { children: ReactNode }) {
  const [stored, setStored] = usePersistentState<string>(STORAGE_KEY, '');
  const activeStrategy = normalizeStrategyId(stored);
  const strategy = getStrategy(activeStrategy);
  const setActiveStrategy = useCallback((id: string) => setStored(normalizeStrategyId(id)), [setStored]);

  const value = useMemo<StrategyContextValue>(
    () => ({ activeStrategy, strategy, setActiveStrategy }),
    [activeStrategy, strategy, setActiveStrategy],
  );

  return <StrategyContext.Provider value={value}>{children}</StrategyContext.Provider>;
}

export function useActiveStrategy(): StrategyContextValue {
  const ctx = useContext(StrategyContext);
  if (!ctx) throw new Error('useActiveStrategy must be used within StrategyProvider');
  return ctx;
}
