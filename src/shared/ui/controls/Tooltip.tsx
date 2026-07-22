import type { ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';

export function TooltipProvider({ children }: { children: ReactNode }) {
  return <RadixTooltip.Provider delayDuration={300}>{children}</RadixTooltip.Provider>;
}

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/** Themed tooltip — replaces every native heading="" attribute. */
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="float-in z-40 max-w-60 rounded-lg border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-text shadow-card"
        >
          {content}
          <RadixTooltip.Arrow className="fill-[var(--surface-2)]" width={12} height={6} />
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
