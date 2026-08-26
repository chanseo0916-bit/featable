/**
 * SEO 아티클 200편에 작성자를 연결한다.
 *
 * YMYL(투자·세무·계약) 주제에서 저자 없는 글은 품질 평가에서 불리하다.
 * 다만 저자는 발행 주체 본인만 붙일 수 있다. 다른 창업가 이름을 얹으면
 * 그 사람이 쓰지 않은 글에 이름이 붙는 것이라 그렇게 하지 않는다.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8").split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => { const i = line.indexOf("="); return [line.slice(0, i).trim(), line.slice(i + 1).trim()]; }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const AUTHOR_SLUG = "founder-f96bc0"; // 이찬서 · Featable 대표 (chanseo0916@gmail.com)

const { data: author, error: authorError } = await supabase
  .from("founders").select("id,slug,name,user_id").eq("slug", AUTHOR_SLUG).maybeSingle();
if (authorError || !author) { console.error("작성자 프로필을 찾지 못했습니다.", authorError); process.exit(1); }
console.log(`작성자: ${author.name} (${author.slug})`);

const { data: targets, error: targetError } = await supabase
  .from("features").select("id,slug").eq("kind", "brand-story").is("founder_id", null);
if (targetError) { console.error(targetError); process.exit(1); }
console.log(`작성자 없는 아티클 ${targets.length}편`);

if (process.argv.includes("--dry-run")) process.exit(0);

for (let i = 0; i < targets.length; i += 50) {
  const chunk = targets.slice(i, i + 50);
  const { error } = await supabase
    .from("features")
    .update({ founder_id: author.id })
    .in("id", chunk.map((row) => row.id));
  if (error) { console.error("UPDATE ERROR", error); process.exit(1); }
  console.log(`연결 ${Math.min(i + 50, targets.length)}/${targets.length}`);
}

const { count } = await supabase.from("features")
  .select("id", { count: "exact", head: true })
  .eq("kind", "brand-story").not("founder_id", "is", null);
console.log("작성자 연결된 아티클:", count);
