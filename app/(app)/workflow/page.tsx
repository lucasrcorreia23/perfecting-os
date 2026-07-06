import type { Metadata } from "next";
import { requireInterno } from "@/lib/auth";
import { createServerSupabase } from "@/lib/supabase/server";
import { Board } from "@/components/workflow/board";
import type { BoardClient } from "@/components/workflow/client-card";

export const metadata: Metadata = { title: "Workflow" };

export default async function WorkflowPage() {
  await requireInterno();

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("clients")
    .select(
      "*, activities(*, assignee:assignee_id(id, full_name, avatar_url)), client_files(*)",
    )
    .order("name");

  return <Board initialClients={(data ?? []) as BoardClient[]} />;
}
