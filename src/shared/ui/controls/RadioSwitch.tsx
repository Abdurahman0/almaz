import { forwardRef } from 'react';
import * as RadixRadio from '@radix-ui/react-radio-group';
import * as RadixSwitch from '@radix-ui/react-switch';

export interface RadioOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  name?: string;
}

/** 18px themed radio circles; inner dot scales in. */
export const RadioGroup = forwardRef<HTMLDivElement, RadioGroupProps>(function RadioGroup(
  { options, value, onChange, disabled, name },
  ref,
) {
  return (
    <RadixRadio.Root
      ref={ref}
      value={value}
      onValueChange={onChange}
      disabled={disabled}
      name={name}
      className="flex flex-col gap-2.5"
    >
      {options.map((o) => (
        <label
          key={o.value}
          className={`inline-flex select-none items-center gap-2.5 text-sm text-text ${
            o.disabled || disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
          }`}
        >
          <RadixRadio.Item
            value={o.value}
            disabled={o.disabled}
            className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border border-strong bg-bg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg data-[state=checked]:border-accent-btn"
          >
            <RadixRadio.Indicator className="h-2.5 w-2.5 animate-[dotIn_120ms_ease-out] rounded-full bg-accent-btn" />
          </RadixRadio.Item>
          {o.label}
        </label>
      ))}
    </RadixRadio.Root>
  );
});

interface SwitchProps {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
}

/** 36×20 pill switch, thumb slides with a slight squash. */
export const Switch = forwardRef<HTMLButtonElement, SwitchProps>(function Switch(
  { checked, onCheckedChange, disabled, label },
  ref,
) {
  const control = (
    <RadixSwitch.Root
      ref={ref}
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="relative h-5 w-9 shrink-0 rounded-full border border-strong bg-surface-2 transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-bg disabled:cursor-not-allowed disabled:opacity-45 data-[state=checked]:border-accent-btn data-[state=checked]:bg-accent-btn"
    >
      <RadixSwitch.Thumb className="block h-3.5 w-3.5 translate-x-[3px] rounded-full bg-text transition-transform duration-[140ms] ease-out active:scale-x-110 data-[state=checked]:translate-x-[19px] data-[state=checked]:bg-on-accent" />
    </RadixSwitch.Root>
  );
  if (!label) return control;
  return (
    <label
      className={`inline-flex select-none items-center gap-2.5 text-sm text-text ${
        disabled ? 'cursor-not-allowed opacity-45' : 'cursor-pointer'
      }`}
    >
      {control}
      {label}
    </label>
  );
});
