"use client";

import { Phone, MessageSquare, Mail } from "lucide-react";
import { telHref, smsHref, mailHref } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** Quick call / text / email buttons for a single contact. */
export function ContactActions({
  phone,
  email,
  compact = false,
  className,
}: {
  phone?: string | null;
  email?: string | null;
  compact?: boolean;
  className?: string;
}) {
  const btn = compact ? "h-9 w-9" : "h-10 w-10";
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {phone && (
        <>
          <a href={telHref(phone)} className={cn("icon-btn bg-brand-50 text-brand-700 hover:bg-brand-100", btn)} aria-label="Call">
            <Phone className="h-[18px] w-[18px]" />
          </a>
          <a href={smsHref(phone)} className={cn("icon-btn bg-brand-50 text-brand-700 hover:bg-brand-100", btn)} aria-label="Text">
            <MessageSquare className="h-[18px] w-[18px]" />
          </a>
        </>
      )}
      {email && (
        <a href={mailHref(email)} className={cn("icon-btn bg-brand-50 text-brand-700 hover:bg-brand-100", btn)} aria-label="Email">
          <Mail className="h-[18px] w-[18px]" />
        </a>
      )}
    </div>
  );
}
