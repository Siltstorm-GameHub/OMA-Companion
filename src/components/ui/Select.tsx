import type { SelectHTMLAttributes } from "react";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: "sm" | "md";
}

const SIZE_CLASSES: Record<"sm" | "md", string> = {
  sm: "text-xs px-2 py-1.5",
  md: "text-sm px-3 py-2",
};

export function Select({ size = "sm", className, children, ...rest }: SelectProps) {
  return (
    <select
      className={`bg-gray-800 border border-gray-700 text-white rounded-lg outline-none cursor-pointer transition-colors focus:border-teal-500/50 disabled:opacity-50 disabled:cursor-not-allowed ${SIZE_CLASSES[size]} ${className ?? ""}`}
      {...rest}
    >
      {children}
    </select>
  );
}
