'use client';

/**
 * QuickActionsMenu - Floating Action Button with quick shortcuts
 *
 * Features:
 * - FAB positioned in bottom-right corner
 * - Expandable radial menu with common actions
 * - Voice, Analytics, Smart Home shortcuts
 * - Smooth animations with framer-motion
 * - Touch-optimized for mobile
 */

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Mic, BarChart3, Lightbulb, MessageSquare, Zap } from 'lucide-react';

interface QuickAction {
  id: string;
  label: string;
  icon: typeof Mic;
  path: string;
  color: string; // Tailwind color class
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'voice',
    label: 'Voice',
    icon: Mic,
    path: '/voice',
    color: 'bg-accent',
  },
  {
    id: 'analytics',
    label: 'Analytics',
    icon: BarChart3,
    path: '/dashboard/analytics',
    color: 'bg-info',
  },
  {
    id: 'smart-home',
    label: 'Smart Home',
    icon: Lightbulb,
    path: '/dashboard/smart-home',
    color: 'bg-warning',
  },
  {
    id: 'agent',
    label: 'Agent',
    icon: MessageSquare,
    path: '/agent',
    color: 'bg-primary',
  },
  {
    id: 'automation',
    label: 'Automation',
    icon: Zap,
    path: '/dashboard/automation',
    color: 'bg-success',
  },
];

export interface QuickActionsMenuProps {
  /**
   * Position of the FAB
   * @default 'bottom-right'
   */
  position?: 'bottom-right' | 'bottom-left';

  /**
   * Hide on certain routes (optional)
   */
  hideOnRoutes?: string[];
}

export function QuickActionsMenu({
  position = 'bottom-right',
}: QuickActionsMenuProps) {
  const router = useRouter();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleActionClick = useCallback(
    (action: QuickAction) => {
      router.push(action.path);
      setIsExpanded(false);
    },
    [router]
  );

  const toggleMenu = useCallback(() => {
    setIsExpanded(!isExpanded);
  }, [isExpanded]);

  // Calculate action button positions (radial layout)
  const getActionPosition = (index: number, total: number) => {
    const angle = (Math.PI / 2) * (index / (total - 1)); // 90 degree arc
    const radius = 80; // Distance from FAB
    const x = -Math.cos(angle) * radius;
    const y = -Math.sin(angle) * radius;
    return { x, y };
  };

  return (
    <>
      {/* Backdrop */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setIsExpanded(false)}
        />
      )}

      {/* Quick Actions Container */}
      <div
        className={`
          fixed z-50
          ${position === 'bottom-right' ? 'bottom-20 right-6 md:bottom-8 md:right-8' : 'bottom-20 left-6 md:bottom-8 md:left-8'}
        `}
      >
        {/* Action Buttons (appear when expanded) */}
        {isExpanded && (
          <div className="absolute bottom-16 right-0">
            {QUICK_ACTIONS.map((action, index) => {
              const Icon = action.icon;
              const { x, y } = getActionPosition(index, QUICK_ACTIONS.length);

              return (
                <button
                  key={action.id}
                  onClick={() => handleActionClick(action)}
                  className={`
                    absolute
                    w-12 h-12 rounded-full
                    ${action.color}
                    text-white
                    shadow-lg
                    flex items-center justify-center
                    transition-all duration-300
                    hover:scale-110 active:scale-95
                    group
                  `}
                  style={{
                    transform: `translate(${x}px, ${y}px)`,
                  }}
                  title={action.label}
                  aria-label={action.label}
                >
                  <Icon size={20} />

                  {/* Label tooltip */}
                  <span className="absolute right-full mr-3 px-3 py-1.5 rounded-lg bg-surface/95 backdrop-blur-sm border border-border text-foreground text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Main FAB */}
        <button
          onClick={toggleMenu}
          className={`
            w-14 h-14 rounded-full
            bg-primary text-white
            shadow-lg hover:shadow-xl
            flex items-center justify-center
            transition-all duration-300
            hover:scale-110 active:scale-95
            ${isExpanded ? 'rotate-45' : 'rotate-0'}
          `}
          aria-label={isExpanded ? 'Close quick actions' : 'Open quick actions'}
        >
          {isExpanded ? <X size={24} /> : <Plus size={24} />}
        </button>
      </div>
    </>
  );
}
