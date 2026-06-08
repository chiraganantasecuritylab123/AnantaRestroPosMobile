import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

type AppMenuContextValue = {
  openMenu: () => void;
  closeMenu: () => void;
  menuVisible: boolean;
};

const AppMenuContext = createContext<AppMenuContextValue | null>(null);

export function AppMenuProvider({children}: {children: React.ReactNode}) {
  const [menuVisible, setMenuVisible] = useState(false);

  const openMenu = useCallback(() => setMenuVisible(true), []);
  const closeMenu = useCallback(() => setMenuVisible(false), []);

  const value = useMemo(
    () => ({openMenu, closeMenu, menuVisible}),
    [openMenu, closeMenu, menuVisible],
  );

  return (
    <AppMenuContext.Provider value={value}>{children}</AppMenuContext.Provider>
  );
}

export function useAppMenu(): AppMenuContextValue {
  const ctx = useContext(AppMenuContext);
  if (!ctx) {
    throw new Error('useAppMenu must be used within AppMenuProvider');
  }
  return ctx;
}
