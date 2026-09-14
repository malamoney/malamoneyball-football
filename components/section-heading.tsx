import type { ReactNode } from "react";

export function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="inline-flex h-11 items-center rounded-full border border-white/90 bg-white px-5 text-sm font-bold tracking-tight text-slate-950 shadow-sm">
      {children}
    </div>
  );
}
