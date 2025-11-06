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
  remoteSendCommand,
  callHAService,
  lightSetBrightnessPct,
  lightSetColorTemp,
} from '@frok/clients';
import {
  SceneCard,
  SwitchCard,
  TimeCard,
  HorizontalStack,
  VerticalStack,
  GridLayout,
  AreaLightControl,
  RemoteControlEnhanced,
  type SceneEntity,
  type SwitchEntity,
  type RemoteMode,
  type RemoteAction,
  type MediaPlayerData,
} from './index';
import { ClimateCardEnhanced, type ClimateEntity } from './ClimateCardEnhanced';
import { BlindsCardEnhanced, type BlindsEntity } from './BlindsCardEnhanced';

export interface LovelaceDashboardEnhancedProps {
  initialDevices: Device[];
  haOk: boolean;
  haDetail?: string;
}

export default function LovelaceDashboardEnhanced({
  initialDevices,
  haOk,
  haDetail,
}: LovelaceDashboardEnhancedProps) {
  const [devices, setDevices] = useState<Device[]>(initialDevices);
  const [remoteMode, setRemoteMode] = useState<RemoteMode>('touchpad');
  const [switchesExpanded, setSwitchesExpanded] = useState(false);

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

  // Group devices - Move Kitchen/Bathroom light switches to lights
  const isLightSwitch = (device: Device) => {
    const name = device.name.toLowerCase();
    return (
      device.type === 'switch' &&
      (name.includes('kitchen') ||
        name.includes('bathroom') ||
        name.includes('light'))
    );
  };

  // Separate lights and light switches from regular switches
  const allLights = devices.filter((d) => d.type === 'light' || isLightSwitch(d));
  const regularSwitches = devices.filter((d) => d.type === 'switch' && !isLightSwitch(d));
  const covers = devices.filter((d) => d.type === 'cover');
  const mediaPlayers = devices.filter((d) => d.type === 'media_player');

  // Find specific HVAC entity
  const hvacEntity = devices.find((d) => d.id === 'climate.simon_aire_inc');

  // Find Samsung TV for HDMI source selector
  const samsungTV = mediaPlayers.find((d) => d.id.toLowerCase().includes('samsung') || d.name.toLowerCase().includes('samsung'));

  // Convert helpers
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

  const convertToBlinds = (d: Device): BlindsEntity => ({
    id: d.id,
    name: d.name,
    state: (d.state || 'closed') as BlindsEntity['state'],
    type: 'cover',
    attrs: d.attrs as BlindsEntity['attrs'],
  });

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

  const handleAreaToggle = async (area: string) => {
    const areaLights = allLights.filter((d) => (d.area || 'Other') === area);
    const promises = areaLights.map((light) => {
      if (isLightSwitch(light)) {
        return toggle(light.id, 'switch');
      }
      return toggle(light.id, 'light');
    });
    await Promise.all(promises);
    await refresh();
  };

  const handleBrightnessChange = async (entityId: string, brightness: number) => {
    await lightSetBrightnessPct(entityId, brightness);
    await refresh();
  };

  const handleColorTempChange = async (entityId: string, colorTemp: number) => {
    await lightSetColorTemp(entityId, colorTemp);
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

  // Climate handlers
  const handleClimateSetTemp = async (entityId: string, temperature: number) => {
    await callHAService({
      domain: 'climate',
      service: 'set_temperature',
      entity_id: entityId,
      data: { temperature },
    });
    await refresh();
  };

  const handleClimateSetMode = async (entityId: string, hvac_mode: string) => {
    await callHAService({
      domain: 'climate',
      service: 'set_hvac_mode',
      entity_id: entityId,
      data: { hvac_mode },
    });
    await refresh();
  };

  // Samsung TV HDMI source handler
  const handleSamsungTVSource = async (source: string) => {
    if (!samsungTV) return;
    await callHAService({
      domain: 'media_player',
      service: 'select_source',
      entity_id: samsungTV.id,
      data: { source },
    });
    await refresh();
  };

  const handleCoverSetPosition = async (entityId: string, position: number) => {
    await callHAService({
      domain: 'cover',
      service: 'set_cover_position',
      entity_id: entityId,
      data: { position },
    });
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

  // Remote control handlers
  const handleRemoteCommand = async (remoteId: string, command: string) => {
    await remoteSendCommand(remoteId, command);
  };

  const handleServiceCall = async (
    entityId: string,
    service: string,
    data?: Record<string, unknown>
  ) => {
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

  // Scene entities
  const sceneEntities: SceneEntity[] = [
    { id: 'scene.bedroom_evening', name: 'Evening', type: 'scene', icon: '🌙' },
    { id: 'scene.bedroom_relax', name: 'Relax', type: 'scene', icon: '🛋️' },
    { id: 'scene.bedroom_rest', name: 'Rest', type: 'scene', icon: '😴' },
  ];

  // Hue Sync Box custom actions
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

  // Get media player data for remote control (Sonos for volume)
  const sonosPlayer = mediaPlayers.find((mp) => mp.id.includes('sonos'));
  const mediaPlayerData: MediaPlayerData | undefined = sonosPlayer
    ? {
        id: sonosPlayer.id,
        name: sonosPlayer.name,
        state: sonosPlayer.state || 'idle',
        volume: sonosPlayer.attrs?.['volume_level'] as number | undefined,
        isMuted: sonosPlayer.attrs?.['is_volume_muted'] as boolean | undefined,
      }
    : undefined;

  // Use specific entity IDs for Apple TV
  const appleTvEntityId = 'media_player.living_room'; // For app launching via select_source
  const remoteEntityId = 'remote.living_room'; // For remote commands

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
          {haOk ? '✓ Connected' : '✗ Offline'}
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
                gradient={
                  scene.name === 'Evening'
                    ? 'purple-magenta'
                    : scene.name === 'Relax'
                    ? 'cyan-blue'
                    : 'pink-orange'
                }
                height="60px"
                onActivate={handleSceneActivate}
              />
            ))}
          </VerticalStack>
        </div>
      </HorizontalStack>

      {/* Climate Control - Simon Aire HVAC */}
      {hvacEntity && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-primary">🌡️ Climate Control</h3>
          <ClimateCardEnhanced
            entity={convertToClimate(hvacEntity)}
            onSetTemp={handleClimateSetTemp}
            onSetMode={handleClimateSetMode}
          />
        </div>
      )}

      {/* Lights Section with Area Grouping */}
      {allLights.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-warning">💡 Lights & Switches</h3>
            <span className="text-sm text-foreground/60">
              {allLights.length} {allLights.length === 1 ? 'device' : 'devices'}
            </span>
          </div>
          <AreaLightControl
            devices={allLights}
            onToggle={handleLightToggle}
            onAreaToggle={handleAreaToggle}
            onBrightnessChange={handleBrightnessChange}
            onColorTempChange={handleColorTempChange}
          />
        </div>
      )}

      {/* Window Blinds */}
      {covers.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-success">🪟 Window Blinds</h3>
          <GridLayout columns={2} gap="12px">
            {covers.map((device) => (
              <BlindsCardEnhanced
                key={device.id}
                entity={convertToBlinds(device)}
                height="auto"
                onOpen={handleCoverOpen}
                onClose={handleCoverClose}
                onStop={handleCoverStop}
                onSetPosition={handleCoverSetPosition}
              />
            ))}
          </GridLayout>
        </div>
      )}

      {/* Media & Remote Control - Integrated */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-info">📱 Media Control</h3>
        <RemoteControlEnhanced
          remoteId={remoteEntityId}
          mode={remoteMode}
          customActions={hueSyncBoxActions}
          mediaPlayer={mediaPlayerData}
          appleTvEntityId={appleTvEntityId}
          samsungTVEntityId={samsungTV?.id}
          onModeChange={setRemoteMode}
          onCommand={handleRemoteCommand}
          onServiceCall={handleServiceCall}
          onVolumeSet={handleVolumeSet}
          onVolumeMute={handleVolumeMute}
          onSamsungTVSource={handleSamsungTVSource}
        />
      </div>

      {/* Switches Section (Collapsible) */}
      {regularSwitches.length > 0 && (
        <div>
          <button
            onClick={() => setSwitchesExpanded(!switchesExpanded)}
            className="w-full flex items-center justify-between mb-3 px-4 py-2 rounded-lg transition-all"
            style={{
              background: 'rgba(255,140,0,0.1)',
              border: '1px solid rgba(255,140,0,0.3)',
            }}
          >
            <h3 className="text-lg font-semibold text-orange-400">
              🔌 Other Switches ({regularSwitches.length})
            </h3>
            <span className="text-orange-400">{switchesExpanded ? '▲' : '▼'}</span>
          </button>
          {switchesExpanded && (
            <GridLayout columns={2} gap="12px">
              {regularSwitches.map((device) => (
                <SwitchCard
                  key={device.id}
                  entity={convertToSwitch(device)}
                  gradient={
                    device.id.includes('bathroom') ? 'cyan-blue' : 'orange-yellow'
                  }
                  onToggle={handleSwitchToggle}
                />
              ))}
            </GridLayout>
          )}
        </div>
      )}
    </div>
  );
}
