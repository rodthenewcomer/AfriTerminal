import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@wariba/core/utils";

type Variant = "default" | "ghost" | "outline" | "accent" | "danger";
type Size = "sm" | "md" | "icon";

const variants: Record<Variant, string> = {
  default:
    "bg-ink text-background hover:opacity-90 dark:bg-surface-2 dark:text-ink dark:hover:bg-surface-2/70 border border-transparent dark:border-line",
  ghost: "hover:bg-surface-2 text-ink-2 hover:text-ink",
  outline: "border border-line bg-surface/60 hover:bg-surface-2 text-ink",
  accent:
    "bg-accent/15 text-accent border border-accent/30 hover:bg-accent/25",
  danger: "bg-down/15 text-down border border-down/30 hover:bg-down/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-9 px-4 text-sm",
  icon: "h-8 w-8",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "md", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:pointer-events-none focus-visible:outline-2 focus-visible:outline-accent",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
