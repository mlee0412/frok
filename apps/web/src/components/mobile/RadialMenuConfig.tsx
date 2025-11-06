'use client';

/**
 * RadialMenuConfig Component
 *
 * Configuration modal for managing radial menu shortcuts.
 *
 * Features:
 * - View current shortcuts
 * - Add new shortcuts (HA service calls, navigation, custom)
 * - Remove existing shortcuts
 * - Reorder shortcuts (drag-and-drop or arrows)
 */

import { useState } from 'react';
import { Modal, Button } from '@frok/ui';
import { useRadialMenuStore, type RadialMenuShortcutConfig } from '@/store';
import { useToast } from '@frok/ui';

export interface RadialMenuConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

// Icon types for selection
const ICON_TYPES = [
  { value: 'volume-mute', label: 'Volume Mute', icon: '🔇' },
  { value: 'play-pause', label: 'Play/Pause', icon: '⏯️' },
  { value: 'temperature', label: 'Temperature', icon: '🌡️' },
  { value: 'scene', label: 'Scene', icon: '🎬' },
  { value: 'lock', label: 'Lock', icon: '🔒' },
  { value: 'camera', label: 'Camera', icon: '📷' },
  { value: 'custom', label: 'Custom', icon: '⚙️' },
] as const;

// HA domains for selection
const HA_DOMAINS = [
  'light',
  'switch',
  'media_player',
  'climate',
  'lock',
  'cover',
  'fan',
  'vacuum',
] as const;

