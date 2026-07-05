import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-[100dvh] flex-col items-center justify-center gap-6 bg-[#f9f9f9] px-4 py-10">
      <span className="text-xl font-semibold tracking-tight text-slate-900">
        Perfecting
      </span>
      <main className="w-full max-w-sm rounded-sm border border-slate-200 bg-white p-6 sm:p-8">
        {children}
      </main>
    </div>
  );
}
