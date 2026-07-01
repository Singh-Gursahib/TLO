"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { cn } from "@/lib/utils";

type ToastKind = "success" | "error" | "info";
interface Toast {
  id: number;
  kind: ToastKind;
  message: string;
}

const ToastCtx = createContext<{
  toast: (message: string, kind?: ToastKind) => void;
}>({ toast: () => {} });

export function useToast() {
  return useContext(ToastCtx);
}

let counter = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, kind: ToastKind = "success") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, kind, message }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3600);
  }, []);

  const dismiss = (id: number) => setToasts((t) => t.filter((x) => x.id !== id));

  return (
    <ToastCtx.Provider value={{ toast }}>
      {children}
      <div className="fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-4 pointer-events-none">
        {toasts.map((t) => {
          const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Info;
          const color =
            t.kind === "success" ? "text-ok" : t.kind === "error" ? "text-danger" : "text-info";
          return (
            <div
              key={t.id}
              className="pointer-events-auto animate-rise flex items-center gap-3 rounded-xl bg-surface border border-line shadow-pop px-4 py-3 max-w-sm w-full"
            >
              <Icon className={cn("h-5 w-5 shrink-0", color)} />
              <p className="text-sm text-body flex-1">{t.message}</p>
              <button onClick={() => dismiss(t.id)} className="text-muted hover:text-body">
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastCtx.Provider>
  );
}
