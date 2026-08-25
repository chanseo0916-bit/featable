/**
 * SEO 글 묶음 게시. 파일 경로를 인자로 받는다.
 *   node insert-seo-batch.mjs --dry-run supabase/seed/seo-posts-invest-*.json
 *
 * 게시 전에 두 가지를 막는다.
 *  1) 기존 공개 글과 slug / primary_keyword 충돌 (자기잠식)
 *  2) 금융·법률 글에 지어낸 수치가 섞여 들어가는 것
 */
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

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const files = args.filter((arg) => !arg.startsWith("--"));
if (files.length === 0) { console.error("사용법: node insert-seo-batch.mjs [--dry-run] <파일...>"); process.exit(1); }

const posts = files.flatMap((file) => JSON.parse(readFileSync(file, "utf8")));

// 지어낸 수치는 독자에게 실제 피해를 준다. 자동으로 잡아서 사람이 보게 한다
const RISKY = [
  [/\d+\s*%/, "퍼센트"],
  [/\d[\d,]*\s*(억|조|만\s*원|천만|백만)/, "금액"],
  [/제\s*\d+\s*조/, "법조문"],
  [/\d+\s*대\s*\d+/, "지분 비율"],
  [/연\s*\d+(\.\d+)?\s*(%|퍼센트)/, "금리"],
];

const textOf = (post) => post.body
  .map((block) => `${block.heading ?? ""} ${block.body ?? ""} ${(block.items ?? []).map((i) => `${i.title} ${i.body}`).join(" ")}`)
  .join(" ");

const charsOf = (post) => post.body.reduce(
  (sum, block) => sum + (block.body?.length ?? 0) + (block.items ?? []).reduce((s, i) => s + i.title.length + i.body.length, 0),
  0,
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);
const { data: existing, error: existingError } = await supabase
  .from("features").select("slug,primary_keyword").eq("kind", "brand-story");
if (existingError) { console.error(existingError); process.exit(1); }

const existingSlugs = new Set((existing ?? []).map((row) => row.slug));
const existingKeywords = new Set((existing ?? []).map((row) => row.primary_keyword));
const seenSlugs = new Set();
const seenKeywords = new Set();
const risky = [];
let failed = false;

for (const post of posts) {
  for (const key of ["slug", "title", "excerpt", "seoTitle", "seoDescription", "primaryKeyword"]) {
    if (!post[key]) { console.error("MISSING", key, "in", post.slug); failed = true; }
  }
  if (!Array.isArray(post.body) || post.body.length < 4) { console.error("BAD BODY", post.slug); failed = true; }
  for (const block of post.body ?? []) {
    if (!["text", "features"].includes(block.type)) { console.error("UNKNOWN BLOCK", block.type, post.slug); failed = true; }
    if (block.type === "features" && !Array.isArray(block.items)) { console.error("BAD FEATURES", post.slug); failed = true; }
    if (block.type === "text" && !block.body) { console.error("EMPTY TEXT", post.slug); failed = true; }
  }
  if (!post.seoTitle?.includes(post.primaryKeyword) && !post.seoDescription?.includes(post.primaryKeyword)) {
    console.error("KEYWORD NOT IN SEO FIELDS", post.slug); failed = true;
  }
  if (seenSlugs.has(post.slug) || existingSlugs.has(post.slug)) { console.error("DUPLICATE SLUG", post.slug); failed = true; }
  if (seenKeywords.has(post.primaryKeyword) || existingKeywords.has(post.primaryKeyword)) { console.error("DUPLICATE KEYWORD", post.primaryKeyword, post.slug); failed = true; }
  seenSlugs.add(post.slug);
  seenKeywords.add(post.primaryKeyword);

  const text = textOf(post);
  for (const [pattern, label] of RISKY) {
    const hit = text.match(pattern);
    if (hit) risky.push(`${post.slug}  [${label}]  ...${text.slice(Math.max(0, hit.index - 30), hit.index + 40).trim()}...`);
  }
}

if (risky.length) {
  console.log(`\n⚠ 확인이 필요한 수치 ${risky.length}건`);
  for (const line of risky) console.log("  " + line);
  console.log("");
}
if (failed) process.exit(1);
console.log(`validated ${posts.length} posts`);

if (dryRun) {
  for (const post of posts) console.log(`${post.slug.padEnd(40)} ${String(charsOf(post)).padStart(5)}자  ${post.primaryKeyword}`);
  if (risky.length) { console.log("\n위 수치를 확인한 뒤 --dry-run 없이 다시 실행하세요."); }
  process.exit(0);
}

const now = Date.now();
const rows = posts.map((post, index) => ({
  slug: post.slug,
  title: post.title,
  kind: "brand-story",
  excerpt: post.excerpt,
  body: post.body,
  status: "published",
  published_at: new Date(now - index * 3 * 60 * 60 * 1000).toISOString(),
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

const { count } = await supabase.from("features")
  .select("id", { count: "exact", head: true }).eq("kind", "brand-story").eq("status", "published");
console.log("total published brand-story rows:", count);
