'use client';

import React, { useState } from 'react';
import type { Device } from '@frok/clients';
import { LightCard, type LightEntity } from './LightCard';
import { LightControlModal } from './LightControlModal';
import { GridLayout } from './GridLayout';
import { ChevronDown, Lightbulb, Power } from 'lucide-react';

export interface AreaLightControlProps {
  devices: Device[];
  onToggle?: (entityId: string) => Promise<void>;
  onBrightnessChange?: (entityId: string, brightness: number) => Promise<void>;
  onColorTempChange?: (entityId: string, colorTemp: number) => Promise<void>;
  onEffectChange?: (entityId: string, effect: string) => Promise<void>;
  onHSColorChange?: (entityId: string, h: number, s: number) => Promise<void>;
  onRGBColorChange?: (entityId: string, r: number, g: number, b: number) => Promise<void>;
  onAreaToggle?: (areaId: string) => Promise<void>;
}

export function AreaLightControl({
  devices,
  onToggle,
  onBrightnessChange,
  onColorTempChange,
  onEffectChange,
  onHSColorChange,
  onRGBColorChange,
  onAreaToggle,
}: AreaLightControlProps) {
  // Infer area from device name or entity ID if area property is missing
  const inferAreaFromName = (device: Device): string => {
    const name = device.name.toLowerCase();
    const id = device.id.toLowerCase();

    // Specific entity ID mappings
    if (id === 'switch.kitchen') return 'Kitchen';
    if (id === 'switch.bath_room') return 'Bathroom';

    // Specific device name mappings for Living Room
    if (name.includes('window tree') || name.includes('tree lamp')) return 'Living Room';
    if (name.includes('window floor') || name.includes('floor lamp')) return 'Living Room';
    if (name.includes('hue play 1')) return 'Living Room';
    if (name.includes('hue play 2')) return 'Living Room';
    if (name === 'window') return 'Living Room'; // Exact match to avoid false positives

    // Specific device name mappings for Bedroom
    if (name.includes('bedside')) return 'Bedroom';
    if (id.includes('elk-bledom02') || name.includes('elk-bledom02')) return 'Bedroom';

    // Specific device name mappings for Desk
    if (id.includes('eld-bledom0c') || name.includes('eld-bledom0c')) return 'Desk';

    // General area inference from keywords
    if (name.includes('bedroom')) return 'Bedroom';
    if (name.includes('living') || name.includes('lounge')) return 'Living Room';
    if (name.includes('kitchen')) return 'Kitchen';
    if (name.includes('bathroom') || name.includes('bath')) return 'Bathroom';
    if (name.includes('desk') || name.includes('office') || name.includes('study')) return 'Desk';
    if (name.includes('entrance') || name.includes('entry') || name.includes('entryway')) return 'Entrance';
    if (name.includes('entertainment')) return 'Entertainment';
    if (name.includes('dining')) return 'Dining Room';
    if (name.includes('garage')) return 'Garage';
    if (name.includes('outdoor') || name.includes('garden') || name.includes('patio')) return 'Outdoor';
    if (name.includes('hallway') || name.includes('corridor')) return 'Hallway';

    // Fall back to device.area or Other Lights
    return device.area?.trim() || 'Other Lights';
  };

  // Group devices by area, infer area if not set
  const devicesByArea = devices.reduce((acc, device) => {
    const area = inferAreaFromName(device);
    if (!acc[area]) acc[area] = [];
    acc[area]!.push(device);
    return acc;
  }, {} as Record<string, Device[]>);

  // Sort areas: put areas with most devices first, but "Other Lights" last
  const sortedAreas = Object.entries(devicesByArea).sort((a, b) => {
    if (a[0] === 'Other Lights') return 1;
    if (b[0] === 'Other Lights') return -1;
    return b[1].length - a[1].length;
  });

  // Expand first 2 areas by default
  const defaultExpanded = new Set(sortedAreas.slice(0, 2).map(([area]) => area));
  const [expandedAreas, setExpandedAreas] = useState<Set<string>>(defaultExpanded);
  const [selectedLight, setSelectedLight] = useState<LightEntity | null>(null);
  const [showBrightnessControls, setShowBrightnessControls] = useState<Set<string>>(new Set());

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

  const toggleBrightnessControl = (area: string) => {
    const newSet = new Set(showBrightnessControls);
    if (newSet.has(area)) {
      newSet.delete(area);
    } else {
      newSet.add(area);
    }
    setShowBrightnessControls(newSet);
  };

  const handleRoomBrightnessChange = async (area: string, brightness: number) => {
    if (!onBrightnessChange) return;
    const areaLights = devices.filter((d) => inferAreaFromName(d) === area && d.type === 'light');
    const promises = areaLights.map((light) => onBrightnessChange(light.id, brightness));
    await Promise.all(promises);
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

  // Get area icon and color based on area name
  const getAreaIcon = (areaName: string): string => {
    const name = areaName.toLowerCase();
    if (name.includes('bedroom')) return '🛏️';
    if (name.includes('living') || name.includes('lounge')) return '🛋️';
    if (name.includes('kitchen')) return '🍳';
    if (name.includes('bathroom') || name.includes('bath')) return '🚿';
    if (name.includes('desk') || name.includes('office') || name.includes('study')) return '💻';
    if (name.includes('entrance') || name.includes('entry')) return '🚪';
    if (name.includes('entertainment')) return '🎮';
    if (name.includes('dining')) return '🍽️';
    if (name.includes('garage')) return '🚗';
    if (name.includes('outdoor') || name.includes('garden') || name.includes('patio')) return '🌳';
    if (name.includes('hallway') || name.includes('corridor')) return '🚶';
    if (name.includes('other')) return '💡';
    return '🏠';
  };

  const getAreaGradient = (areaName: string, lightsOn: boolean) => {
    if (!lightsOn) {
      return {
        background: 'linear-gradient(135deg, rgba(30, 30, 35, 0.8), rgba(20, 20, 25, 0.7))',
        border: 'rgba(100, 100, 120, 0.3)',
        glow: 'rgba(100, 100, 120, 0)',
      };
    }

    const name = areaName.toLowerCase();
    if (name.includes('bedroom')) {
      return {
        background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.15), rgba(139, 92, 246, 0.1))',
        border: 'rgba(147, 51, 234, 0.5)',
        glow: 'rgba(147, 51, 234, 0.3)',
      };
    }
    if (name.includes('living')) {
      return {
        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 193, 7, 0.1))',
        border: 'rgba(255, 215, 0, 0.5)',
        glow: 'rgba(255, 215, 0, 0.3)',
      };
    }
    if (name.includes('kitchen')) {
      return {
        background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.15), rgba(249, 115, 22, 0.1))',
        border: 'rgba(251, 146, 60, 0.5)',
        glow: 'rgba(251, 146, 60, 0.3)',
      };
    }
    if (name.includes('bathroom')) {
      return {
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.15), rgba(14, 165, 233, 0.1))',
        border: 'rgba(6, 182, 212, 0.5)',
        glow: 'rgba(6, 182, 212, 0.3)',
      };
    }
    if (name.includes('desk') || name.includes('office')) {
      return {
        background: 'linear-gradient(135deg, rgba(34, 211, 238, 0.15), rgba(14, 165, 233, 0.1))',
        border: 'rgba(34, 211, 238, 0.5)',
        glow: 'rgba(34, 211, 238, 0.3)',
      };
    }
    if (name.includes('entrance') || name.includes('entry')) {
      return {
        background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.15), rgba(147, 51, 234, 0.1))',
        border: 'rgba(168, 85, 247, 0.5)',
        glow: 'rgba(168, 85, 247, 0.3)',
      };
    }
    if (name.includes('entertainment')) {
      return {
        background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.15), rgba(219, 39, 119, 0.1))',
        border: 'rgba(236, 72, 153, 0.5)',
        glow: 'rgba(236, 72, 153, 0.3)',
      };
    }
    // Default green
    return {
      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.15), rgba(22, 163, 74, 0.1))',
      border: 'rgba(34, 197, 94, 0.5)',
      glow: 'rgba(34, 197, 94, 0.3)',
    };
  };

  return (
    <div className="space-y-4">
      {sortedAreas.map(([area, areaDevices]) => {
        const isExpanded = expandedAreas.has(area);
        const lightsOn = areaDevices.filter((d) => d.state === 'on').length;
        const totalLights = areaDevices.length;
        const areaIcon = getAreaIcon(area);
        const gradient = getAreaGradient(area, lightsOn > 0);

        return (
          <div key={area} className="space-y-3">
            {/* Enhanced Area Header with Futuristic Design */}
            <div
              className="group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300"
              style={{
                background: gradient.background,
                border: `1px solid ${gradient.border}`,
                boxShadow: lightsOn > 0 ? `0 0 20px ${gradient.glow}, 0 4px 12px rgba(0,0,0,0.3)` : '0 2px 8px rgba(0,0,0,0.2)',
              }}
              onClick={() => toggleArea(area)}
            >
              {/* Animated Border Glow on Hover */}
              {lightsOn > 0 && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{
                    background: `linear-gradient(135deg, ${gradient.glow}, transparent)`,
                    filter: 'blur(10px)',
                  }}
                />
              )}

              <div className="relative flex items-center justify-between px-5 py-4">
                {/* Left Section: Icon, Expand Indicator, Title */}
                <div className="flex items-center gap-4 flex-1">
                  {/* Area Icon with Glow */}
                  <div
                    className="text-3xl transition-transform duration-300 group-hover:scale-110"
                    style={{
                      filter: lightsOn > 0 ? `drop-shadow(0 0 8px ${gradient.glow})` : 'none',
                    }}
                  >
                    {areaIcon}
                  </div>

                  {/* Expand/Collapse Indicator */}
                  <div
                    className="transition-transform duration-300"
                    style={{
                      transform: isExpanded ? 'rotate(0deg)' : 'rotate(-90deg)',
                      color: lightsOn > 0 ? gradient.border : 'rgba(150, 150, 170, 0.8)',
                    }}
                  >
                    <ChevronDown size={24} strokeWidth={2.5} />
                  </div>

                  {/* Area Info */}
                  <div className="flex-1">
                    <h3
                      className="text-xl font-bold tracking-wide"
                      style={{
                        color: 'white',
                        textShadow: lightsOn > 0 ? `0 0 10px ${gradient.glow}` : 'none',
                      }}
                    >
                      {area}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Lightbulb
                        size={14}
                        className={lightsOn > 0 ? 'text-warning' : 'text-foreground/50'}
                      />
                      <p
                        className="text-sm font-medium"
                        style={{
                          color: lightsOn > 0 ? gradient.border : 'rgba(150, 150, 170, 0.9)',
                        }}
                      >
                        {lightsOn > 0
                          ? `${lightsOn} of ${totalLights} on`
                          : `${totalLights} ${totalLights === 1 ? 'light' : 'lights'}`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right Section: Area Controls */}
                <div className="flex items-center gap-2">
                  {/* Brightness Control Button */}
                  {onBrightnessChange && lightsOn > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleBrightnessControl(area);
                      }}
                      className="flex items-center gap-2 px-4 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 hover:scale-105 active:scale-95"
                      style={{
                        background: showBrightnessControls.has(area)
                          ? `linear-gradient(135deg, ${gradient.border}, ${gradient.glow})`
                          : 'linear-gradient(135deg, rgba(100, 100, 120, 0.3), rgba(80, 80, 100, 0.2))',
                        border: `1px solid ${showBrightnessControls.has(area) ? gradient.border : 'rgba(100, 100, 120, 0.4)'}`,
                        color: 'white',
                        boxShadow: showBrightnessControls.has(area) ? `0 0 15px ${gradient.glow}` : 'none',
                      }}
                      title="Room Brightness"
                    >
                      ☀️
                    </button>
                  )}

                  {/* Area Toggle Button */}
                  {onAreaToggle && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleAllLightsInArea(area);
                      }}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm transition-all duration-300 hover:scale-105 active:scale-95"
                      style={{
                        background: lightsOn > 0
                          ? `linear-gradient(135deg, ${gradient.border}, ${gradient.glow})`
                          : 'linear-gradient(135deg, rgba(100, 100, 120, 0.3), rgba(80, 80, 100, 0.2))',
                        border: `1px solid ${lightsOn > 0 ? gradient.border : 'rgba(100, 100, 120, 0.4)'}`,
                        color: 'white',
                        boxShadow: lightsOn > 0 ? `0 0 15px ${gradient.glow}` : 'none',
                      }}
                    >
                      <Power size={16} />
                      <span>{lightsOn > 0 ? 'All Off' : 'All On'}</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Room Brightness Control */}
            {showBrightnessControls.has(area) && onBrightnessChange && lightsOn > 0 && (
              <div
                className="px-5 py-4 animate-in slide-in-from-top-2 fade-in duration-300"
                style={{
                  background: 'rgba(0, 0, 0, 0.3)',
                  borderTop: `1px solid ${gradient.border}`,
                }}
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-white whitespace-nowrap">
                    Room Brightness
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    defaultValue="100"
                    onChange={(e) => handleRoomBrightnessChange(area, Number(e.target.value))}
                    onClick={(e) => e.stopPropagation()}
                    className="flex-1 h-2 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${gradient.border} 0%, ${gradient.border} 50%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.2) 100%)`,
                    }}
                  />
                </div>
                <div className="flex justify-between mt-2">
                  {[0, 25, 50, 75, 100].map((val) => (
                    <button
                      key={val}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRoomBrightnessChange(area, val);
                      }}
                      className="text-xs px-2 py-1 rounded transition-colors"
                      style={{
                        background: 'rgba(255,255,255,0.1)',
                        color: 'white',
                      }}
                    >
                      {val}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Lights Grid with Smooth Expand Animation */}
            {isExpanded && (
              <div
                className="animate-in slide-in-from-top-2 fade-in duration-300"
                style={{ paddingLeft: '8px' }}
              >
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
              </div>
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
          onEffectChange={onEffectChange}
          onHSColorChange={onHSColorChange}
          onRGBColorChange={onRGBColorChange}
        />
      )}
    </div>
  );
}
