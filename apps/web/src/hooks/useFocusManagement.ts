import { useEffect, useRef, useCallback } from 'react';

/**
 * Hook for managing focus trap within a container (useful for modals/dialogs)
 */
export function useFocusTrap<T extends HTMLElement = HTMLElement>(
  isActive = true
): React.RefObject<T> {
  const containerRef = useRef<T>(null);

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleTabKey = (event: KeyboardEvent) => {
      if (event.key !== 'Tab') return;

      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          event.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          event.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element on mount
    firstElement?.focus();

    container.addEventListener('keydown', handleTabKey);
    return () => container.removeEventListener('keydown', handleTabKey);
  }, [isActive]);

  return containerRef;
}

/**
 * Hook for restoring focus to the previously focused element
 */
export function useFocusReturn(): {
  saveFocus: () => void;
  restoreFocus: () => void;
} {
  const previouslyFocusedElement = useRef<HTMLElement | null>(null);

  const saveFocus = useCallback(() => {
    previouslyFocusedElement.current = document.activeElement as HTMLElement;
  }, []);

  const restoreFocus = useCallback(() => {
    previouslyFocusedElement.current?.focus();
    previouslyFocusedElement.current = null;
  }, []);

  return { saveFocus, restoreFocus };
}

/**
 * Hook for auto-focusing an element on mount
 */
export function useAutoFocus<T extends HTMLElement = HTMLElement>(
  shouldFocus = true
): React.RefObject<T> {
  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (shouldFocus && elementRef.current) {
      // Small delay to ensure element is rendered
      const timeoutId = setTimeout(() => {
        elementRef.current?.focus();
      }, 0);

      return () => clearTimeout(timeoutId);
    }
  }, [shouldFocus]);

  return elementRef;
}

/**
 * Hook for managing focus within a list (e.g., keyboard navigation in dropdown)
 */
export function useListFocus<T extends HTMLElement = HTMLElement>(options: {
  enabled?: boolean;
  loop?: boolean; // Whether to loop from end to start
} = {}): {
  containerRef: React.RefObject<T>;
  focusNext: () => void;
  focusPrevious: () => void;
  focusFirst: () => void;
  focusLast: () => void;
} {
  const { enabled = true, loop = true } = options;
  const containerRef = useRef<T>(null);

  const getFocusableElements = useCallback((): HTMLElement[] => {
    if (!containerRef.current) return [];

    return Array.from(
      containerRef.current.querySelectorAll<HTMLElement>(
        '[role="option"], [role="menuitem"], button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    );
  }, []);

  const focusNext = useCallback(() => {
    if (!enabled) return;

    const elements = getFocusableElements();
    const currentIndex = elements.findIndex((el) => el === document.activeElement);

    if (currentIndex === -1) {
      elements[0]?.focus();
    } else if (currentIndex < elements.length - 1) {
      elements[currentIndex + 1]?.focus();
    } else if (loop) {
      elements[0]?.focus();
    }
  }, [enabled, loop, getFocusableElements]);

  const focusPrevious = useCallback(() => {
    if (!enabled) return;

    const elements = getFocusableElements();
    const currentIndex = elements.findIndex((el) => el === document.activeElement);

    if (currentIndex === -1) {
      elements[elements.length - 1]?.focus();
    } else if (currentIndex > 0) {
      elements[currentIndex - 1]?.focus();
    } else if (loop) {
      elements[elements.length - 1]?.focus();
    }
  }, [enabled, loop, getFocusableElements]);

  const focusFirst = useCallback(() => {
    if (!enabled) return;
    const elements = getFocusableElements();
    elements[0]?.focus();
  }, [enabled, getFocusableElements]);

  const focusLast = useCallback(() => {
    if (!enabled) return;
    const elements = getFocusableElements();
    elements[elements.length - 1]?.focus();
  }, [enabled, getFocusableElements]);

  useEffect(() => {
    if (!enabled || !containerRef.current) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          focusNext();
          break;
        case 'ArrowUp':
          event.preventDefault();
          focusPrevious();
          break;
        case 'Home':
          event.preventDefault();
          focusFirst();
          break;
        case 'End':
          event.preventDefault();
          focusLast();
          break;
      }
    };

    containerRef.current.addEventListener('keydown', handleKeyDown);
    return () => containerRef.current?.removeEventListener('keydown', handleKeyDown);
  }, [enabled, focusNext, focusPrevious, focusFirst, focusLast]);

  return { containerRef, focusNext, focusPrevious, focusFirst, focusLast };
}

/**
 * Utility to check if element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  if (element.tabIndex < 0) return false;
  if (element.hasAttribute('disabled')) return false;

  const tagName = element.tagName.toLowerCase();
  const focusableTags = ['a', 'button', 'input', 'select', 'textarea'];

  return (
    focusableTags.includes(tagName) ||
    element.hasAttribute('tabindex') ||
    element.hasAttribute('contenteditable')
  );
}

/**
 * Utility to find all focusable elements within a container
 */
export function findFocusableElements(container: HTMLElement): HTMLElement[] {
  const selector =
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]), [contenteditable]';

  return Array.from(container.querySelectorAll<HTMLElement>(selector));
}
