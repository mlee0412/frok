/**
 * Lovelace Component Library - Home Assistant style cards and layouts
 */

// Base components
export { BaseCard } from './BaseCard';
export type { BaseCardProps } from './BaseCard';

// Entity cards
export { LightCard } from './LightCard';
export type { LightEntity, LightCardProps } from './LightCard';

export { SceneCard } from './SceneCard';
export type { SceneEntity, SceneCardProps } from './SceneCard';

export { SwitchCard } from './SwitchCard';
export type { SwitchEntity, SwitchCardProps } from './SwitchCard';

export { ClimateCard } from './ClimateCard';
export type { ClimateEntity, ClimateCardProps } from './ClimateCard';

export { CoverCard } from './CoverCard';
export type { CoverEntity, CoverCardProps } from './CoverCard';

// Specialized widgets
export { TimeCard } from './TimeCard';
export { WeatherCard } from './WeatherCard';
export type { WeatherData, WeatherCardProps } from './WeatherCard';

// Media controls
export { MediaPlayerCard } from './MediaPlayerCard';
export type { MediaPlayerEntity, MediaPlayerCardProps } from './MediaPlayerCard';

export { RemoteControl } from './RemoteControl';
export type { RemoteMode, RemoteAction, RemoteControlProps } from './RemoteControl';

export { RemoteControlEnhanced } from './RemoteControlEnhanced';
export type { RemoteControlEnhancedProps, MediaPlayerData } from './RemoteControlEnhanced';

export { BlindsCard } from './BlindsCard';
export type { BlindsEntity, BlindsCardProps } from './BlindsCard';

export { AreaLightControl } from './AreaLightControl';
export type { AreaLightControlProps } from './AreaLightControl';

export { LightControlModal } from './LightControlModal';
export type { LightControlModalProps } from './LightControlModal';

// Layout components
export { HorizontalStack } from './HorizontalStack';
export type { HorizontalStackProps } from './HorizontalStack';

export { VerticalStack } from './VerticalStack';
export type { VerticalStackProps } from './VerticalStack';

export { GridLayout } from './GridLayout';
export type { GridLayoutProps } from './GridLayout';

// Theme system
export {
  gradients,
  animations,
  getStateGradient,
  getCardStyles,
  iconSizes,
  cardHeights,
} from './theme';
export type { GradientPreset, ThemeGradient } from './theme';
