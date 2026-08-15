import type { Metadata } from "next";
import { createServerSupabase } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";
import { PostsView, type PostRow } from "@/components/marketing/posts-view";

export const metadata: Metadata = { title: "Blog · Marketing" };

export default async function MarketingBlogPage() {
  if (!isSupabaseConfigured()) return <PostsView posts={[]} />;

  const supabase = await createServerSupabase();
  const { data } = await supabase
    .from("marketing_posts")
    .select(
      "id, title, slug, status, published_at, tags, updated_at, reading_minutes",
    )
    .order("updated_at", { ascending: false });

  return <PostsView posts={(data ?? []) as PostRow[]} />;
}
