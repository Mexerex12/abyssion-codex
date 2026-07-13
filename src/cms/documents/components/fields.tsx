import type { ReactNode } from "react";

export const inputCls =
  "w-full border border-input bg-surface-1 px-3 py-2 text-sm text-foreground focus:border-cyan focus:outline-none";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <label className="hud-label mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}

export function SelectField<T extends string>({
  label,
  value,
  options,
  onChange,
  getOptionLabel,
}: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (value: T) => void;
  getOptionLabel?: (value: T) => string;
}) {
  return (
    <Field label={label}>
      <select
        className={inputCls}
        value={value}
        onChange={(event) => onChange(event.target.value as T)}
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {getOptionLabel ? getOptionLabel(option) : option}
          </option>
        ))}
      </select>
    </Field>
  );
}
