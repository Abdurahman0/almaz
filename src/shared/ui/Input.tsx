import { forwardRef } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';

const fieldCls =
  'w-full rounded-lg border border-border bg-bg px-3 py-2 text-sm text-text placeholder:text-muted transition-colors duration-150 focus:border-accent hover:border-strong';

interface FieldWrapProps {
  label?: string;
  error?: string;
  children: ReactNode;
}

export function FieldWrap({ label, error, children }: FieldWrapProps) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="text-2xs font-semibold uppercase tracking-caps text-muted">{label}</span>
      )}
      {children}
      {error && <span className="block text-xs text-danger">{error}</span>}
    </label>
  );
}

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', ...rest }, ref) => (
    <FieldWrap label={label} error={error}>
      <input ref={ref} className={`${fieldCls} ${error ? 'border-danger-soft' : ''} ${className}`} {...rest} />
    </FieldWrap>
  ),
);
Input.displayName = 'Input';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className = '', ...rest }, ref) => (
    <FieldWrap label={label} error={error}>
      <textarea ref={ref} rows={4} className={`${fieldCls} resize-y ${className}`} {...rest} />
    </FieldWrap>
  ),
);
Textarea.displayName = 'Textarea';
