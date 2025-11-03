'use client';

import React, { useState } from 'react';
import type { Device } from '@frok/clients';
import {
  toggle,
  sceneTurnOn,
  coverOpen,
  coverClose,
  coverStop,
  mediaVolumeSet,
  mediaVolumeMute,
  mediaPlayPause,
  mediaNext,
  mediaPrevious,
  remoteSendCommand,
  callHAService,
} from '@frok/clients';
import {
  LightCard,
  SceneCard,
  SwitchCard,
  ClimateCard,
  CoverCard,
  MediaPlayerCard,
  RemoteControl,
  TimeCard,
  HorizontalStack,
  VerticalStack,
  GridLayout,
  type LightEntity,
  type SceneEntity,
  type SwitchEntity,
  type ClimateEntity,
  type CoverEntity,
  type MediaPlayerEntity,
  type RemoteMode,
  type RemoteAction,
} from './index';

export interface LovelaceDashboardProps {
  initialDevices: Device[];
  haOk: boolean;
  haDetail?: string;
}

export default function LovelaceDashboard({ initialDevices, haOk, haDetail }: LovelaceDashboardProps) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [remoteMode, setRemoteMode] = useState<RemoteMode>('touchpad');

  // Refresh devices
  const refresh = async () => {
    try {
      const r = await fetch('/api/devices', { cache: 'no-store' });
      if (r.ok) {
        const j = await r.json();
        if (Array.isArray(j)) {
          setDevices(j);
        }
      }
    } catch {}
  };

  // Convert Device to entity types
  const convertToLight = (d: Device): LightEntity => ({
    id: d.id,
    name: d.name,
    state: d.state === 'on' ? 'on' : 'off',
    type: 'light',
    attrs: d.attrs as LightEntity['attrs'],
  });

  const convertToSwitch = (d: Device): SwitchEntity => ({
    id: d.id,
    name: d.name,
    state: d.state === 'on' ? 'on' : 'off',
    type: 'switch',
  });

  const convertToClimate = (d: Device): ClimateEntity => ({
    id: d.id,
    name: d.name,
    state: d.state || 'off',
    type: 'climate',
    attrs: d.attrs as ClimateEntity['attrs'],
  });

  const convertToCover = (d: Device): CoverEntity => ({
    id: d.id,
    name: d.name,
    state: (d.state || 'closed') as CoverEntity['state'],
    type: 'cover',
    attrs: d.attrs as CoverEntity['attrs'],
  });

  const convertToMediaPlayer = (d: Device): MediaPlayerEntity => ({
    id: d.id,
    name: d.name,
    state: (d.state || 'idle') as MediaPlayerEntity['state'],
    type: 'media_player',
    attrs: d.attrs as MediaPlayerEntity['attrs'],
  });

  // Group devices by type and area
  const lights = devices.filter((d) => d.type === 'light');
  const switches = devices.filter((d) => d.type === 'switch');
  const climates = devices.filter((d) => d.type === 'climate');
  const covers = devices.filter((d) => d.type === 'cover');
  const mediaPlayers = devices.filter((d) => d.type === 'media_player');

  // Handlers
  const handleLightToggle = async (entityId: string) => {
    await toggle(entityId, 'light');
    await refresh();
  };

  const handleSwitchToggle = async (entityId: string) => {
    await toggle(entityId, 'switch');
    await refresh();
  };

  const handleSceneActivate = async (sceneId: string) => {
    await sceneTurnOn(sceneId);
    await refresh();
  };

  const handleCoverOpen = async (entityId: string) => {
    await coverOpen(entityId);
    await refresh();
  };

  const handleCoverClose = async (entityId: string) => {
    await coverClose(entityId);
    await refresh();
  };

  const handleCoverStop = async (entityId: string) => {
    await coverStop(entityId);
    await refresh();
  };

  // Media player handlers
  const handleVolumeSet = async (entityId: string, volume: number) => {
    await mediaVolumeSet(entityId, volume);
    await refresh();
  };

  const handleVolumeMute = async (entityId: string, muted: boolean) => {
    await mediaVolumeMute(entityId, muted);
    await refresh();
  };

  const handleMediaPlayPause = async (entityId: string) => {
    await mediaPlayPause(entityId);
    await refresh();
  };

  const handleMediaNext = async (entityId: string) => {
    await mediaNext(entityId);
    await refresh();
  };

  const handleMediaPrevious = async (entityId: string) => {
    await mediaPrevious(entityId);
    await refresh();
  };

  // Remote control handlers
  const handleRemoteCommand = async (remoteId: string, command: string) => {
    await remoteSendCommand(remoteId, command);
  };

  const handleServiceCall = async (entityId: string, service: string, data?: Record<string, unknown>) => {
    const parts = service.split('.');
    if (parts.length === 2 && parts[0] && parts[1]) {
      await callHAService({
        domain: parts[0],
        service: parts[1],
        entity_id: entityId,
        data,
      });
    }
  };

  // Scene entities (hardcoded based on user's dashboard)
  const sceneEntities: SceneEntity[] = [
    { id: 'scene.bedroom_evening', name: 'Evening', type: 'scene', icon: '🌙' },
    { id: 'scene.bedroom_relax', name: 'Relax', type: 'scene', icon: '🛋️' },
    { id: 'scene.bedroom_rest', name: 'Rest', type: 'scene', icon: '😴' },
  ];

  // Hue Sync Box custom actions for remote control
  const hueSyncBoxActions: RemoteAction[] = [
    {
      id: 'hue_sync',
      icon: '🔄',
      label: 'Sync',
      entityId: 'switch.sync_box_light_sync',
      service: 'switch.toggle',
    },
    {
      id: 'hue_power',
      icon: '⚡',
      label: 'Power',
      entityId: 'switch.sync_box_power',
      service: 'switch.toggle',
    },
    {
      id: 'hue_dv',
      icon: '🎬',
      label: 'Dolby',
      entityId: 'switch.sync_box_dolby_vision_compatibility',
      service: 'switch.toggle',
    },
    {
      id: 'hue_input',
      icon: '📺',
      label: 'HDMI',
      entityId: 'select.sync_box_hdmi_input',
      service: 'select.select_next',
    },
    {
      id: 'hue_mode',
      icon: '🎮',
      label: 'Mode',
      entityId: 'select.sync_box_sync_mode',
      service: 'select.select_next',
    },
    {
      id: 'hue_intensity',
      icon: '✨',
      label: 'Intensity',
      entityId: 'select.sync_box_intensity',
      service: 'select.select_next',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header Status */}
      <div className="flex items-center gap-3">
        <div className="font-medium">Home Assistant</div>
        <span
          className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 border ${
            haOk
              ? 'border-success/40 text-success bg-success/10'
              : 'border-danger/40 text-danger bg-danger/10'
          }`}
        >
          {haOk ? 'OK' : 'Fail'}
        </span>
        {haDetail && <span className="text-sm text-foreground/60">{haDetail}</span>}
      </div>

      {/* Time + Scenes Row */}
      <HorizontalStack>
        <div className="flex-1">
          <TimeCard />
        </div>
        <div className="flex-1">
          <VerticalStack gap="8px">
            {sceneEntities.slice(0, 3).map((scene) => (
              <SceneCard
                key={scene.id}
                entity={scene}
                gradient={scene.name === 'Evening' ? 'purple-magenta' : scene.name === 'Relax' ? 'cyan-blue' : 'pink-orange'}
                height="60px"
                onActivate={handleSceneActivate}
              />
            ))}
          </VerticalStack>
        </div>
      </HorizontalStack>

      {/* Climate Control */}
      {climates.length > 0 && (
        <HorizontalStack>
          {climates.slice(0, 2).map((device) => (
            <ClimateCard key={device.id} entity={convertToClimate(device)} />
          ))}
        </HorizontalStack>
      )}

      {/* Lights Grid */}
      {lights.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-cyan-400">💡 Lights</h3>
          <GridLayout columns={2} gap="12px">
            {lights.slice(0, 8).map((device) => (
              <LightCard
                key={device.id}
                entity={convertToLight(device)}
                onToggle={handleLightToggle}
              />
            ))}
          </GridLayout>
        </div>
      )}

      {/* Switches Grid */}
      {switches.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-orange-400">🔌 Switches</h3>
          <GridLayout columns={2} gap="12px">
            {switches.map((device) => (
              <SwitchCard
                key={device.id}
                entity={convertToSwitch(device)}
                gradient={device.id.includes('bathroom') ? 'cyan-blue' : 'orange-yellow'}
                onToggle={handleSwitchToggle}
              />
            ))}
          </GridLayout>
        </div>
      )}

      {/* Covers */}
      {covers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-green-400">🪟 Covers</h3>
          <GridLayout columns={2} gap="12px">
            {covers.map((device) => (
              <CoverCard
                key={device.id}
                entity={convertToCover(device)}
                height="140px"
                onOpen={handleCoverOpen}
                onClose={handleCoverClose}
                onStop={handleCoverStop}
              />
            ))}
          </GridLayout>
        </div>
      )}

      {/* Media Players */}
      {mediaPlayers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-pink-400">🎵 Media</h3>
          {mediaPlayers.slice(0, 2).map((device) => (
            <div key={device.id} className="mb-4">
              <MediaPlayerCard
                entity={convertToMediaPlayer(device)}
                onVolumeSet={handleVolumeSet}
                onVolumeMute={handleVolumeMute}
                onPlayPause={handleMediaPlayPause}
                onNext={handleMediaNext}
                onPrevious={handleMediaPrevious}
              />
            </div>
          ))}
        </div>
      )}

      {/* Apple TV Remote */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-cyan-400">📱 Remote Control</h3>
        <RemoteControl
          remoteId="remote.living_room"
          mediaPlayerId="media_player.living_room"
          mode={remoteMode}
          customActions={hueSyncBoxActions}
          onModeChange={setRemoteMode}
          onCommand={handleRemoteCommand}
          onServiceCall={handleServiceCall}
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-purple-400">⚡ Quick Actions</h3>
        <HorizontalStack gap="8px">
          {sceneEntities.slice(3).map((scene) => (
            <SceneCard
              key={scene.id}
              entity={scene}
              gradient="blue-purple"
              height="60px"
              onActivate={handleSceneActivate}
            />
          ))}
        </HorizontalStack>
      </div>
    </div>
  );
}
