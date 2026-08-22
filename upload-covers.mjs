/**
 * 대화에 첨부됐던 인스타 완성본 표지를 스토리지에 올리고 인터뷰를 공개한다.
 * 표지에 이미 글자가 박혀 있으므로 훅 문구는 비워, 카드가 텍스트를 겹쳐 쓰지 않게 한다.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }),
);
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

// 스트립으로 눈으로 확인한 순서
const MAP = [
  ["img-090.png", "baro-hwang-eunchan-interview"],
  ["img-091.png", "zero-oclock-kim-minseok-interview"],
  ["img-092.png", "inheart-cookie-min-hyeju-interview"],
  ["img-093.png", "repitch-kim-sehyun-interview"],
  ["img-094.png", "sunday-fondu-kim-hanul-interview"],
  ["img-095.png", "50page-song-chaeeun-interview"],
  ["img-096.png", "budingk-ko-youngmin-interview"],
  ["img-097.png", "fruitio-kim-donghyun-interview"],
  ["img-098.png", "koin-yang-sunghyuk-interview"],
  ["img-099.png", "nexev-kim-doyoung-interview"],
  ["img-100.png", "suhyeonirang-lee-jamin-interview"],
  ["img-101.png", "caramel-lab-lee-chanseo-interview"],
];

const SEED = "supabase/seed/interviews-youthfounder.json";
const posts = JSON.parse(readFileSync(SEED, "utf8"));
const now = Date.now();
let ok = 0;

for (const [file, slug] of MAP) {
  const path = `covers-raw/${file}`;
  if (!existsSync(path)) { console.error("파일 없음:", path); continue; }

  const storagePath = `interviews/${slug}.png`;
  const { error: upErr } = await supabase.storage
    .from("images")
    .upload(storagePath, readFileSync(path), { contentType: "image/png", upsert: true });
  if (upErr) { console.error("업로드 실패:", slug, upErr.message); continue; }
  const coverUrl = supabase.storage.from("images").getPublicUrl(storagePath).data.publicUrl;

  const { error } = await supabase.from("features").update({
    cover_url: coverUrl,
    og_image_url: coverUrl,
    status: "published",
    published_at: new Date(now - ok * 3600_000).toISOString(),
    is_indexable: true,
    // 표지에 글자가 있으므로 카드 오버레이는 끈다
    hook_intro: null,
    hook_label: null,
    updated_at: new Date().toISOString(),
  }).eq("slug", slug);
  if (error) { console.error("공개 실패:", slug, error.message); continue; }

  const seedEntry = posts.find((p) => p.slug === slug);
  if (seedEntry) seedEntry.coverUrl = coverUrl;
  console.log("공개:", String(seedEntry?.hookLabel ?? slug).padEnd(18), "->", slug);
  ok += 1;
}

writeFileSync(SEED, JSON.stringify(posts, null, 2) + "\n");
const { count } = await supabase.from("features").select("id", { count: "exact", head: true }).eq("kind", "interview").eq("status", "published");
console.log(`\n${ok}건 공개 완료. 공개된 인터뷰 총계: ${count}`);
