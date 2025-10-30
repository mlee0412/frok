/**
 * Utility for conditionally joining classNames together
 * Similar to clsx/classnames but lightweight
 */
export function cn(...classes: Array<string | false | undefined | null>): string {
  return classes.filter(Boolean).join(' ');
}
