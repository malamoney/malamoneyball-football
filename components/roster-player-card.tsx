"use client";

import { useState } from "react";

import type { TeamRosterPlayer } from "@/src/web-schemas";

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

export function RosterPlayerCard({ player }: { player: TeamRosterPlayer }) {
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
          {player.fantasyPoints.toFixed(2)}
        </p>
        <p className="text-[10px] uppercase tracking-wide text-slate-400">points</p>
      </div>
    </div>
  );
}
