import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Types
export type Theme = 'dark' | 'light' | 'auto';
export type Density = 'comfortable' | 'compact' | 'spacious';

export type UserPreferencesState = {
  theme: Theme;
  density: Density;
  sidebarCollapsed: boolean;
  sidebarWidth: number; // in pixels
  fontSize: number; // relative scale: 0.8 to 1.2
};

export type UserPreferencesActions = {
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  toggleSidebar: () => void;
  setSidebarWidth: (width: number) => void;
  setFontSize: (size: number) => void;
  reset: () => void;
};

export type UserPreferencesStore = UserPreferencesState & UserPreferencesActions;

// Initial state
const initialState: UserPreferencesState = {
  theme: 'dark',
  density: 'comfortable',
  sidebarCollapsed: false,
  sidebarWidth: 280,
  fontSize: 1.0,
};

export const useUserPreferencesStore = create<UserPreferencesStore>()(
  persist(
    (set) => ({
      ...initialState,

      setTheme: (theme: Theme) => {
        set({ theme });
      },

      setDensity: (density: Density) => {
        set({ density });
      },

      setSidebarCollapsed: (collapsed: boolean) => {
        set({ sidebarCollapsed: collapsed });
      },

      toggleSidebar: () => {
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
      },

      setSidebarWidth: (width: number) => {
        // Clamp width between 200 and 400 pixels
        const clampedWidth = Math.max(200, Math.min(400, width));
        set({ sidebarWidth: clampedWidth });
      },

      setFontSize: (size: number) => {
        // Clamp font size between 0.8 and 1.2
        const clampedSize = Math.max(0.8, Math.min(1.2, size));
        set({ fontSize: clampedSize });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'frok-user-preferences',
      version: 1,
    }
  )
);
