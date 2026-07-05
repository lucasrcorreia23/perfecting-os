"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeftIcon } from "@heroicons/react/24/outline";
import { cn } from "@/lib/utils";

const CLASSES = cn(
  "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full",
  "bg-white border border-slate-200 text-slate-600 transition-colors",
  "hover:bg-slate-50 hover:text-slate-900",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/35",
);

// Padrão único de voltar (§8.3): quadrado 44×44, nunca link + ícone inline.
export function BackButton({ href }: { href?: string }) {
  const router = useRouter();

  if (href) {
    return (
      <Link href={href} aria-label="Voltar" className={CLASSES}>
        <ArrowLeftIcon className="h-5 w-5" aria-hidden />
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label="Voltar"
      onClick={() => router.back()}
      className={CLASSES}
    >
      <ArrowLeftIcon className="h-5 w-5" aria-hidden />
    </button>
  );
}
