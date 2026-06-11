import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
} from 'react';

export type LeaveProceed = () => void;

export type NavigationLeaveGuard = {
  hasUnsavedChanges: () => boolean;
  promptDiscard: (onProceed: LeaveProceed) => void;
};

type NavigationLeaveGuardContextValue = {
  setGuard: (guard: NavigationLeaveGuard | null) => void;
  /** Returns true when navigation may proceed immediately. */
  attemptNavigation: (onProceed: LeaveProceed) => boolean;
};

const NavigationLeaveGuardContext =
  createContext<NavigationLeaveGuardContextValue | null>(null);

export function NavigationLeaveGuardProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const guardRef = useRef<NavigationLeaveGuard | null>(null);

  const setGuard = useCallback((guard: NavigationLeaveGuard | null) => {
    guardRef.current = guard;
  }, []);

  const attemptNavigation = useCallback((onProceed: LeaveProceed): boolean => {
    const guard = guardRef.current;
    if (guard?.hasUnsavedChanges()) {
      guard.promptDiscard(onProceed);
      return false;
    }
    return true;
  }, []);

  const value = useMemo(
    () => ({setGuard, attemptNavigation}),
    [setGuard, attemptNavigation],
  );

  return (
    <NavigationLeaveGuardContext.Provider value={value}>
      {children}
    </NavigationLeaveGuardContext.Provider>
  );
}

export function useNavigationLeaveGuard(): NavigationLeaveGuardContextValue {
  const ctx = useContext(NavigationLeaveGuardContext);
  if (!ctx) {
    throw new Error(
      'useNavigationLeaveGuard must be used within NavigationLeaveGuardProvider',
    );
  }
  return ctx;
}

/** No-op guard helpers for screens outside the provider (e.g. auth stack). */
export function useOptionalNavigationLeaveGuard():
  | NavigationLeaveGuardContextValue
  | null {
  return useContext(NavigationLeaveGuardContext);
}
