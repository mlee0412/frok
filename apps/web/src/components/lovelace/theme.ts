/**
 * Lovelace Theme System - Gradient colors and neon effects
 * Based on Home Assistant dashboard aesthetic
 */

export type GradientPreset =
  | 'purple-magenta'
  | 'cyan-blue'
  | 'pink-orange'
  | 'cyan-teal'
  | 'blue-purple'
  | 'orange-yellow'
  | 'red-pink'
  | 'green-teal'
  | 'gold-orange'
  | 'dark-purple'
  | 'dark-blue'
  | 'dark-cyan'
  | 'dark-green'
  | 'dark-orange'
  | 'dark-red'
  | 'off-state';

export interface ThemeGradient {
  background: string;
  border: string;
  glow: string;
  textColor: string;
  iconColor: string;
}

/**
 * Gradient presets matching Home Assistant Lovelace aesthetic
 */
export const gradients: Record<GradientPreset, ThemeGradient> = {
  // Active states (bright, glowing)
  'purple-magenta': {
    background: 'linear-gradient(135deg, rgba(139,0,255,0.9), rgba(255,0,255,0.7))',
    border: '2px solid rgba(139,0,255,0.8)',
    glow: '0 0 30px rgba(139,0,255,0.6)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
  'cyan-blue': {
    background: 'linear-gradient(135deg, rgba(0,255,255,0.9), rgba(0,128,255,0.9))',
    border: '2px solid rgba(0,255,255,0.5)',
    glow: '0 0 20px rgba(0,255,255,0.4)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
  'pink-orange': {
    background: 'linear-gradient(135deg, rgba(255,0,128,0.9), rgba(255,128,0,0.9))',
    border: '2px solid rgba(255,0,128,0.5)',
    glow: '0 0 20px rgba(255,0,128,0.4)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
  'cyan-teal': {
    background: 'linear-gradient(135deg, rgba(0,255,200,0.9), rgba(0,200,150,0.7))',
    border: '2px solid rgba(0,255,200,0.8)',
    glow: '0 0 30px rgba(0,255,200,0.6)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
  'blue-purple': {
    background: 'linear-gradient(135deg, rgba(64,0,255,0.9), rgba(128,0,255,0.9))',
    border: '2px solid rgba(64,0,255,0.5)',
    glow: '0 0 20px rgba(64,0,255,0.4)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
  'orange-yellow': {
    background: 'linear-gradient(135deg, rgba(255,180,0,0.8), rgba(255,230,0,0.8))',
    border: '2px solid rgba(255,215,0,0.5)',
    glow: '0 0 25px rgba(255,180,0,0.5)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
  'red-pink': {
    background: 'linear-gradient(135deg, rgba(255,0,64,0.9), rgba(255,64,128,0.9))',
    border: '2px solid rgba(255,0,64,0.5)',
    glow: '0 0 20px rgba(255,0,64,0.4)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
  'green-teal': {
    background: 'linear-gradient(135deg, rgba(0,255,100,0.8), rgba(0,200,80,0.6))',
    border: '1px solid rgba(0,255,100,0.3)',
    glow: '0 0 25px rgba(0,255,100,0.5)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },
  'gold-orange': {
    background: 'linear-gradient(135deg, rgba(255,215,0,0.8), rgba(255,140,0,0.8))',
    border: '2px solid rgba(255,215,0,0.5)',
    glow: '0 4px 20px rgba(255,215,0,0.4)',
    textColor: '#FFFFFF',
    iconColor: '#FFFFFF',
  },

  // Inactive/subtle states
  'dark-purple': {
    background: 'linear-gradient(135deg, rgba(40,0,60,0.7), rgba(20,0,30,0.7))',
    border: '2px solid rgba(139,0,255,0.3)',
    glow: 'none',
    textColor: 'rgba(200,100,255,0.9)',
    iconColor: 'rgba(200,100,255,0.9)',
  },
  'dark-blue': {
    background: 'linear-gradient(135deg, rgba(0,60,100,0.4), rgba(0,30,50,0.4))',
    border: '1px solid rgba(0,200,255,0.3)',
    glow: 'none',
    textColor: 'rgba(0,200,255,0.9)',
    iconColor: 'rgba(0,200,255,0.9)',
  },
  'dark-cyan': {
    background: 'linear-gradient(135deg, rgba(0,60,50,0.7), rgba(0,30,25,0.7))',
    border: '2px solid rgba(0,255,200,0.3)',
    glow: 'none',
    textColor: 'rgba(100,255,200,0.9)',
    iconColor: 'rgba(100,255,200,0.9)',
  },
  'dark-green': {
    background: 'linear-gradient(135deg, rgba(0,80,40,0.4), rgba(0,40,20,0.4))',
    border: '1px solid rgba(0,255,100,0.3)',
    glow: 'none',
    textColor: 'rgba(0,255,100,0.9)',
    iconColor: 'rgba(0,255,100,0.9)',
  },
  'dark-orange': {
    background: 'linear-gradient(135deg, rgba(80,50,0,0.4), rgba(50,30,0,0.4))',
    border: '1px solid rgba(255,215,0,0.3)',
    glow: 'none',
    textColor: 'rgba(255,215,0,0.9)',
    iconColor: 'rgba(255,215,0,0.9)',
  },
  'dark-red': {
    background: 'linear-gradient(135deg, rgba(80,0,40,0.4), rgba(50,0,25,0.4))',
    border: '1px solid rgba(255,20,147,0.3)',
    glow: 'none',
    textColor: 'rgba(255,255,255,0.5)',
    iconColor: 'rgba(255,255,255,0.5)',
  },
  'off-state': {
    background: 'linear-gradient(135deg, rgba(40,40,40,0.5), rgba(20,20,20,0.5))',
    border: '1px solid rgba(255,255,255,0.2)',
    glow: 'none',
    textColor: 'rgba(255,255,255,0.5)',
    iconColor: 'rgba(255,255,255,0.5)',
  },
};

/**
 * CSS animation keyframes
 */
export const animations = {
  pulse: `
    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }
  `,
  spin: `
    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }
  `,
  glow: `
    @keyframes glow {
      0%, 100% { filter: drop-shadow(0 0 8px currentColor); }
      50% { filter: drop-shadow(0 0 16px currentColor); }
    }
  `,
};

/**
 * Get gradient preset based on state
 */
export function getStateGradient(
  entityType: 'light' | 'switch' | 'scene' | 'climate' | 'cover' | 'media',
  state: 'on' | 'off' | string,
  color?: GradientPreset
): ThemeGradient {
  if (state === 'off') {
    return gradients['off-state'];
  }

  // Use custom color if provided
  if (color && gradients[color]) {
    return gradients[color];
  }

  // Default colors by entity type
  const defaults: Record<string, GradientPreset> = {
    light: 'orange-yellow',
    switch: 'cyan-blue',
    scene: 'purple-magenta',
    climate: 'blue-purple',
    cover: 'green-teal',
    media: 'pink-orange',
  };

  return gradients[defaults[entityType] || 'cyan-blue'];
}

/**
 * Generate CSS for card with gradient
 */
export function getCardStyles(gradient: ThemeGradient, isActive: boolean = true): React.CSSProperties {
  return {
    background: gradient.background,
    border: gradient.border,
    boxShadow: isActive ? gradient.glow : 'none',
    color: gradient.textColor,
    transition: 'all 0.3s ease',
    borderRadius: '15px',
  };
}

/**
 * Icon size presets
 */
export const iconSizes = {
  sm: '24px',
  md: '36px',
  lg: '48px',
  xl: '60px',
};

/**
 * Card height presets
 */
export const cardHeights = {
  sm: '55px',
  md: '75px',
  lg: '95px',
  xl: '120px',
};
