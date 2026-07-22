import type { ReactNode } from 'react';
import * as Menu from '@radix-ui/react-dropdown-menu';
import { ChevronRight, MoreHorizontal } from 'lucide-react';

export interface MenuItem {
  label: string;
  icon?: ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
  disabled?: boolean;
  separatorBefore?: boolean;
  submenu?: MenuItem[];
}

const itemCls = (destructive?: boolean) =>
  `flex min-h-9 w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-1.5 text-sm outline-none data-[disabled]:cursor-not-allowed data-[highlighted]:bg-surface-2 data-[disabled]:opacity-45 ${
    destructive ? 'text-danger' : 'text-text'
  }`;

function Items({ items }: { items: MenuItem[] }) {
  return (
    <>
      {items.map((item, i) => (
        <div key={item.label + i}>
          {item.separatorBefore && <Menu.Separator className="mx-1 my-1 h-px bg-[var(--border)]" />}
          {item.submenu ? (
            <Menu.Sub>
              <Menu.SubTrigger className={itemCls(item.destructive)}>
                {item.icon && <span className="shrink-0 text-muted">{item.icon}</span>}
                <span className="flex-1">{item.label}</span>
                <ChevronRight className="h-3.5 w-3.5 text-muted" strokeWidth={1.5} />
              </Menu.SubTrigger>
              <Menu.Portal>
                <Menu.SubContent sideOffset={4} className="float-panel float-in z-40 min-w-40 p-1">
                  <Items items={item.submenu} />
                </Menu.SubContent>
              </Menu.Portal>
            </Menu.Sub>
          ) : (
            <Menu.Item
              disabled={item.disabled}
              onSelect={() => item.onSelect?.()}
              className={itemCls(item.destructive)}
            >
              {item.icon && <span className="shrink-0 text-muted">{item.icon}</span>}
              {item.label}
            </Menu.Item>
          )}
        </div>
      ))}
    </>
  );
}

interface DropdownMenuProps {
  items: MenuItem[];
  /** Custom trigger; defaults to a "⋯" icon button. */
  trigger?: ReactNode;
  ariaLabel?: string;
}

/** Row-actions / context menu — shared floating style, danger items, submenus. */
export function DropdownMenu({ items, trigger, ariaLabel = 'Amallar' }: DropdownMenuProps) {
  return (
    <Menu.Root>
      <Menu.Trigger asChild>
        {trigger ?? (
          <button
            aria-label={ariaLabel}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
          >
            <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
          </button>
        )}
      </Menu.Trigger>
      <Menu.Portal>
        <Menu.Content sideOffset={4} align="end" className="float-panel float-in z-40 min-w-44 p-1">
          <Items items={items} />
        </Menu.Content>
      </Menu.Portal>
    </Menu.Root>
  );
}
