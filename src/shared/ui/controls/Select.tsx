import { forwardRef, type ReactNode } from 'react';
import * as RadixSelect from '@radix-ui/react-select';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { FieldWrap } from '../Input';
import { Combobox } from './Combobox';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
  group?: string;
}

export interface SelectProps {
  options: SelectOption[];
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
  /** Force/disable the searchable variant; default: automatic when > 10 options. */
  searchable?: boolean;
  name?: string;
}

export const triggerCls = (size: 'sm' | 'md', error?: string) =>
  `flex w-full items-center justify-between gap-2 rounded-lg border bg-bg px-3 text-left text-sm text-text transition-colors duration-150 hover:border-strong focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-45 data-[placeholder]:text-muted ${
    size === 'sm' ? 'h-8' : 'h-10'
  } ${error ? 'border-danger' : 'border-border'}`;

function groupOptions(options: SelectOption[]): Array<[string | null, SelectOption[]]> {
  const map = new Map<string | null, SelectOption[]>();
  for (const o of options) {
    const key = o.group ?? null;
    if (!map.has(key)) map.set(key, []);
    map.get(key)?.push(o);
  }
  return Array.from(map.entries());
}

/** Handmade themed select. Automatically becomes a searchable combobox for long lists. */
export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  { options, value, onChange, placeholder = 'Tanlang...', label, error, disabled, size = 'md', searchable, name },
  ref,
) {
  const useSearch = searchable ?? options.length > 10;
  if (useSearch) {
    return (
      <Combobox
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        label={label}
        error={error}
        disabled={disabled}
        size={size}
      />
    );
  }

  return (
    <FieldWrap label={label} error={error}>
      <RadixSelect.Root value={value || undefined} onValueChange={onChange} disabled={disabled} name={name}>
        <RadixSelect.Trigger ref={ref} className={`group ${triggerCls(size, error)}`} aria-invalid={Boolean(error)}>
          <span className="min-w-0 truncate">
            <RadixSelect.Value placeholder={placeholder} />
          </span>
          <RadixSelect.Icon>
            <ChevronDown
              className="h-4 w-4 shrink-0 text-muted transition-transform duration-150 group-data-[state=open]:rotate-180"
              strokeWidth={1.5}
            />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content
            position="popper"
            sideOffset={4}
            className="float-panel float-in z-40 max-h-80 w-[var(--radix-select-trigger-width)] overflow-hidden"
          >
            <RadixSelect.ScrollUpButton className="flex h-6 items-center justify-center text-muted">
              <ChevronUp className="h-4 w-4" strokeWidth={1.5} />
            </RadixSelect.ScrollUpButton>
            <RadixSelect.Viewport className="max-h-72 overflow-y-auto p-1">
              {groupOptions(options).map(([group, items]) => (
                <RadixSelect.Group key={group ?? '_'}>
                  {group && (
                    <RadixSelect.Label className="px-3 pb-1 pt-2 text-2xs uppercase tracking-caps text-muted">
                      {group}
                    </RadixSelect.Label>
                  )}
                  {items.map((o) => (
                    <RadixSelect.Item
                      key={o.value}
                      value={o.value}
                      disabled={o.disabled}
                      className="flex min-h-9 cursor-pointer select-none items-center gap-2 rounded-md px-3 py-1.5 text-sm text-text outline-none data-[disabled]:cursor-not-allowed data-[highlighted]:bg-surface-2 data-[disabled]:opacity-45 data-[state=checked]:text-accent-ink"
                    >
                      {o.icon && <span className="shrink-0 text-muted">{o.icon}</span>}
                      <span className="min-w-0 flex-1">
                        <RadixSelect.ItemText>{o.label}</RadixSelect.ItemText>
                        {o.description && (
                          <span className="mt-0.5 line-clamp-2 block text-xs text-muted">{o.description}</span>
                        )}
                      </span>
                      <RadixSelect.ItemIndicator>
                        <Check className="h-4 w-4 shrink-0" strokeWidth={2} />
                      </RadixSelect.ItemIndicator>
                    </RadixSelect.Item>
                  ))}
                </RadixSelect.Group>
              ))}
            </RadixSelect.Viewport>
            <RadixSelect.ScrollDownButton className="flex h-6 items-center justify-center text-muted">
              <ChevronDown className="h-4 w-4" strokeWidth={1.5} />
            </RadixSelect.ScrollDownButton>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </FieldWrap>
  );
});
