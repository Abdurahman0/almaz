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
  'inline-flex items-center justify-center gap-2 rounded-[var(--r-md)] font-semibold transition-[background-color,box-shadow,transform,color] duration-150 ease-out2 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-bg';

const variants: Record<Variant, string> = {
  /* --accent-btn is preset-tuned: raw accent on dark, darkened accent on light — keeps label AA. */
  primary: 'bg-accent-btn text-on-accent shadow-xs hover:bg-accent-btn-hover hover:shadow-sm',
  secondary: 'bg-surface-2 text-text hover:bg-accent-soft border border-border',
  ghost: 'text-muted hover:text-text hover:bg-accent-soft',
  danger: 'bg-danger-soft text-danger hover:bg-danger/15',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-xs',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
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
