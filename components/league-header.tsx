import Image from "next/image";
import { CircleUserRound, Settings2 } from "lucide-react";

import { Button } from "@/components/ui/button";

export function LeagueHeader({ seasonName }: { seasonName: string }) {
  return (
    <header className="flex min-h-20 items-center justify-between gap-6 rounded-2xl border border-white bg-white px-5 py-4 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:px-7">
      <a href="#top" aria-label="Malamoneyball home" className="shrink-0">
        <Image
          src="/malamoneyball-logo.png"
          width={214}
          height={26}
          priority
          alt="Malamoneyball"
          className="h-auto w-[168px] sm:w-[214px]"
        />
      </a>

      <nav className="hidden items-center gap-8 text-sm font-medium text-slate-500 md:flex">
        <a className="transition-colors hover:text-slate-950" href="#top">Home</a>
        <a className="font-semibold text-slate-950" href="#standings">Standings</a>
        <a className="transition-colors hover:text-slate-950" href="#contests">Contests</a>
      </nav>

      <div className="flex items-center gap-2 sm:gap-3">
        <Button variant="ghost" size="icon" aria-label="Dashboard settings">
          <Settings2 className="size-5" />
        </Button>
        <div className="hidden rounded-full bg-gradient-to-r from-violet-100 to-sky-100 px-4 py-2 text-xs font-bold text-violet-800 sm:block">
          {seasonName}
        </div>
        <div className="grid size-10 place-items-center rounded-full bg-slate-950 text-white">
          <CircleUserRound className="size-5" aria-hidden="true" />
        </div>
      </div>
    </header>
  );
}
