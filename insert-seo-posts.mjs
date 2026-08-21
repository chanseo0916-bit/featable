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

const batches = [1, 2, 3, 4, 5].map((n) =>
  JSON.parse(readFileSync(`supabase/seed/seo-posts-batch${n}.json`, "utf8")),
);
const posts = batches.flat();

const slugs = new Set();
for (const p of posts) {
  if (slugs.has(p.slug)) {
    console.error("DUPLICATE SLUG:", p.slug);
    process.exit(1);
  }
  slugs.add(p.slug);
  for (const key of ["slug", "title", "excerpt", "seoTitle", "seoDescription", "primaryKeyword"]) {
    if (!p[key]) {
      console.error("MISSING FIELD", key, "in", p.slug);
      process.exit(1);
    }
  }
  if (!Array.isArray(p.body) || p.body.length < 2) {
    console.error("BAD BODY in", p.slug);
    process.exit(1);
  }
}
console.log(`validated ${posts.length} posts, ${slugs.size} unique slugs`);

const now = Date.now();
const rows = posts.map((p, i) => ({
  slug: p.slug,
  title: p.title,
  kind: "brand-story",
  excerpt: p.excerpt,
  body: p.body,
  status: "published",
  published_at: new Date(now - (2 + i) * 24 * 60 * 60 * 1000).toISOString(),
  seo_title: p.seoTitle,
  seo_description: p.seoDescription,
  primary_keyword: p.primaryKeyword,
  secondary_keywords: p.secondaryKeywords ?? [],
  is_indexable: true,
  updated_at: new Date().toISOString(),
}));

for (let i = 0; i < rows.length; i += 20) {
  const chunk = rows.slice(i, i + 20);
  const { error } = await supabase.from("features").upsert(chunk, { onConflict: "slug" });
  if (error) {
    console.error("UPSERT ERROR at chunk", i / 20, error);
    process.exit(1);
  }
  console.log(`upserted ${i + chunk.length}/${rows.length}`);
}

const { count, error: countError } = await supabase
  .from("features")
  .select("id", { count: "exact", head: true })
  .eq("kind", "brand-story")
  .eq("status", "published");
if (countError) console.error(countError);
console.log("total published brand-story rows:", count);