export function RadialMenuConfig({ isOpen, onClose }: RadialMenuConfigProps) {
  const { shortcuts, addShortcut, removeShortcut, reorderShortcuts, maxShortcuts } = useRadialMenuStore();
  const { success, error } = useToast();

  // Form state
  const [formLabel, setFormLabel] = useState('');
  const [formIconType, setFormIconType] = useState<RadialMenuShortcutConfig['iconType']>('custom');
  const [formActionType, setFormActionType] = useState<'ha-call' | 'navigate' | 'custom'>('ha-call');
  const [formDomain, setFormDomain] = useState('light');
  const [formService, setFormService] = useState('toggle');
  const [formEntityId, setFormEntityId] = useState('');
  const [formPath, setFormPath] = useState('');

  const handleAddShortcut = () => {
    if (!formLabel.trim()) {
      error('Label is required');
      return;
    }

    if (formActionType === 'ha-call' && !formEntityId.trim()) {
      error('Entity ID is required for HA service calls');
      return;
    }

    if (formActionType === 'navigate' && !formPath.trim()) {
      error('Path is required for navigation');
      return;
    }

    const newShortcut: RadialMenuShortcutConfig = {
      id: `${formActionType}-${Date.now()}`,
      iconType: formIconType,
      label: formLabel,
      action: {
        type: formActionType,
        ...(formActionType === 'ha-call' && {
          domain: formDomain,
          service: formService,
          entity_id: formEntityId,
        }),
        ...(formActionType === 'navigate' && {
          path: formPath,
        }),
        ...(formActionType === 'custom' && {
          customId: formLabel.toLowerCase().replace(/\s+/g, '-'),
        }),
      },
    };

    addShortcut(newShortcut);
    success(`Shortcut "${formLabel}" added`);

    // Reset form
    setFormLabel('');
    setFormIconType('custom');
    setFormActionType('ha-call');
    setFormDomain('light');
    setFormService('toggle');
    setFormEntityId('');
    setFormPath('');
  };

  const handleRemove = (id: string, label: string) => {
    removeShortcut(id);
    success(`Removed "${label}"`);
  };

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      reorderShortcuts(index, index - 1);
    }
  };

  const handleMoveDown = (index: number) => {
    if (index < shortcuts.length - 1) {
      reorderShortcuts(index, index + 1);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="🎯 Configure Radial Menu"
      description="Manage shortcuts for the mobile radial menu"
      size="lg"
      footer={
        <Button onClick={onClose} variant="outline">
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Current Shortcuts */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-foreground">
              Current Shortcuts ({shortcuts.length}/{maxShortcuts})
            </h3>
          </div>

          {shortcuts.length === 0 ? (
            <div className="p-4 bg-surface/50 border border-border rounded-lg text-center text-foreground/60 text-sm">
              No shortcuts configured. Add one below!
            </div>
          ) : (
            <div className="space-y-2">
              {shortcuts.map((shortcut, index) => (
                <div
                  key={shortcut.id}
                  className="flex items-center gap-2 p-3 bg-surface border border-border rounded-lg"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-primary/20 text-primary rounded-lg text-sm">
                    {ICON_TYPES.find((t) => t.value === shortcut.iconType)?.icon || '⚙️'}
                  </div>

                  {/* Label & Action Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{shortcut.label}</p>
                    <p className="text-xs text-foreground/60 truncate">
                      {shortcut.action.type === 'ha-call' && (
                        <>
                          {shortcut.action.domain}.{shortcut.action.service} → {shortcut.action.entity_id}
                        </>
                      )}
                      {shortcut.action.type === 'navigate' && <>Navigate to {shortcut.action.path}</>}
                      {shortcut.action.type === 'custom' && <>Custom: {shortcut.action.customId}</>}
                    </p>
                  </div>

                  {/* Reorder Buttons */}
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleMoveUp(index)}
                      disabled={index === 0}
                      className="p-1 text-foreground/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
                      aria-label="Move up"
                    >
                      ▲
                    </button>
                    <button
                      onClick={() => handleMoveDown(index)}
                      disabled={index === shortcuts.length - 1}
                      className="p-1 text-foreground/60 hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed transition"
                      aria-label="Move down"
                    >
                      ▼
                    </button>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => handleRemove(shortcut.id, shortcut.label)}
                    className="p-2 text-danger hover:bg-danger/10 rounded transition"
                    aria-label="Remove shortcut"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Add New Shortcut Form */}
        {shortcuts.length < maxShortcuts && (
          <div className="border-t border-border pt-6">
            <h3 className="text-sm font-medium text-foreground mb-3">Add New Shortcut</h3>

            <div className="space-y-3">
              {/* Label */}
              <div>
                <label className="block text-xs text-foreground/70 mb-1">
                  Label <span className="text-danger">*</span>
                </label>
                <input
                  type="text"
                  value={formLabel}
                  onChange={(e) => setFormLabel(e.target.value)}
                  placeholder="e.g., Living Room Lights"
                  className="w-full px-3 py-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-sm"
                />
              </div>

              {/* Icon Type */}
              <div>
                <label className="block text-xs text-foreground/70 mb-1">Icon</label>
                <select
                  value={formIconType}
                  onChange={(e) => setFormIconType(e.target.value as RadialMenuShortcutConfig['iconType'])}
                  className="w-full px-3 py-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-sm"
                >
                  {ICON_TYPES.map((icon) => (
                    <option key={icon.value} value={icon.value}>
                      {icon.icon} {icon.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Action Type */}
              <div>
                <label className="block text-xs text-foreground/70 mb-1">Action Type</label>
                <select
                  value={formActionType}
                  onChange={(e) => setFormActionType(e.target.value as 'ha-call' | 'navigate' | 'custom')}
                  className="w-full px-3 py-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-sm"
                >
                  <option value="ha-call">Home Assistant Service Call</option>
                  <option value="navigate">Navigate to Page</option>
                  <option value="custom">Custom Action</option>
                </select>
              </div>

              {/* HA Service Call Fields */}
              {formActionType === 'ha-call' && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">Domain</label>
                      <select
                        value={formDomain}
                        onChange={(e) => setFormDomain(e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-sm"
                      >
                        {HA_DOMAINS.map((domain) => (
                          <option key={domain} value={domain}>
                            {domain}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs text-foreground/70 mb-1">Service</label>
                      <input
                        type="text"
                        value={formService}
                        onChange={(e) => setFormService(e.target.value)}
                        placeholder="e.g., toggle, turn_on"
                        className="w-full px-3 py-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-sm"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-foreground/70 mb-1">
                      Entity ID <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      value={formEntityId}
                      onChange={(e) => setFormEntityId(e.target.value)}
                      placeholder="e.g., light.living_room"
                      className="w-full px-3 py-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-sm"
                    />
                  </div>
                </>
              )}

              {/* Navigate Fields */}
              {formActionType === 'navigate' && (
                <div>
                  <label className="block text-xs text-foreground/70 mb-1">
                    Path <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    value={formPath}
                    onChange={(e) => setFormPath(e.target.value)}
                    placeholder="e.g., /dashboard/smart-home"
                    className="w-full px-3 py-2 bg-surface border border-border rounded focus:outline-none focus:border-primary text-sm"
                  />
                </div>
              )}

              {/* Custom Action Note */}
              {formActionType === 'custom' && (
                <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg text-sm text-warning">
                  ⚠️ Custom actions require code implementation in MobileHeader
                </div>
              )}

              {/* Add Button */}
              <div className="pt-2">
                <Button onClick={handleAddShortcut} variant="primary" className="w-full">
                  Add Shortcut
                </Button>
              </div>
            </div>
          </div>
        )}

        {shortcuts.length >= maxShortcuts && (
          <div className="p-3 bg-info/10 border border-info/30 rounded-lg text-sm text-info">
            ℹ️ Maximum shortcuts ({maxShortcuts}) reached. Remove a shortcut to add a new one.
          </div>
        )}
      </div>
    </Modal>
  );
}
