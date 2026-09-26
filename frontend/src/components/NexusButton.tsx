import type { ButtonHTMLAttributes, ReactNode } from "react";
import { clsx } from "clsx";

interface NexusButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  variant?: "primary" | "ghost";
}

export function NexusButton({ children, className, icon, type = "button", variant = "primary", ...props }: NexusButtonProps) {
  return (
    <button className={clsx("nexus-button", `nexus-button--${variant}`, className)} type={type} {...props}>
      {icon ? <span className="nexus-button__icon">{icon}</span> : null}
      <span>{children}</span>
    </button>
  );
}
