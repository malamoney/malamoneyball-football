"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, ChevronDown, CircleAlert, Trophy, Users } from "lucide-react";
import Link from "next/link";
import { Fragment, useState } from "react";

import { LeagueHeader } from "@/components/league-header";
import { RosterPlayerCard } from "@/components/roster-player-card";
import { SectionHeading } from "@/components/section-heading";
import { TeamAvatar } from "@/components/team-avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ContestDetailsResponseSchema,
  type ContestDetailResult,
} from "@/src/web-schemas";

async function fetchJson(url: string): Promise<unknown> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  return response.json() as Promise<unknown>;
}

function formatImportedAt(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function OutcomeBadge({ outcome }: { outcome: ContestDetailResult["outcome"] }) {
  const color =
    outcome === "WIN"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
      : outcome === "LOSS"
        ? "bg-rose-50 text-rose-700 ring-rose-100"
        : "bg-amber-50 text-amber-700 ring-amber-100";

  return (
    <span className={`inline-flex min-w-14 justify-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${color}`}>
      {outcome === "WIN" ? "Win" : outcome === "LOSS" ? "Loss" : "Tie"}
    </span>
  );
}

function ExpandedLineup({ result }: { result: ContestDetailResult }) {
  if (result.roster.length > 0) {
    return (
      <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {result.roster.map((player, index) => (
          <RosterPlayerCard
            key={`${result.userKey}-${player.position}-${index}`}
            player={player}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-800">
      <CircleAlert className="size-5 shrink-0" aria-hidden="true" />
      {result.resultSource === "missing_default"
        ? "This team did not enter a lineup before the contest deadline."
        : "Lineup details are unavailable for this result."}
    </div>
  );
}

function ResultsTable({ results }: { results: ContestDetailResult[] }) {
  const [expandedUserKey, setExpandedUserKey] = useState<string | null>(null);

  const toggleResult = (userKey: string) => {
    setExpandedUserKey((current) => (current === userKey ? null : userKey));
  };

  return (
    <div className="overflow-x-auto">
      <Table className="min-w-[680px]">
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-24">Place</TableHead>
            <TableHead>Team</TableHead>
            <TableHead className="text-right">Fantasy Points</TableHead>
            <TableHead className="w-32 text-right">Result</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {results.map((result) => {
            const expanded = expandedUserKey === result.userKey;
            return (
              <Fragment key={result.userKey}>
                <TableRow
                  className="cursor-pointer outline-none focus-visible:bg-violet-50/60"
                  tabIndex={0}
                  aria-expanded={expanded}
                  onClick={() => toggleResult(result.userKey)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      toggleResult(result.userKey);
                    }
                  }}
                >
                  <TableCell>
                    <span className="font-bold tabular-nums text-slate-900">#{result.place}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <TeamAvatar userName={result.participantName} />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-slate-900">{result.participantName}</p>
                        {result.isOverridden ? (
                          <p className="text-[10px] font-semibold uppercase tracking-wide text-sky-600">
                            Adjusted result
                          </p>
                        ) : null}
                      </div>
                      <ChevronDown
                        className={`ml-1 size-4 shrink-0 text-slate-300 transition-transform duration-300 ${
                          expanded ? "rotate-180 text-violet-500" : ""
                        }`}
                        aria-hidden="true"
                      />
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold tabular-nums text-slate-700">
                    {result.fantasyPoints.toFixed(2)}
                  </TableCell>
                  <TableCell className="text-right">
                    <OutcomeBadge outcome={result.outcome} />
                  </TableCell>
                </TableRow>
                <TableRow className="border-0 hover:bg-transparent">
                  <TableCell colSpan={4} className="p-0">
                    <div
                      className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                        expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                      }`}
                      aria-hidden={!expanded}
                    >
                      <div className="overflow-hidden">
                        <div className="border-b border-slate-100 bg-slate-50/50 p-4 sm:p-5">
                          <ExpandedLineup result={result} />
                        </div>
                      </div>
                    </div>
                  </TableCell>
                </TableRow>
              </Fragment>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

export function ContestDetailsPage({
  contestKey,
  seasonName,
}: {
  contestKey: string;
  seasonName: string;
}) {
  const query = useQuery({
    queryKey: ["contest-details", seasonName, contestKey],
    queryFn: async () =>
      ContestDetailsResponseSchema.parse(
        await fetchJson(
          `/api/contests/${encodeURIComponent(contestKey)}?season=${encodeURIComponent(seasonName)}`,
        ),
      ),
  });
  const contest = query.data?.contest;

  return (
    <div id="top" className="page-backdrop min-h-screen px-3 py-3 sm:px-6 sm:py-6">
      <main className="dashboard-shell mx-auto min-h-[calc(100vh-48px)] max-w-[1800px] rounded-[28px] border border-white/70 bg-[#e9eef2] p-4 shadow-[0_22px_80px_rgba(15,23,42,0.14)] sm:p-7">
        <LeagueHeader seasonName={seasonName} homeHref="/" />

        <div className="pt-7 sm:pt-9">
          <Link
            href="/#contests"
            className="inline-flex h-11 items-center gap-2 rounded-full border border-white/90 bg-white px-5 text-sm font-bold text-slate-950 shadow-sm transition-colors hover:text-violet-700"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Contests
          </Link>
        </div>

        <section className="pt-4">
          {query.isPending ? (
            <div className="h-96 animate-pulse rounded-[22px] bg-white/80" />
          ) : query.isError || !contest ? (
            <Card>
              <CardContent className="p-10 text-center">
                <p className="font-semibold text-slate-900">We couldn&apos;t load this contest.</p>
                <p className="mt-1 text-sm text-slate-500">
                  Check the database connection or return to the contest list.
                </p>
              </CardContent>
            </Card>
          ) : (
            <>
              <SectionHeading>Contest results</SectionHeading>
              <Card className="mt-4 overflow-hidden">
                <CardHeader className="flex-row items-start justify-between gap-5 border-b border-slate-100 p-5 sm:items-center sm:p-7">
                  <div>
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-violet-600">
                      <Trophy className="size-4" aria-hidden="true" /> Final results
                    </div>
                    <CardTitle className="text-2xl sm:text-[28px]">{contest.name}</CardTitle>
                    <p className="mt-1.5 text-sm text-slate-500">
                      Imported {formatImportedAt(contest.fetchedAt)}
                    </p>
                  </div>
                  <div className="hidden items-center gap-2 rounded-full bg-violet-50 px-4 py-2 text-sm font-bold text-violet-700 sm:flex">
                    <Users className="size-4" aria-hidden="true" />
                    {contest.results.length} teams
                  </div>
                </CardHeader>

                {contest.results.length === 0 ? (
                  <CardContent className="p-8 text-center text-sm text-slate-500">
                    No results were found for this contest.
                  </CardContent>
                ) : (
                  <ResultsTable results={contest.results} />
                )}
              </Card>
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
