import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Radial Menu Store
 *
 * Manages user-configurable shortcuts for the mobile radial menu.
 * Persists configuration to localStorage.
 */

// Serializable action config (without functions)
export interface RadialMenuShortcutConfig {
  id: string;
  iconType: 'volume-mute' | 'play-pause' | 'temperature' | 'scene' | 'lock' | 'camera' | 'custom';
  label: string;
  action: {
    type: 'ha-call' | 'navigate' | 'custom';
    // For HA service calls
    domain?: string;
    service?: string;
    entity_id?: string;
    service_data?: Record<string, unknown>;
    // For navigation
    path?: string;
    // For custom actions
    customId?: string;
  };
  disabled?: boolean;
}

export interface RadialMenuState {
  shortcuts: RadialMenuShortcutConfig[];
  maxShortcuts: number;
}

export interface RadialMenuActions {
  setShortcuts: (shortcuts: RadialMenuShortcutConfig[]) => void;
  addShortcut: (shortcut: RadialMenuShortcutConfig) => void;
  removeShortcut: (id: string) => void;
  updateShortcut: (id: string, updates: Partial<RadialMenuShortcutConfig>) => void;
  reorderShortcuts: (startIndex: number, endIndex: number) => void;
  reset: () => void;
}

export type RadialMenuStore = RadialMenuState & RadialMenuActions;

// Default shortcuts (existing hardcoded ones from MobileHeader)
const defaultShortcuts: RadialMenuShortcutConfig[] = [
  {
    id: 'volume-mute',
    iconType: 'volume-mute',
    label: 'Mute',
    action: {
      type: 'ha-call',
      domain: 'media_player',
      service: 'volume_mute',
      entity_id: 'media_player.sonos',
      service_data: { is_volume_muted: true },
    },
  },
  {
    id: 'play-pause',
    iconType: 'play-pause',
    label: 'Play',
    action: {
      type: 'ha-call',
      domain: 'media_player',
      service: 'media_play_pause',
      entity_id: 'media_player.living_room',
    },
  },
  {
    id: 'temperature',
    iconType: 'temperature',
    label: 'Temp',
    action: {
      type: 'custom',
      customId: 'show-temperature',
    },
    disabled: true,
  },
  {
    id: 'scene',
    iconType: 'scene',
    label: 'Scene',
    action: {
      type: 'custom',
      customId: 'activate-scene',
    },
    disabled: true,
  },
  {
    id: 'lock',
    iconType: 'lock',
    label: 'Lock',
    action: {
      type: 'custom',
      customId: 'toggle-lock',
    },
    disabled: true,
  },
  {
    id: 'camera',
    iconType: 'camera',
    label: 'Camera',
    action: {
      type: 'custom',
      customId: 'show-camera',
    },
    disabled: true,
  },
];

// Initial state
const initialState: RadialMenuState = {
  shortcuts: defaultShortcuts,
  maxShortcuts: 8,
};

export const useRadialMenuStore = create<RadialMenuStore>()(
  persist(
    (set) => ({
      ...initialState,

      setShortcuts: (shortcuts: RadialMenuShortcutConfig[]) => {
        set((state) => ({
          shortcuts: shortcuts.slice(0, state.maxShortcuts),
        }));
      },

      addShortcut: (shortcut: RadialMenuShortcutConfig) => {
        set((state) => {
          if (state.shortcuts.length >= state.maxShortcuts) {
            console.warn(`[RadialMenuStore] Cannot add shortcut: max limit (${state.maxShortcuts}) reached`);
            return state;
          }

          // Check for duplicate IDs
          if (state.shortcuts.some((s) => s.id === shortcut.id)) {
            console.warn(`[RadialMenuStore] Shortcut with ID "${shortcut.id}" already exists`);
            return state;
          }

          return {
            shortcuts: [...state.shortcuts, shortcut],
          };
        });
      },

      removeShortcut: (id: string) => {
        set((state) => ({
          shortcuts: state.shortcuts.filter((s) => s.id !== id),
        }));
      },

      updateShortcut: (id: string, updates: Partial<RadialMenuShortcutConfig>) => {
        set((state) => ({
          shortcuts: state.shortcuts.map((s) =>
            s.id === id ? { ...s, ...updates } : s
          ),
        }));
      },

      reorderShortcuts: (startIndex: number, endIndex: number) => {
        set((state) => {
          const shortcuts = [...state.shortcuts];
          const [removed] = shortcuts.splice(startIndex, 1);
          if (removed) {
            shortcuts.splice(endIndex, 0, removed);
          }
          return { shortcuts };
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'frok-radial-menu',
      version: 1,
    }
  )
);
