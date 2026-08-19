"use client";

export function CheckboxGroup({
  options,
  values,
  onChange,
  exclusiveValue,
}: {
  options: string[];
  values: string[];
  onChange: (next: string[]) => void;
  exclusiveValue?: string;
}) {
  function toggle(option: string) {
    if (exclusiveValue && option === exclusiveValue) {
      onChange(values.includes(exclusiveValue) ? [] : [exclusiveValue]);
      return;
    }
    const withoutExclusive = exclusiveValue ? values.filter((item) => item !== exclusiveValue) : values;
    onChange(
      withoutExclusive.includes(option)
        ? withoutExclusive.filter((item) => item !== option)
        : [...withoutExclusive, option],
    );
  }

  return (
    <div className="space-y-2 rounded-2xl bg-white/55 p-3">
      {options.map((option) => (
        <label key={option} className="flex items-start gap-2 text-sm text-[var(--ink)]">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={values.includes(option)}
            onChange={() => toggle(option)}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  );
}
