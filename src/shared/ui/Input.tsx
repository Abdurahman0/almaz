import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes, TextareaHTMLAttributes, ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

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

export type PasswordInputProps = Omit<InputProps, 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ label, error, className = '', ...rest }, ref) => {
    const [shown, setShown] = useState(false);
    const Icon = shown ? EyeOff : Eye;
    return (
      <FieldWrap label={label} error={error}>
        <span className="relative block">
          <input
            ref={ref}
            type={shown ? 'text' : 'password'}
            className={`${fieldCls} pr-10 ${error ? 'border-danger-soft' : ''} ${className}`}
            {...rest}
          />
          <button
            type="button"
            aria-label={shown ? 'Parolni yashirish' : "Parolni ko'rsatish"}
            aria-pressed={shown}
            onMouseDown={(e) => e.preventDefault()} // keep input focus
            onClick={() => setShown((s) => !s)}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-muted transition-colors hover:text-text"
          >
            <Icon className="h-4 w-4" strokeWidth={1.5} />
          </button>
        </span>
      </FieldWrap>
    );
  },
);
PasswordInput.displayName = 'PasswordInput';

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
