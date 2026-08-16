import type { InputHTMLAttributes } from "react";

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function TextInput({ label, error, id, className = "", ...rest }: TextInputProps) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      <input
        id={inputId}
        className={`min-h-12 rounded-lg border border-gray-300 px-4 text-base focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200 ${className}`}
        {...rest}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
