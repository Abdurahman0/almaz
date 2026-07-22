import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Loader2 } from 'lucide-react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

const base =
  'inline-flex items-center justify-center gap-2 rounded-lg font-semibold transition-colors duration-150 disabled:opacity-50 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  /* --accent-btn is preset-tuned: raw accent on dark, darkened accent on light — keeps label AA. */
  primary: 'bg-accent-btn text-on-accent hover:bg-accent-btn-hover',
  secondary: 'border border-strong text-accent-ink hover:bg-accent-soft',
  ghost: 'text-muted hover:text-text hover:bg-accent-soft',
  danger: 'border border-danger-soft text-danger hover:bg-danger-soft',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-6 text-sm',
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, className = '', children, ...rest }, ref) => (
    <button
      ref={ref}
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={loading || rest.disabled}
      {...rest}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  ),
);
Button.displayName = 'Button';
