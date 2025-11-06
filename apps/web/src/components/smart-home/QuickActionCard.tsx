'use client';

import { useState, type ComponentPropsWithoutRef, forwardRef } from 'react';
import type { Device } from '@frok/clients';
import { Card, Button } from '@frok/ui';
import {
  Zap,
  Play,
  Lightbulb,
  Power,
  Loader2
} from 'lucide-react';

export interface QuickAction {
  id: string;
  label: string;
  icon?: 'zap' | 'play' | 'lightbulb' | 'power';
  variant?: 'primary' | 'outline' | 'ghost';
  onAction: () => Promise<void> | void;
}

export interface QuickActionCardProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /**
   * Card title
   */
  title: string;

  /**
   * Card description
   * @optional
   */
  description?: string;

  /**
   * Quick actions to display
   */
  actions: QuickAction[];

  /**
   * Layout mode
   * @default 'grid'
   */
  layout?: 'grid' | 'horizontal';

  /**
   * Scenes to display (alternative to actions)
   */
  scenes?: Device[];

  /**
   * Callback when a scene is activated
   */
  onSceneActivate?: (sceneId: string) => Promise<void>;

  /**
   * Scripts to display (alternative to actions)
   */
  scripts?: Device[];

  /**
   * Callback when a script is run
   */
  onScriptRun?: (scriptId: string) => Promise<void>;
}

const ICONS = {
  zap: Zap,
  play: Play,
  lightbulb: Lightbulb,
  power: Power,
};

/**
 * QuickActionCard - Card for quick actions, scenes, and scripts
 *
 * Features:
 * - Flexible action buttons with icons
 * - Loading states for async actions
 * - Grid or horizontal scroll layout
 * - Scene and script support
 * - Touch-optimized (48px+ targets)
 *
 * @example
 * ```tsx
 * <QuickActionCard
 *   title="Quick Actions"
 *   actions={[
 *     { id: 'all-on', label: 'All Lights On', icon: 'lightbulb', onAction: turnAllOn },
 *     { id: 'all-off', label: 'All Lights Off', icon: 'power', onAction: turnAllOff },
 *   ]}
 * />
 * ```
 */
export const QuickActionCard = forwardRef<HTMLDivElement, QuickActionCardProps>(
  (
    {
      title,
      description,
      actions = [],
      layout = 'grid',
      scenes = [],
      onSceneActivate,
      scripts = [],
      onScriptRun,
      className,
      ...props
    },
    ref
  ) => {
    const [loadingAction, setLoadingAction] = useState<string | null>(null);

    const handleAction = async (action: QuickAction) => {
      setLoadingAction(action.id);
      try {
        await action.onAction();
      } finally {
        setLoadingAction(null);
      }
    };

    const handleSceneActivate = async (sceneId: string) => {
      if (!onSceneActivate) return;

      setLoadingAction(sceneId);
      try {
        await onSceneActivate(sceneId);
      } finally {
        setLoadingAction(null);
      }
    };

    const handleScriptRun = async (scriptId: string) => {
      if (!onScriptRun) return;

      setLoadingAction(scriptId);
      try {
        await onScriptRun(scriptId);
      } finally {
        setLoadingAction(null);
      }
    };

    const hasContent = actions.length > 0 || scenes.length > 0 || scripts.length > 0;

    if (!hasContent) return null;

    return (
      <div ref={ref} {...props}>
      <Card
        className={`${className || ''}`}
      >
        <div className="p-4 space-y-4">
          {/* Header */}
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              {title}
            </h2>
            {description && (
              <p className="text-sm text-foreground/60 mt-1">
                {description}
              </p>
            )}
          </div>

          {/* Actions */}
          {actions.length > 0 && (
            <div className={
              layout === 'grid'
                ? 'grid grid-cols-2 gap-3'
                : 'flex gap-3 overflow-x-auto pb-2 -mx-4 px-4'
            }>
              {actions.map((action) => {
                const Icon = action.icon ? ICONS[action.icon] : Zap;
                const isLoading = loadingAction === action.id;

                return (
                  <Button
                    key={action.id}
                    variant={action.variant || 'outline'}
                    onClick={() => handleAction(action)}
                    disabled={loadingAction !== null}
                    className={`
                      h-14 ${layout === 'horizontal' ? 'min-w-[140px]' : ''}
                      transition-all duration-200
                    `}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="mr-2 animate-spin" />
                        <span>Loading...</span>
                      </>
                    ) : (
                      <>
                        <Icon size={18} className="mr-2" />
                        <span>{action.label}</span>
                      </>
                    )}
                  </Button>
                );
              })}
            </div>
          )}

          {/* Scenes */}
          {scenes.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground/80 mb-2">
                Scenes
              </h3>
              <div className={
                layout === 'grid'
                  ? 'grid grid-cols-2 gap-2'
                  : 'flex gap-2 overflow-x-auto pb-2 -mx-4 px-4'
              }>
                {scenes.map((scene) => {
                  const isLoading = loadingAction === scene.id;

                  return (
                    <Button
                      key={scene.id}
                      variant="outline"
                      onClick={() => handleSceneActivate(scene.id)}
                      disabled={loadingAction !== null}
                      className={`
                        h-12 ${layout === 'horizontal' ? 'min-w-[120px]' : ''}
                        text-sm
                      `}
                    >
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        scene.name
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Scripts */}
          {scripts.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground/80 mb-2">
                Scripts
              </h3>
              <div className={
                layout === 'grid'
                  ? 'grid grid-cols-2 gap-2'
                  : 'flex gap-2 overflow-x-auto pb-2 -mx-4 px-4'
              }>
                {scripts.map((script) => {
                  const isLoading = loadingAction === script.id;

                  return (
                    <Button
                      key={script.id}
                      variant="outline"
                      onClick={() => handleScriptRun(script.id)}
                      disabled={loadingAction !== null}
                      className={`
                        h-12 ${layout === 'horizontal' ? 'min-w-[120px]' : ''}
                        text-sm
                      `}
                    >
                      {isLoading ? (
                        <Loader2 size={16} className="animate-spin" />
                      ) : (
                        script.name
                      )}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Card>
      </div>
    );
  }
);

QuickActionCard.displayName = 'QuickActionCard';
