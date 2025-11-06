# Radial Menu Design

**Last Updated**: 2025-11-05
**Status**: Design Phase

## Overview

The radial menu is a circular touch-optimized interface that appears on long-press (800ms) and provides quick access to frequently-used smart home controls.

## Requirements

### Functional Requirements
1. **Long-Press Activation**: Menu appears after 800ms touch/click hold
2. **Radial Layout**: 6-8 slots arranged in a circle around the touch point
3. **Configurable Actions**: Each slot can be configured with icon, label, and callback
4. **Touch Cancellation**: Moving finger >10px cancels the long-press
5. **Haptic Feedback**: Vibration on menu open (if supported)
6. **Initial Actions**:
   - Volume mute (media_player.sonos)
   - Play/pause (media_player.living_room)
   - Additional slots for future expansion

### Non-Functional Requirements
1. **Performance**: Menu renders within 16ms (60fps)
2. **Accessibility**: Keyboard accessible (Enter/Space on focused element)
3. **Mobile-First**: Optimized for touch, works with mouse
4. **Responsive**: Adapts to screen edges (doesn't overflow viewport)

## Architecture

### Component Hierarchy

```
RadialMenu (container)
├── RadialMenuItem (slot 1)
├── RadialMenuItem (slot 2)
├── RadialMenuItem (slot 3)
└── ... (up to 8 slots)
```

### Hook: `useLongPress`

**Responsibilities**:
- Detect touch/mouse down events
- Track press duration (800ms threshold)
- Cancel on touch move (>10px displacement)
- Trigger callback on successful long-press
- Provide haptic feedback

**API**:
```typescript
interface UseLongPressOptions {
  onLongPress: (event: TouchEvent | MouseEvent) => void;
  threshold?: number; // Default: 800ms
  moveThreshold?: number; // Default: 10px
  hapticFeedback?: boolean; // Default: true
}

function useLongPress(options: UseLongPressOptions): {
  handlers: {
    onMouseDown: (e: React.MouseEvent) => void;
    onMouseUp: (e: React.MouseEvent) => void;
    onMouseMove: (e: React.MouseEvent) => void;
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
  };
  isLongPressing: boolean;
}
```

**State**:
- `isLongPressing`: boolean - Is currently in long-press
- `startPos`: { x: number; y: number } | null - Initial touch position
- `timeoutId`: NodeJS.Timeout | null - Long-press timer

### Component: `RadialMenu`

**Props**:
```typescript
interface RadialMenuAction {
  id: string;
  icon: React.ReactNode;
  label: string;
  onClick: () => void | Promise<void>;
  disabled?: boolean;
}

interface RadialMenuProps {
  /** Array of actions (6-8 items) */
  actions: RadialMenuAction[];

  /** Long-press threshold in milliseconds */
  threshold?: number;

  /** Position of the menu (center point) */
  position?: { x: number; y: number };

  /** Radius of the circular menu in pixels */
  radius?: number;

  /** Size of each menu item in pixels */
  itemSize?: number;

  /** Additional CSS classes */
  className?: string;
}
```

**State**:
- `isOpen`: boolean - Menu visibility
- `position`: { x: number; y: number } - Menu center coordinates
- `selectedItemId`: string | null - Currently hovered/focused item

**Layout Calculation**:
```typescript
// Calculate position for each slot
function getSlotPosition(index: number, total: number, radius: number) {
  const angle = (index / total) * Math.PI * 2 - Math.PI / 2; // Start at top
  return {
    x: Math.cos(angle) * radius,
    y: Math.sin(angle) * radius,
  };
}
```

**Viewport Edge Detection**:
```typescript
function adjustMenuPosition(
  x: number,
  y: number,
  radius: number,
  viewport: { width: number; height: number }
) {
  const padding = 20; // Min distance from edge

  // Adjust X
  const minX = radius + padding;
  const maxX = viewport.width - radius - padding;
  const adjustedX = Math.max(minX, Math.min(maxX, x));

  // Adjust Y
  const minY = radius + padding;
  const maxY = viewport.height - radius - padding;
  const adjustedY = Math.max(minY, Math.min(maxY, y));

  return { x: adjustedX, y: adjustedY };
}
```

### Component: `RadialMenuItem`

**Props**:
```typescript
interface RadialMenuItemProps {
  action: RadialMenuAction;
  position: { x: number; y: number };
  isSelected: boolean;
  onClick: () => void;
  size?: number;
}
```

**Visual States**:
- Default: Semi-transparent background, icon visible
- Hover/Focus: Brighter background, scale up (1.1x)
- Active: Primary color background
- Disabled: 50% opacity, no interaction

## Visual Design

### Colors (CSS Variables)
- Background: `var(--color-surface)` with 90% opacity
- Border: `var(--color-border)` with 50% opacity
- Icon: `var(--color-foreground)` with 80% opacity
- Selected: `var(--color-primary)` background
- Backdrop: Black with 40% opacity

### Animations

**Menu Open**:
```css
@keyframes radial-menu-open {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

**Menu Close**:
```css
@keyframes radial-menu-close {
  from {
    opacity: 1;
    transform: scale(1);
  }
  to {
    opacity: 0;
    transform: scale(0.8);
  }
}
```

**Item Appear** (staggered):
```css
@keyframes item-appear {
  from {
    opacity: 0;
    transform: translate(0, 0) scale(0.5);
  }
  to {
    opacity: 1;
    transform: translate(var(--x), var(--y)) scale(1);
  }
}
```

### Dimensions
- **Menu Radius**: 120px (mobile), 140px (desktop)
- **Item Size**: 56px × 56px
- **Icon Size**: 24px × 24px
- **Label Font Size**: 11px
- **Z-Index**: 50 (above mobile header at 30)

## Integration Points

### Home Assistant API
Actions will call `/api/ha/call` with appropriate payloads:

```typescript
// Volume mute
{
  domain: 'media_player',
  service: 'volume_mute',
  entity_id: 'media_player.sonos',
  service_data: { is_volume_muted: true }
}

// Play/pause toggle
{
  domain: 'media_player',
  service: 'media_play_pause',
  entity_id: 'media_player.living_room'
}
```

### Toast Notifications
Use `useToast()` for action feedback:
```typescript
const { success, error } = useToast();

try {
  await action.onClick();
  success('Action completed');
} catch (err) {
  error('Action failed');
}
```

## File Structure

```
apps/web/src/
├── components/mobile/
│   ├── RadialMenu.tsx           # Main container component
│   └── RadialMenuItem.tsx       # Individual menu slot
├── hooks/
│   └── useLongPress.ts          # Long-press gesture detection
└── app/dashboard/
    └── layout.tsx               # Integration point (add to MobileHeader)
```

## Implementation Phases

### Phase 1: Hook Implementation (3 hours)
- [ ] Create `useLongPress` hook
- [ ] Implement touch/mouse event handlers
- [ ] Add threshold timer logic
- [ ] Implement move cancellation
- [ ] Add haptic feedback (navigator.vibrate)
- [ ] Write unit tests for hook

### Phase 2: Component Implementation (3 hours)
- [ ] Create `RadialMenuItem` component
- [ ] Create `RadialMenu` container
- [ ] Implement position calculations
- [ ] Add viewport edge detection
- [ ] Implement animations (fade in/out, stagger)
- [ ] Add keyboard navigation support

### Phase 3: Integration (2 hours)
- [ ] Create default actions (mute, play/pause)
- [ ] Integrate into MobileHeader
- [ ] Add HA API calls
- [ ] Add toast notifications
- [ ] Test on mobile devices
- [ ] Add configurability for custom actions

## Testing Strategy

### Unit Tests
- `useLongPress` hook behavior
- Position calculation functions
- Edge detection logic

### Integration Tests
- Long-press activation
- Action execution
- Toast notifications
- HA API integration

### Manual Testing
- Touch gestures on mobile
- Mouse interaction on desktop
- Edge cases (screen edges, scrolling)
- Haptic feedback (if available)

## Accessibility

### Keyboard Navigation
- **Tab**: Focus next item
- **Enter/Space**: Activate focused item
- **Escape**: Close menu

### ARIA Attributes
```typescript
<div
  role="menu"
  aria-label="Quick actions menu"
  aria-orientation="radial"
>
  <button
    role="menuitem"
    aria-label="Mute volume"
    tabIndex={0}
  >
    ...
  </button>
</div>
```

### Screen Reader Support
- Announce menu opening: "Quick actions menu opened"
- Announce item selection: "Mute volume, button"
- Announce actions: "Volume muted"

## Performance Considerations

1. **Debounce Position Updates**: Only recalculate on resize (not scroll)
2. **CSS Transforms**: Use `translate3d` for hardware acceleration
3. **Will-Change Hint**: Add `will-change: transform` to animated elements
4. **Event Passive**: Mark touch listeners as passive where possible
5. **Conditional Rendering**: Only render when open

## Future Enhancements

1. **Gesture Shortcuts**: Swipe gestures for common actions
2. **Customizable Themes**: User-defined colors and sizes
3. **Action History**: Recently used actions appear first
4. **Multi-Level Menus**: Nested radial menus for more actions
5. **Voice Commands**: Open via voice ("Hey FROK, open quick actions")
6. **Analytics**: Track most-used actions for optimization
