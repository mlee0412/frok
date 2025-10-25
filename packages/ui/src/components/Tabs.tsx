import * as React from 'react';

type Item = { value: string; label: string };

export type TabsProps = {
  items: Item[];
  value?: string;
  defaultValue?: string;
  onValueChange?: (v: string) => void;
  className?: string;
};

export function Tabs({ items, value, defaultValue, onValueChange, className }: TabsProps) {
  const [internal, setInternal] = React.useState(defaultValue ?? (items[0]?.value ?? ''));
  const active = value ?? internal;
  function set(v: string) {
    setInternal(v);
    onValueChange?.(v);
  }
  return (
    <div className={['w-full', className].filter(Boolean).join(' ')}>
      <div role="tablist" className="flex border-b border-border gap-1">
        {items.map((it) => (
          <button
            key={it.value}
            role="tab"
            aria-selected={active === it.value}
            onClick={() => set(it.value)}
            className={[
              'px-3 py-2 text-sm rounded-t-md border-b-2',
              active === it.value
                ? 'text-primary border-primary/60'
                : 'text-foreground/70 border-transparent hover:text-foreground',
            ].join(' ')}
          >
            {it.label}
          </button>
        ))}
      </div>
    </div>
  );
}
