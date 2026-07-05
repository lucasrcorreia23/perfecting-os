import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { getSessionProfile } from "@/lib/auth";
import { AppShell } from "@/components/shell/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await getSessionProfile();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const collapsed = cookieStore.get("sidebar")?.value === "collapsed";

  return (
    <AppShell
      role={session.profile?.role ?? "interno"}
      clientId={session.profile?.client_id ?? null}
      name={session.profile?.full_name || session.email || "Usuário"}
      avatarUrl={session.profile?.avatar_url ?? null}
      initialCollapsed={collapsed}
    >
      {children}
    </AppShell>
  );
}
