import type { InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  hint?: string;
  error?: string;
}

export function TextInput({
  label,
  hint,
  error,
  id,
  className = "",
  ...rest
}: TextInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={inputId} className="text-sm font-medium text-sand-700">
        {label}
      </label>
      <input
        id={inputId}
        className={`min-h-12 rounded-xl border bg-white px-4 text-base text-sand-900 transition-colors placeholder:text-sand-500 focus:outline-none focus:ring-2 ${
          error
            ? "border-red-400 focus:border-red-500 focus:ring-red-200"
            : "border-sand-300 focus:border-brand-600 focus:ring-brand-200"
        } ${className}`}
        {...rest}
      />
      {hint && !error && <p className="text-xs text-sand-500">{hint}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
