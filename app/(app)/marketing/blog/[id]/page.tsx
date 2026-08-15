import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { getSiteUrl, isSupabaseConfigured } from "@/lib/env";
import type { Tables } from "@/lib/database.types";
import { PostEditor } from "@/components/marketing/post-editor";

export const metadata: Metadata = { title: "Editar post · Marketing" };

export default async function MarketingPostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!isSupabaseConfigured()) notFound();

  const supabase = await createServerSupabase();
  const { data: post } = await supabase
    .from("marketing_posts")
    .select("*")
    .eq("id", id)
    .single();

  if (!post) notFound();

  return <PostEditor post={post as Tables<"marketing_posts">} siteUrl={getSiteUrl()} />;
}
