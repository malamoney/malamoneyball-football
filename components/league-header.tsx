import Image from "next/image";
import Link from "next/link";
import { CircleUserRound } from "lucide-react";

export function LeagueHeader({
  seasonName,
  homeHref = "#top",
}: {
  seasonName: string;
  homeHref?: string;
}) {
  return (
    <header className="flex min-h-20 items-center justify-between gap-6 rounded-2xl border border-white bg-white px-5 py-4 shadow-[0_10px_35px_rgba(15,23,42,0.04)] sm:px-7">
      <Link href={homeHref} aria-label="Malamoneyball home" className="shrink-0">
        <Image
          src="/malamoneyball-logo.png"
          width={2172}
          height={724}
          priority
          unoptimized
          alt="Malamoneyball"
          className="h-auto w-[168px] sm:w-[214px]"
        />
      </Link>

      <div className="flex items-center gap-2 sm:gap-3">
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
