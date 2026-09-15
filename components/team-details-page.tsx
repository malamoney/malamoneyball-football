"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  CircleAlert,
  CircleCheck,
  Gauge,
  Hash,
  Percent,
  Sparkles,
  Target,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { LeagueHeader } from "@/components/league-header";
import { SectionHeading } from "@/components/section-heading";
import { TeamAvatar } from "@/components/team-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  TeamDetailsResponseSchema,
  type TeamContestResult,
  type TeamRosterPlayer,
} from "@/src/web-schemas";

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function formatPoints(value: number): string {
  return value.toFixed(2);
}

function formatPercent(value: number): string {
  return `${value.toFixed(1).replace(/\.0$/, "")}%`;
}

function formatSalary(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function PlayerImage({ player }: { player: TeamRosterPlayer }) {
  const [failed, setFailed] = useState(false);

  if (failed || !player.playerImage) {
    return (
      <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-400">
        <span className="text-xs font-bold">{player.playerName.slice(0, 2)}</span>
      </div>
    );
  }

  return (
    <div className="size-10 shrink-0 overflow-hidden rounded-xl bg-slate-100">
      <img
        src={player.playerImage}
        alt=""
        className="size-full object-cover"
        onError={() => setFailed(true)}
        referrerPolicy="no-referrer"
      />
    </div>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Trophy;
}) {
  return (
    <Card className="rounded-2xl shadow-[0_10px_30px_rgba(15,23,42,0.04)]">
      <CardContent className="flex h-full min-h-32 flex-col justify-between p-4">
        <div className="grid size-9 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
          <Icon className="size-4.5" aria-hidden="true" />
        </div>
        <div className="mt-5">
          <p className="text-xl font-bold tabular-nums text-slate-950">{value}</p>
          <p className="mt-0.5 text-xs font-medium text-slate-500">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function RosterPlayer({ player }: { player: TeamRosterPlayer }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <span className="grid min-w-8 place-items-center rounded-lg bg-violet-50 px-1.5 py-1 text-[10px] font-bold text-violet-700">
        {player.position}
      </span>
      <PlayerImage player={player} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{player.playerName}</p>
        <p className="mt-0.5 text-[11px] text-slate-500">
          {formatSalary(player.salary)} · {formatPercent(player.percentDrafted)} drafted
        </p>
        {player.statsDescription ? (
          <p className="mt-1 truncate text-[10px] text-slate-400" title={player.statsDescription}>
            {player.statsDescription}
          </p>
        ) : null}
      </div>
      <div className="text-right">
        <p className="text-sm font-bold tabular-nums text-slate-900">
          {formatPoints(player.fantasyPoints)}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">points</p>
      </div>
    </div>
  );
}

function ContestCard({ contest }: { contest: TeamContestResult }) {
  const outcomeColor =
    contest.outcome === "WIN"
      ? "bg-emerald-50 text-emerald-700"
      : contest.outcome === "LOSS"
        ? "bg-rose-50 text-rose-700"
        : "bg-amber-50 text-amber-700";

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-slate-100 p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${outcomeColor}`}>
                {contest.outcome}
              </span>
              {contest.isOverridden ? (
                <span className="rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-bold text-sky-700">
                  Adjusted result
                </span>
              ) : null}
            </div>
            <CardTitle className="text-lg">{contest.name}</CardTitle>
          </div>
          <div className="flex gap-2">
            <div className="rounded-xl bg-slate-50 px-3 py-2 text-center">
              <p className="text-base font-bold tabular-nums text-slate-950">#{contest.place}</p>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">Place</p>
            </div>
            <div className="rounded-xl bg-violet-50 px-3 py-2 text-center">
              <p className="text-base font-bold tabular-nums text-violet-800">
                {formatPoints(contest.fantasyPoints)}
              </p>
              <p className="text-[10px] uppercase tracking-wide text-violet-500">Points</p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-5">
        {contest.roster.length > 0 ? (
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
            {contest.roster.map((player, index) => (
              <RosterPlayer
                key={`${contest.contestKey}-${player.position}-${index}`}
                player={player}
              />
            ))}
          </div>
        ) : contest.resultSource === "missing_default" ? (
          <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
            <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
            This team did not enter a lineup before the contest deadline.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
            Lineup details are unavailable for this contest.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-5">
      <div className="h-44 animate-pulse rounded-[22px] bg-white/80" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
        {Array.from({ length: 7 }, (_, index) => (
          <div key={index} className="h-32 animate-pulse rounded-2xl bg-white/80" />
        ))}
      </div>
    </div>
  );
}

export function TeamDetailsPage({
  seasonName,
  userKey,
}: {
  seasonName: string;
  userKey: string;
}) {
  const query = useQuery({
    queryKey: ["team-details", seasonName, userKey],
    queryFn: async () =>
      TeamDetailsResponseSchema.parse(
        await fetchJson(
          `/api/teams/${encodeURIComponent(userKey)}?season=${encodeURIComponent(seasonName)}`,
        ),
      ),
  });

  const team = query.data?.team;
  const metrics = team
    ? [
        { label: "Record", value: `${team.wins}-${team.losses}-${team.ties}`, icon: Target },
        { label: "Place in standings", value: `#${team.standingPlace}`, icon: Hash },
        { label: "Total Points", value: formatPoints(team.totalPoints), icon: BarChart3 },
        { label: "High Score", value: formatPoints(team.highScore), icon: Sparkles },
        { label: "Average Score", value: formatPoints(team.averageScore), icon: Gauge },
        { label: "Win Percentage", value: formatPercent(team.winPercentage), icon: Percent },
        { label: "First Place Contests", value: String(team.firstPlaceContests), icon: Trophy },
      ]
    : [];

  return (
    <div id="top" className="page-backdrop min-h-screen px-3 py-3 sm:px-6 sm:py-6">
      <main className="dashboard-shell mx-auto min-h-[calc(100vh-48px)] max-w-[1800px] rounded-[28px] border border-white/70 bg-[#e9eef2] p-4 shadow-[0_22px_80px_rgba(15,23,42,0.14)] sm:p-7">
        <LeagueHeader seasonName={seasonName} homeHref="/" />

        <div className="pt-7 sm:pt-9">
          <Link
            href="/"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/90 bg-white px-5 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:text-violet-700"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Standings
          </Link>
        </div>

        <section className="pt-4">
          {query.isPending ? (
            <LoadingState />
          ) : query.isError || !team ? (
            <Card>
              <CardContent className="p-10 text-center">
                <p className="font-semibold text-slate-900">We couldn&apos;t load this team.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Check the database connection or return to the standings.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="overflow-hidden">
                <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:p-7">
                  <TeamAvatar userName={team.participantName} className="size-16 text-lg" />
                  <div>
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                      <CircleCheck className="size-4" aria-hidden="true" /> Season profile
                    </div>
                    <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
                      {team.participantName}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">{seasonName}</p>
                  </div>
                </CardContent>
              </Card>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
                {metrics.map((metric) => (
                  <MetricCard key={metric.label} {...metric} />
                ))}
              </div>

              <section className="pt-8 sm:pt-10">
                <SectionHeading>Contests</SectionHeading>
                <div className="mt-4 space-y-4">
                  {team.contests.length === 0 ? (
                    <Card>
                      <CardContent className="p-8 text-center text-sm text-slate-500">
                        No contests have been recorded for this team yet.
                      </CardContent>
                    </Card>
                  ) : (
                    team.contests.map((contest) => (
                      <ContestCard key={contest.contestKey} contest={contest} />
                    ))
                  )}
                </div>
              </section>
            </>
          )}
        </section>

        <footer className="flex items-center justify-between px-2 pb-1 pt-7 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Malamoneyball</span>
          <span>Built for the league</span>
        </footer>
      </main>
    </div>
  );
}
