"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export interface SegOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: SegOption<T>[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={cn("seg overflow-x-auto no-scrollbar", className)}>
      {options.map((o) => {
        const Icon = o.icon;
        return (
          <button
            key={o.value}
            type="button"
            data-active={value === o.value}
            className="seg-item"
            onClick={() => onChange(o.value)}
          >
            {Icon && <Icon className="h-4 w-4 mr-1.5" />}
            {o.label}
            {typeof o.count === "number" && (
              <span
                className={cn(
                  "ml-1.5 rounded-full px-1.5 text-[11px] font-semibold",
                  value === o.value ? "bg-brand-100 text-brand-800" : "bg-line text-muted"
                )}
              >
                {o.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
