import type { ReactNode } from 'react';

interface PageHeaderProps {
  heading: string;
  subheading?: string;
  actions?: ReactNode;
}

export function PageHeader({ heading, subheading, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-xl text-text">{heading}</h1>
        {subheading && <p className="mt-0.5 text-sm text-muted">{subheading}</p>}
      </div>
      {actions && <div className="flex items-center gap-3">{actions}</div>}
    </div>
  );
}
