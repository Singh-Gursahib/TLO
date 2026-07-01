import { cn } from "@/lib/utils";

/** The Little Orbits brand badge (white TLO planet on teal). */
export function LogoMark({ className }: { className?: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  return (
    <img
      src="/logo-badge.png"
      alt="The Little Orbits"
      className={cn("h-9 w-9 rounded-[22%] object-contain", className)}
    />
  );
}

export function Logo({
  className,
  markClassName,
  showText = true,
}: {
  className?: string;
  markClassName?: string;
  showText?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn("h-9 w-9", markClassName)} />
      {showText && (
        <div className="leading-none">
          <div className="text-[15px] font-semibold tracking-tight text-ink">The Little Orbits</div>
          <div className="text-[11px] text-muted mt-0.5">Daycare Operations</div>
        </div>
      )}
    </div>
  );
}
