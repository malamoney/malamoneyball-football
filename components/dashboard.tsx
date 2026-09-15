"use client";

import { useQuery } from "@tanstack/react-query";
import type { SortingState } from "@tanstack/react-table";
import {
  CalendarDays,
  ChevronRight,
  CircleCheck,
  ExternalLink,
  Megaphone,
  RotateCcw,
  ShieldCheck,
  Trophy,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { LeagueHeader } from "@/components/league-header";
import { SectionHeading } from "@/components/section-heading";
import { StandingsTable } from "@/components/standings-table";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ContestsResponseSchema,
  StandingsResponseSchema,
  UpcomingContestsResponseSchema,
  type ContestSummary,
  type UpcomingContest,
} from "@/src/web-schemas";

const defaultStandingsSorting: SortingState = [
  { id: "wins", desc: true },
  { id: "totalPoints", desc: true },
];

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function formatContestDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function LoadingRows() {
  return (
    <div className="space-y-3 p-6" aria-label="Loading standings">
      {Array.from({ length: 6 }, (_, index) => (
        <div
          key={index}
          className="h-14 animate-pulse rounded-xl bg-slate-100"
        />
      ))}
    </div>
  );
}

function ContestRow({ contest }: { contest: ContestSummary }) {
  return (
    <Link
      href={`/contests/${encodeURIComponent(contest.contestKey)}`}
      className="group flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4 outline-none transition-colors hover:border-violet-100 hover:bg-violet-50/40 focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-2 sm:px-5"
    >
      <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-violet-700 shadow-sm ring-1 ring-slate-100">
        <Trophy className="size-5" aria-hidden="true" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900">{contest.name}</p>
        <p className="mt-1 text-xs text-slate-500">
          {contest.participantCount} participants · {contest.contestStartTime
            ? `Contest ${formatContestDate(contest.contestStartTime)}`
            : "Contest date unavailable"}
        </p>
      </div>
      <span className="hidden rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 ring-1 ring-slate-200 sm:inline-flex">
        #{contest.contestKey}
      </span>
      <ChevronRight className="size-4 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-violet-500" />
    </Link>
  );
}

function UpcomingContestAlert({ contest }: { contest: UpcomingContest }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-amber-950 shadow-sm sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-start gap-3 sm:items-center">
        <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/80 text-amber-700 ring-1 ring-amber-200">
          <Megaphone className="size-5" aria-hidden="true" />
        </div>
        <p className="min-w-0 text-sm font-semibold sm:text-base">
          {contest.name} is currently drafting
        </p>
      </div>
      <a
        href={contest.contestUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex h-8 shrink-0 items-center justify-center gap-1.5 self-start rounded-full bg-slate-950 px-4 text-xs font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 sm:self-auto"
      >
        Draft
        <ExternalLink className="size-3" aria-hidden="true" />
      </a>
    </div>
  );
}

