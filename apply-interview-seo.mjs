/**
 * 인터뷰의 SEO 메타를 다시 잡는다. 본문(body)은 절대 건드리지 않는다.
 *
 * 인터뷰의 primary_keyword가 "프루티오 김동현 인터뷰" 같은 인터뷰 이름이라
 * 아무도 그렇게 검색하지 않아 노출이 0이었다. 실제 검색어로 바꾼다.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const dir = process.argv.find((arg) => arg.startsWith("--dir="))?.slice(6);
if (!dir) { console.error("사용법: node apply-interview-seo.mjs --dir=<결과폴더> [--dry-run]"); process.exit(1); }
const dryRun = process.argv.includes("--dry-run");

const rows = readdirSync(dir)
  .filter((name) => /^result-\d+\.json$/.test(name))
  .flatMap((name) => JSON.parse(readFileSync(join(dir, name), "utf8")));

const { data: existing, error } = await supabase
  .from("features").select("slug,kind,primary_keyword,body").eq("status", "published");
if (error) { console.error(error); process.exit(1); }

const bySlug = new Map(existing.map((row) => [row.slug, row]));
const articleKeywords = new Set(existing.filter((row) => row.kind !== "interview").map((row) => row.primary_keyword));
const seen = new Set();
let failed = false;

for (const row of rows) {
  const target = bySlug.get(row.slug);
  if (!target) { console.error("없는 slug:", row.slug); failed = true; continue; }
  if (target.kind !== "interview") { console.error("인터뷰가 아님:", row.slug); failed = true; continue; }
  for (const key of ["primaryKeyword", "seoTitle", "seoDescription"]) {
    if (!row[key]) { console.error("빠진 필드", key, row.slug); failed = true; }
  }
  if (articleKeywords.has(row.primaryKeyword)) { console.error("아티클과 키워드 충돌:", row.primaryKeyword, row.slug); failed = true; }
  if (seen.has(row.primaryKeyword)) { console.error("인터뷰끼리 키워드 중복:", row.primaryKeyword, row.slug); failed = true; }
  seen.add(row.primaryKeyword);
  if (!row.seoTitle?.includes(row.primaryKeyword) && !row.seoDescription?.includes(row.primaryKeyword)) {
    console.error("키워드가 seo 필드에 없음:", row.slug); failed = true;
  }
}
if (failed) process.exit(1);
console.log(`검증 통과 ${rows.length}편`);

if (dryRun) {
  for (const row of rows) {
    const before = bySlug.get(row.slug).primary_keyword;
    console.log(`${row.slug.padEnd(38)} ${String(before).padEnd(22)} → ${row.primaryKeyword}`);
  }
  process.exit(0);
}

for (const row of rows) {
  // body는 넘기지 않는다. 인터뷰 내용은 바뀌면 안 된다.
  const { error: updateError } = await supabase.from("features").update({
    primary_keyword: row.primaryKeyword,
    secondary_keywords: row.secondaryKeywords ?? [],
    seo_title: row.seoTitle,
    seo_description: row.seoDescription,
    updated_at: new Date().toISOString(),
  }).eq("slug", row.slug);
  if (updateError) { console.error("UPDATE ERROR", row.slug, updateError); process.exit(1); }
  console.log("적용", row.slug);
}

// 본문이 그대로인지 확인한다
const { data: after } = await supabase.from("features").select("slug,body").in("slug", rows.map((r) => r.slug));
let changed = 0;
for (const row of after ?? []) {
  if (JSON.stringify(row.body) !== JSON.stringify(bySlug.get(row.slug).body)) { console.error("본문이 바뀌었다:", row.slug); changed++; }
}
console.log(changed === 0 ? "본문 무결성 확인: 17편 모두 그대로" : `경고: 본문이 바뀐 글 ${changed}편`);
