"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Column<T> = {
  key: string;
  header: ReactNode;
  render: (row: T) => ReactNode;
  className?: string;
};

// Padrão de listagem (§8.6). Tabelas com 4+ colunas devem passar
// `mobileCard` para render alternativo em cards no mobile (§11).
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowHref,
  mobileCard,
  empty,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  rowHref?: (row: T) => string;
  mobileCard?: (row: T) => ReactNode;
  empty?: ReactNode;
}) {
  const router = useRouter();

  if (rows.length === 0 && empty) {
    return (
      <div className="rounded-sm border border-slate-200 bg-white">{empty}</div>
    );
  }

  const table = (
    <div className="overflow-hidden rounded-sm border border-slate-200 bg-white">
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  "px-4 py-2.5 text-left text-xs font-semibold text-slate-600",
                  column.className,
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr
                key={rowKey(row)}
                onClick={
                  href
                    ? (event) => {
                        // Não navegar quando o clique veio de um controle interno.
                        const target = event.target as HTMLElement;
                        if (target.closest("a,button,select,input,label")) {
                          return;
                        }
                        router.push(href);
                      }
                    : undefined
                }
                className={cn(
                  "transition-colors",
                  href && "cursor-pointer hover:bg-slate-50",
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      "h-14 px-4 text-sm font-medium text-slate-800",
                      column.className,
                    )}
                  >
                    {column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  if (!mobileCard) return table;

  return (
    <>
      <div className="hidden md:block">{table}</div>
      <div className="flex flex-col gap-3 md:hidden">
        {rows.map((row) => (
          <div key={rowKey(row)}>{mobileCard(row)}</div>
        ))}
      </div>
    </>
  );
}
