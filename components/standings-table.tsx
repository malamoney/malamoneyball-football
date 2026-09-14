"use client";

import {
  createColumnHelper,
  createSortedRowModel,
  rowSortingFeature,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

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
    header: "Participant name",
    cell: ({ getValue }) => {
      const name = getValue();
      return (
        <div className="flex min-w-48 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-violet-50 text-xs font-bold uppercase text-violet-700 ring-1 ring-violet-100">
            {name.slice(0, 2)}
          </span>
          <span className="font-semibold text-slate-900">{name}</span>
        </div>
      );
    },
  }),
  columnHelper.accessor("wins", { header: "Wins" }),
  columnHelper.accessor("losses", { header: "Losses" }),
  columnHelper.accessor("ties", { header: "Ties" }),
  columnHelper.accessor("totalPoints", {
    header: "Total points",
    cell: ({ getValue }) => getValue().toFixed(2),
  }),
]);

export function StandingsTable({ data }: { data: StandingsEntry[] }) {
  const table = useTable({
    features,
    columns,
    data,
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
                    className={header.column.id === "participantName" ? "w-[48%]" : "text-right"}
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
