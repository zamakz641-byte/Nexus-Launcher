import { clsx } from "clsx";

interface NexusLogoProps {
  compact?: boolean;
  className?: string;
}

export function NexusLogo({ compact = false, className }: NexusLogoProps) {
  return (
    <div className={clsx("nexus-logo", compact && "nexus-logo--compact", className)} aria-label="Nexus">
      <img src="/assets/brand/nexus-mark.png" alt="" />
      {!compact ? <span>NEXUS</span> : null}
    </div>
  );
}
