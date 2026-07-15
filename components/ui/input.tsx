import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@wariba/core/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-9 w-full rounded-lg border border-line bg-surface/70 px-3 text-sm text-ink placeholder:text-ink-3 focus-visible:outline-2 focus-visible:outline-accent",
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-9 rounded-lg border border-line bg-surface/70 px-2.5 text-sm text-ink focus-visible:outline-2 focus-visible:outline-accent cursor-pointer",
        className
      )}
      {...props}
    >
      {children}
    </select>
  )
);
Select.displayName = "Select";
