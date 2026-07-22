import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`card-velvet p-5 ${className}`} {...rest} />;
}

interface HoverCardProps {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}

/** Card with a quiet hover: 2px lift + slightly stronger border. */
export function HoverCard({ children, className = '', onClick }: HoverCardProps) {
  return (
    <div
      onClick={onClick}
      className={`card-velvet p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-strong ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}
