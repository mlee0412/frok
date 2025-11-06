'use client';

import * as React from 'react';
import { Input } from './Input';

export type FormFieldProps = {
  label?: string;
  error?: string;
  required?: boolean;
  description?: string;
} & React.ComponentPropsWithoutRef<typeof Input>;

export function FormField({ label, error, required, description, ...inputProps }: FormFieldProps) {
  const id = inputProps.id || inputProps.name;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={id}
          className="block text-sm font-medium text-foreground"
        >
          {label}
          {required && <span className="text-danger ml-1">*</span>}
        </label>
      )}
      <Input
        {...inputProps}
        id={id}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : description ? `${id}-description` : undefined}
        className={[
          inputProps.className,
          error ? 'border-danger focus:border-danger' : '',
        ].filter(Boolean).join(' ')}
      />
      {description && !error && (
        <p id={`${id}-description`} className="text-xs text-foreground/60">
          {description}
        </p>
      )}
      {error && (
        <p
          id={`${id}-error`}
          className="text-xs text-danger"
          role="alert"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export type FormProps = {
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  className?: string;
};

export function Form({ onSubmit, children, className }: FormProps) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(e);
      }}
      className={className}
      noValidate
    >
      {children}
    </form>
  );
}
