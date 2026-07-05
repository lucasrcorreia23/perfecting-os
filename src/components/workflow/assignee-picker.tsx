"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  CheckIcon,
  UserCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { setActivityAssignee } from "@/lib/actions/activities";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import type { ActivityAssignee } from "./client-card";

// Ícone/avatar do responsável que abre um dropdown para escolher entre os
// membros da equipe (ou remover). Fecha por clique fora / Esc.
export function AssigneePicker({
  activityId,
  assignee,
  members,
  onError,
}: {
  activityId: string;
  assignee: ActivityAssignee | null;
  members: ActivityAssignee[];
  onError: (message: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function select(id: string | null) {
    setOpen(false);
    startTransition(async () => {
      const result = await setActivityAssignee(activityId, id);
      if (!result.ok) onError(result.error);
    });
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={
          assignee
            ? `Responsável: ${assignee.full_name ?? "usuário"}`
            : "Definir responsável"
        }
        title={
          assignee ? (assignee.full_name ?? "Responsável") : "Definir responsável"
        }
        onClick={() => setOpen((value) => !value)}
        className="flex cursor-pointer rounded-full transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35"
      >
        {assignee ? (
          <Avatar
            name={assignee.full_name ?? "Usuário"}
            src={assignee.avatar_url}
            size={24}
          />
        ) : (
          <UserCircleIcon className="h-6 w-6 text-slate-300" aria-hidden />
        )}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-(--z-tooltip) mt-1 max-h-72 w-56 overflow-y-auto rounded-md border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <span className="block px-2 pb-1 pt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Responsável
          </span>

          {members.length === 0 ? (
            <p className="px-2 py-2 text-xs text-slate-400">
              Nenhum membro disponível.
            </p>
          ) : (
            members.map((member) => {
              const active = member.id === assignee?.id;
              return (
                <button
                  key={member.id}
                  type="button"
                  role="menuitem"
                  onClick={() => select(member.id)}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-full px-2 py-1.5 text-left text-sm text-slate-700",
                    "transition-colors hover:bg-slate-100/75",
                    "focus-visible:outline-none focus-visible:bg-slate-100/75",
                  )}
                >
                  <Avatar
                    name={member.full_name ?? "Usuário"}
                    src={member.avatar_url}
                    size={24}
                  />
                  <span className="min-w-0 flex-1 truncate">
                    {member.full_name ?? "Usuário"}
                  </span>
                  {active ? (
                    <CheckIcon
                      className="h-4 w-4 shrink-0 text-primary"
                      aria-hidden
                    />
                  ) : null}
                </button>
              );
            })
          )}

          {assignee ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => select(null)}
              className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-full border-t border-slate-100 px-2 py-1.5 text-left text-sm text-slate-500 transition-colors hover:bg-slate-50"
            >
              <XMarkIcon className="h-4 w-4 shrink-0" aria-hidden />
              Remover responsável
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
