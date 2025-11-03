'use client';

import React, { useState } from 'react';
import type { Device } from '@frok/clients';
import { LightCard, type LightEntity } from './LightCard';
import { LightControlModal } from './LightControlModal';
import { GridLayout } from './GridLayout';

export interface AreaLightControlProps {
  devices: Device[];
  onToggle?: (entityId: string) => Promise<void>;
  onBrightnessChange?: (entityId: string, brightness: number) => Promise<void>;
  onColorTempChange?: (entityId: string, colorTemp: number) => Promise<void>;
  onAreaToggle?: (areaId: string) => Promise<void>;
}

export function AreaLightControl({
  devices,
  onToggle,
  onBrightnessChange,
  onColorTempChange,
  onAreaToggle,
}: AreaLightControlProps) {
  // Group devices by area, use friendly name for empty areas
  const devicesByArea = devices.reduce((acc, device) => {
    let area = device.area?.trim();
    // If no area assigned, use "Unassigned Lights"
    if (!area || area === '') {
      area = 'Unassigned Lights';
    }
    if (!acc[area]) acc[area] = [];
    acc[area]!.push(device);
    return acc;
  }, {} as Record<string, Device[]>);

  // Sort areas: put areas with most devices first, but "Unassigned Lights" last
  const sortedAreas = Object.entries(devicesByArea).sort((a, b) => {
    if (a[0] === 'Unassigned Lights') return 1;
    if (b[0] === 'Unassigned Lights') return -1;
    return b[1].length - a[1].length;
  });

  // Expand first 2 areas by default
  const defaultExpanded = new Set(sortedAreas.slice(0, 2).map(([area]) => area));
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(defaultExpanded);
  const [selectedLight, setSelectedLight] = useState<LightEntity | null>(null);

  const toggleArea = (area: string) => {
    const newExpanded = new Set(expandedAreas);
    if (newExpanded.has(area)) {
      newExpanded.delete(area);
    } else {
      newExpanded.add(area);
    }
    setExpandedAreas(newExpanded);
  };

  const toggleAllLightsInArea = async (area: string) => {
    if (!onAreaToggle) return;
    await onAreaToggle(area);
  };

  const convertToLight = (d: Device): LightEntity => ({
    id: d.id,
    name: d.name,
    state: d.state === 'on' ? 'on' : 'off',
    type: 'light',
    attrs: d.attrs as LightEntity['attrs'],
  });

  const handleLightLongPress = (entityId: string) => {
    const device = devices.find((d) => d.id === entityId);
    if (device) {
      setSelectedLight(convertToLight(device));
    }
  };

  // Get area icon based on area name
  const getAreaIcon = (areaName: string): string => {
    const name = areaName.toLowerCase();
    if (name.includes('bedroom')) return '🛏️';
    if (name.includes('living') || name.includes('lounge')) return '🛋️';
    if (name.includes('kitchen')) return '🍳';
    if (name.includes('bathroom') || name.includes('bath')) return '🚿';
    if (name.includes('office') || name.includes('study')) return '💼';
    if (name.includes('dining')) return '🍽️';
    if (name.includes('garage')) return '🚗';
    if (name.includes('outdoor') || name.includes('garden') || name.includes('patio')) return '🌳';
    if (name.includes('hallway') || name.includes('corridor')) return '🚪';
    if (name.includes('unassigned')) return '❓';
    return '🏠';
  };

  return (
    <div className="space-y-4">
      {sortedAreas.map(([area, areaDevices]) => {
        const isExpanded = expandedAreas.has(area);
        const lightsOn = areaDevices.filter((d) => d.state === 'on').length;
        const totalLights = areaDevices.length;
        const areaIcon = getAreaIcon(area);

        return (
          <div key={area} className="space-y-2">
            {/* Area Header */}
            <div
              className="flex items-center justify-between px-4 py-3 rounded-lg cursor-pointer transition-all"
              style={{
                background: lightsOn > 0
                  ? 'linear-gradient(135deg, rgba(255,215,0,0.15), rgba(255,140,0,0.1))'
                  : 'rgba(255,255,255,0.05)',
                border: lightsOn > 0 ? '1px solid rgba(255,215,0,0.3)' : '1px solid rgba(255,255,255,0.1)',
              }}
              onClick={() => toggleArea(area)}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">
                  {areaIcon}
                </span>
                <span className="text-lg">
                  {isExpanded ? '🔽' : '▶️'}
                </span>
                <div>
                  <h3 className="text-lg font-semibold text-white">{area}</h3>
                  <p className="text-sm text-foreground/60">
                    {lightsOn > 0 ? `${lightsOn} of ${totalLights} on` : `${totalLights} lights`}
                  </p>
                </div>
              </div>
              {onAreaToggle && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleAllLightsInArea(area);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
                  style={{
                    background: lightsOn > 0 ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
                    border: lightsOn > 0 ? '1px solid rgba(255,215,0,0.5)' : '1px solid rgba(255,255,255,0.2)',
                    color: lightsOn > 0 ? '#FFD700' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {lightsOn > 0 ? 'Turn All Off' : 'Turn All On'}
                </button>
              )}
            </div>

            {/* Lights Grid */}
            {isExpanded && (
              <GridLayout columns={2} gap="12px">
                {areaDevices.map((device) => (
                  <LightCard
                    key={device.id}
                    entity={convertToLight(device)}
                    onToggle={onToggle}
                    onMore={handleLightLongPress}
                  />
                ))}
              </GridLayout>
            )}
          </div>
        );
      })}

      {/* Advanced Control Modal */}
      {selectedLight && (
        <LightControlModal
          entity={selectedLight}
          isOpen={!!selectedLight}
          onClose={() => setSelectedLight(null)}
          onBrightnessChange={onBrightnessChange}
          onColorTempChange={onColorTempChange}
        />
      )}
    </div>
  );
}
