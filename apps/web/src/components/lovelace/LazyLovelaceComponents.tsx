'use client';

import dynamic from 'next/dynamic';

// Loading component for lazy loaded components
const LoadingCard = () => (
  <div className="p-4 border border-border rounded-lg bg-surface animate-pulse">
    <div className="h-20 bg-surface/50 rounded" />
  </div>
);

// Lazy load Lovelace components
// Each component is loaded only when needed, reducing initial bundle size

export const LazyLightCard = dynamic(
  () => import('./LightCard').then(mod => ({ default: mod.LightCard })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyClimateCard = dynamic(
  () => import('./ClimateCard').then(mod => ({ default: mod.ClimateCard })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyClimateCardEnhanced = dynamic(
  () => import('./ClimateCardEnhanced').then(mod => ({ default: mod.ClimateCardEnhanced })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazySwitchCard = dynamic(
  () => import('./SwitchCard').then(mod => ({ default: mod.SwitchCard })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyCoverCard = dynamic(
  () => import('./CoverCard').then(mod => ({ default: mod.CoverCard })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyBlindsCard = dynamic(
  () => import('./BlindsCard').then(mod => ({ default: mod.BlindsCard })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyBlindsCardEnhanced = dynamic(
  () => import('./BlindsCardEnhanced').then(mod => ({ default: mod.BlindsCardEnhanced })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyMediaPlayerCard = dynamic(
  () => import('./MediaPlayerCard').then(mod => ({ default: mod.MediaPlayerCard })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyRemoteControl = dynamic(
  () => import('./RemoteControl').then(mod => ({ default: mod.RemoteControl })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyRemoteControlEnhanced = dynamic(
  () => import('./RemoteControlEnhanced').then(mod => ({ default: mod.RemoteControlEnhanced })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazySceneCard = dynamic(
  () => import('./SceneCard').then(mod => ({ default: mod.SceneCard })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyWeatherCard = dynamic(
  () => import('./WeatherCard').then(mod => ({ default: mod.WeatherCard })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyTimeCard = dynamic(
  () => import('./TimeCard').then(mod => ({ default: mod.TimeCard })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

// Layout components
export const LazyGridLayout = dynamic(
  () => import('./GridLayout').then(mod => ({ default: mod.GridLayout })),
  {
    loading: () => <div className="grid gap-4" />,
    ssr: false,
  }
);

export const LazyHorizontalStack = dynamic(
  () => import('./HorizontalStack').then(mod => ({ default: mod.HorizontalStack })),
  {
    loading: () => <div className="flex gap-4" />,
    ssr: false,
  }
);

export const LazyVerticalStack = dynamic(
  () => import('./VerticalStack').then(mod => ({ default: mod.VerticalStack })),
  {
    loading: () => <div className="flex flex-col gap-4" />,
    ssr: false,
  }
);

// Main dashboard components
export const LazyLovelaceDashboard = dynamic(
  () => import('./LovelaceDashboard'),
  {
    loading: () => (
      <div className="p-4 space-y-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    ),
    ssr: false,
  }
);

export const LazyLovelaceDashboardEnhanced = dynamic(
  () => import('./LovelaceDashboardEnhanced'),
  {
    loading: () => (
      <div className="p-4 space-y-4">
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    ),
    ssr: false,
  }
);

// Modal components
export const LazyLightControlModal = dynamic(
  () => import('./LightControlModal').then(mod => ({ default: mod.LightControlModal })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

export const LazyAreaLightControl = dynamic(
  () => import('./AreaLightControl').then(mod => ({ default: mod.AreaLightControl })),
  {
    loading: () => <LoadingCard />,
    ssr: false,
  }
);

/**
 * Helper function to preload a component
 * Use this when you know a component will be needed soon
 */
export const preloadLovelaceComponent = (componentName: keyof typeof componentMap) => {
  const loader = componentMap[componentName];
  if (loader) {
    loader();
  }
};

// Map of component names to their loaders for preloading
const componentMap = {
  LightCard: () => import('./LightCard'),
  ClimateCard: () => import('./ClimateCard'),
  ClimateCardEnhanced: () => import('./ClimateCardEnhanced'),
  SwitchCard: () => import('./SwitchCard'),
  CoverCard: () => import('./CoverCard'),
  BlindsCard: () => import('./BlindsCard'),
  BlindsCardEnhanced: () => import('./BlindsCardEnhanced'),
  MediaPlayerCard: () => import('./MediaPlayerCard'),
  RemoteControl: () => import('./RemoteControl'),
  RemoteControlEnhanced: () => import('./RemoteControlEnhanced'),
  SceneCard: () => import('./SceneCard'),
  WeatherCard: () => import('./WeatherCard'),
  TimeCard: () => import('./TimeCard'),
  GridLayout: () => import('./GridLayout'),
  HorizontalStack: () => import('./HorizontalStack'),
  VerticalStack: () => import('./VerticalStack'),
  LovelaceDashboard: () => import('./LovelaceDashboard'),
  LovelaceDashboardEnhanced: () => import('./LovelaceDashboardEnhanced'),
  LightControlModal: () => import('./LightControlModal'),
  AreaLightControl: () => import('./AreaLightControl'),
} as const;