export function Dashboard({ seasonName }: { seasonName: string }) {
  const [standingsSorting, setStandingsSorting] = useState<SortingState>(
    defaultStandingsSorting,
  );
  const encodedSeason = encodeURIComponent(seasonName);
  const standingsQuery = useQuery({
    queryKey: ["standings", seasonName],
    queryFn: async () =>
      StandingsResponseSchema.parse(
        await fetchJson(`/api/standings?season=${encodedSeason}`),
      ),
  });
  const contestsQuery = useQuery({
    queryKey: ["contests", seasonName],
    queryFn: async () =>
      ContestsResponseSchema.parse(
        await fetchJson(`/api/contests?season=${encodedSeason}`),
      ),
  });
  const upcomingContestsQuery = useQuery({
    queryKey: ["upcoming-contests", seasonName],
    queryFn: async () => {
      const response = await fetch(
        `/api/upcoming-contests?season=${encodedSeason}`,
        { cache: "no-store" },
      );
      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }
      return UpcomingContestsResponseSchema.parse(await response.json());
    },
    gcTime: 0,
    refetchOnMount: "always",
    staleTime: 0,
  });

  const resetStandingsSorting = () => {
    setStandingsSorting(defaultStandingsSorting.map((sort) => ({ ...sort })));
  };

  return (
    <div id="top" className="page-backdrop min-h-screen px-3 py-3 sm:px-6 sm:py-6">
      <main className="dashboard-shell mx-auto min-h-[calc(100vh-48px)] max-w-[1800px] rounded-[28px] border border-white/70 bg-[#e9eef2] p-4 shadow-[0_22px_80px_rgba(15,23,42,0.14)] sm:p-7">
        <LeagueHeader seasonName={seasonName} />

        <section id="standings" className="scroll-mt-6 pt-7 sm:pt-9">
          {upcomingContestsQuery.data?.upcomingContests.length ? (
            <div className="mb-4 space-y-3">
              {upcomingContestsQuery.data.upcomingContests.map((contest) => (
                <UpcomingContestAlert
                  key={contest.upcomingContestId}
                  contest={contest}
                />
              ))}
            </div>
          ) : null}
          <SectionHeading>Standings</SectionHeading>
          <Card className="mt-4 overflow-hidden">
            <CardHeader className="flex-row items-start justify-between gap-5 border-b border-slate-100 p-5 sm:items-center sm:p-7">
              <div>
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                  <CircleCheck className="size-4" /> Current season
                </div>
                <CardTitle className="text-2xl sm:text-[28px]">League standings</CardTitle>
                <CardDescription className="mt-1.5">
                  Every matchup, point, and result for {seasonName}.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={resetStandingsSorting}
                className="shrink-0"
                aria-label="Reset standings to the default order"
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                <span className="hidden sm:inline">Default view</span>
              </Button>
            </CardHeader>

            <div className="grid border-b border-slate-100 sm:grid-cols-3">
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 sm:border-b-0 sm:border-r">
                <Users className="size-5 text-violet-600" />
                <div>
                  <p className="text-lg font-bold text-slate-950">{standingsQuery.data?.standings.length ?? "—"}</p>
                  <p className="text-xs text-slate-500">League participants</p>
                </div>
              </div>
              <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4 sm:border-b-0 sm:border-r">
                <CalendarDays className="size-5 text-sky-600" />
                <div>
                  <p className="text-sm font-bold text-slate-950">{seasonName}</p>
                  <p className="text-xs text-slate-500">Active season</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-6 py-4">
                <ShieldCheck className="size-5 text-emerald-600" />
                <div>
                  <p className="text-sm font-bold text-slate-950">Verified results</p>
                  <p className="text-xs text-slate-500">DraftKings data</p>
                </div>
              </div>
            </div>

            {standingsQuery.isPending ? (
              <LoadingRows />
            ) : standingsQuery.isError ? (
              <div className="p-8 text-center">
                <p className="font-semibold text-slate-900">We couldn&apos;t load the standings.</p>
                <p className="mt-1 text-sm text-slate-500">Check the database connection and try again.</p>
              </div>
            ) : (
              <StandingsTable
                data={standingsQuery.data.standings}
                sorting={standingsSorting}
                onSortingChange={setStandingsSorting}
              />
            )}
          </Card>
        </section>

        <section id="contests" className="scroll-mt-6 pt-8 sm:pt-10">
          <SectionHeading>Contests</SectionHeading>
          <Card className="mt-4">
            <CardHeader className="border-b border-slate-100 p-5 sm:p-7">
              <CardTitle>Contest history</CardTitle>
              <CardDescription>
                Imported contests that contribute to the current standings.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-5 sm:p-7">
              {contestsQuery.isPending ? (
                <div className="h-24 animate-pulse rounded-2xl bg-slate-100" />
              ) : contestsQuery.isError ? (
                <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-700">
                  Contest history is temporarily unavailable.
                </div>
              ) : contestsQuery.data.contests.length === 0 ? (
                <div className="flex min-h-44 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-8 text-center">
                  <div className="grid size-12 place-items-center rounded-2xl bg-white text-violet-600 shadow-sm ring-1 ring-slate-100">
                    <Trophy className="size-5" />
                  </div>
                  <p className="mt-4 font-semibold text-slate-900">No contests imported yet</p>
                  <p className="mt-1 max-w-md text-sm text-slate-500">
                    Run <code className="rounded bg-white px-1.5 py-0.5 text-xs">npm run contest:import</code> after a contest to add it here.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {contestsQuery.data.contests.map((contest) => (
                    <ContestRow key={contest.contestKey} contest={contest} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        <footer className="flex items-center justify-between px-2 pb-1 pt-7 text-xs text-slate-400">
          <span>© {new Date().getFullYear()} Malamoneyball</span>
          <span>Built for the league</span>
        </footer>
      </main>
    </div>
  );
}
