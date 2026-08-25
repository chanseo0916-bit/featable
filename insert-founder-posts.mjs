import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const idx = line.indexOf("=");
      return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const posts = ["a", "b", "c", "d"].flatMap((group) =>
  JSON.parse(readFileSync(`supabase/seed/seo-posts-founder-${group}.json`, "utf8")),
);

// 기존 공개 글과 slug / 대표 키워드가 겹치면 잠식이 나므로 먼저 막는다
const { data: existing, error: existingError } = await supabase
  .from("features")
  .select("slug,primary_keyword")
  .eq("kind", "brand-story");
if (existingError) { console.error(existingError); process.exit(1); }

const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
const existingKeywords = new Set((existing ?? []).map((row) => row.primary_keyword));

const seenSlugs = new Set();
const seenKeywords = new Set();
let failed = false;
for (const post of posts) {
  for (const key of ["slug", "title", "excerpt", "seoTitle", "seoDescription", "primaryKeyword"]) {
    if (!post[key]) { console.error("MISSING", key, "in", post.slug); failed = true; }
  }
  if (!Array.isArray(post.body) || post.body.length < 4) { console.error("BAD BODY", post.slug); failed = true; }
  for (const block of post.body ?? []) {
    if (block.type === "features" && !Array.isArray(block.items)) { console.error("BAD FEATURES BLOCK", post.slug); failed = true; }
    if (block.type === "text" && !block.body) { console.error("EMPTY TEXT BLOCK", post.slug); failed = true; }
    if (!["text", "features"].includes(block.type)) { console.error("UNKNOWN BLOCK", block.type, post.slug); failed = true; }
  }
  if (seenSlugs.has(post.slug) || existingSlugs.has(post.slug)) { console.error("DUPLICATE SLUG", post.slug); failed = true; }
  if (seenKeywords.has(post.primaryKeyword) || existingKeywords.has(post.primaryKeyword)) { console.error("DUPLICATE KEYWORD", post.primaryKeyword, post.slug); failed = true; }
  seenSlugs.add(post.slug);
  seenKeywords.add(post.primaryKeyword);
}
if (failed) process.exit(1);
console.log(`validated ${posts.length} posts`);

if (process.argv.includes("--dry-run")) {
  for (const post of posts) {
    const chars = post.body.reduce((sum, b) => sum + (b.body?.length ?? 0) + (b.items ?? []).reduce((s, i) => s + i.title.length + i.body.length, 0), 0);
    console.log(`${post.slug.padEnd(38)} ${String(chars).padStart(5)}자  ${post.primaryKeyword}`);
  }
  process.exit(0);
}

// 하루에 한꺼번에 쏟지 않고 최근 며칠에 걸쳐 자연스럽게 흩어 둔다
const now = Date.now();
const rows = posts.map((post, index) => ({
  slug: post.slug,
  title: post.title,
  kind: "brand-story",
  excerpt: post.excerpt,
  body: post.body,
  status: "published",
  published_at: new Date(now - index * 8 * 60 * 60 * 1000).toISOString(),
  seo_title: post.seoTitle,
  seo_description: post.seoDescription,
  primary_keyword: post.primaryKeyword,
  secondary_keywords: post.secondaryKeywords ?? [],
  is_indexable: true,
  updated_at: new Date().toISOString(),
}));

for (let i = 0; i < rows.length; i += 10) {
  const chunk = rows.slice(i, i + 10);
  const { error } = await supabase.from("features").upsert(chunk, { onConflict: "slug" });
  if (error) { console.error("UPSERT ERROR", error); process.exit(1); }
  console.log(`upserted ${i + chunk.length}/${rows.length}`);
}

const { count } = await supabase
  .from("features")
  .select("id", { count: "exact", head: true })
  .eq("kind", "brand-story")
  .eq("status", "published");
console.log("total published brand-story rows:", count);
