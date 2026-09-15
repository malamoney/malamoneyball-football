"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
  type OnChangeFn,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import Link from "next/link";

import { TeamAvatar } from "@/components/team-avatar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { StandingsEntry } from "@/src/web-schemas";

const features = tableFeatures({
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
});

const columnHelper = createColumnHelper<typeof features, StandingsEntry>();

const columns = columnHelper.columns([
  columnHelper.accessor("participantName", {
    header: "Team",
    cell: ({ getValue, row }) => {
      const name = getValue();
      return (
        <Link
          href={`/teams/${encodeURIComponent(row.original.userKey)}`}
          className="group flex min-w-48 items-center gap-3 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-violet-500 focus-visible:ring-offset-4"
        >
          <TeamAvatar userName={name} />
          <span className="font-semibold text-slate-900 underline-offset-4 transition-colors group-hover:text-violet-700 group-hover:underline">
            {name}
          </span>
        </Link>
      );
    },
  }),
  columnHelper.accessor("wins", { header: "Wins" }),
  columnHelper.accessor("losses", { header: "Losses" }),
  columnHelper.accessor("ties", { header: "Ties" }),
  columnHelper.accessor("totalPoints", {
    header: "Total Points",
    cell: ({ getValue }) => getValue().toFixed(2),
  }),
  columnHelper.accessor("highScore", {
    header: "High Score",
    cell: ({ getValue }) => getValue().toFixed(2),
  }),
  columnHelper.accessor("averageScore", {
    header: "Average Score",
    cell: ({ getValue }) => getValue().toFixed(2),
  }),
  columnHelper.accessor("streak", {
    header: "Streak",
    cell: ({ getValue }) => {
      const streak = getValue();
      const color = streak.endsWith("W")
        ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
        : streak.endsWith("L")
          ? "bg-rose-50 text-rose-700 ring-rose-100"
          : streak.endsWith("T")
            ? "bg-amber-50 text-amber-700 ring-amber-100"
            : "bg-slate-50 text-slate-500 ring-slate-100";

      return (
        <span className={`inline-flex min-w-10 justify-center rounded-full px-2.5 py-1 text-xs font-bold ring-1 ${color}`}>
          {streak}
        </span>
      );
    },
  }),
]);

interface StandingsTableProps {
  data: StandingsEntry[];
  sorting: SortingState;
  onSortingChange: OnChangeFn<SortingState>;
}

export function StandingsTable({
  data,
  sorting,
  onSortingChange,
}: StandingsTableProps) {
  const table = useTable({
    features,
    columns,
    data,
    state: { sorting },
    onSortingChange,
  });

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          {table.getHeaderGroups().map((headerGroup) => (
            <TableRow key={headerGroup.id} className="hover:bg-transparent">
              {headerGroup.headers.map((header) => {
                const sorted = header.column.getIsSorted();
                return (
                  <TableHead
                    key={header.id}
                    className={header.column.id === "participantName" ? "w-[34%]" : "text-right"}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        type="button"
                        onClick={header.column.getToggleSortingHandler()}
                        className={`flex w-full items-center gap-1.5 whitespace-nowrap transition-colors hover:text-slate-700 ${
                          header.column.id === "participantName"
                            ? "justify-start"
                            : "justify-end"
                        }`}
                      >
                        <table.FlexRender header={header} />
                        {sorted === "asc" ? (
                          <ArrowUp className="size-3.5" />
                        ) : sorted === "desc" ? (
                          <ArrowDown className="size-3.5" />
                        ) : (
                          <ArrowUpDown className="size-3.5 opacity-45" />
                        )}
                      </button>
                    )}
                  </TableHead>
                );
              })}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row, index) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell
                  key={cell.id}
                  className={
                    cell.column.id === "participantName"
                      ? ""
                      : "text-right font-semibold tabular-nums text-slate-700"
                  }
                >
                  {cell.column.id === "participantName" ? (
                    <div className="flex items-center gap-4">
                      <span className="w-5 text-xs font-semibold tabular-nums text-slate-300">
                        {index + 1}
                      </span>
                      <table.FlexRender cell={cell} />
                    </div>
                  ) : (
                    <table.FlexRender cell={cell} />
                  )}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
