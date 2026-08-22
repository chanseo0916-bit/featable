/**
 * 인스타그램에 올린 창업가 인터뷰를 Featable 인터뷰로 게시한다.
 *
 * 사용법:
 *   1) supabase/seed/interviews-youthfounder.json 의 coverUrl 을 채운다.
 *      - 인물 사진(글자 없는 원본)을 Supabase Storage images 버킷에 올리고 공개 URL을 넣거나
 *      - node publish-interviews.mjs --upload <slug>=<로컬파일경로> 로 올린다.
 *   2) node publish-interviews.mjs
 *
 * coverUrl 이 비어 있는 항목은 건너뛴다 (커버 없이 올리면 홈 카드가 비어 보이므로).
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "node:fs";
import { basename, extname } from "node:path";

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
const SEED = "supabase/seed/interviews-youthfounder.json";
const posts = JSON.parse(readFileSync(SEED, "utf8"));

// --upload slug=path 로 넘어온 사진을 스토리지에 올려 coverUrl 로 쓴다
const uploads = process.argv.slice(2).filter((a) => a.startsWith("--upload"));
for (const arg of uploads) {
  const pair = arg.replace(/^--upload=?/, "") || process.argv[process.argv.indexOf(arg) + 1];
  const [slug, filePath] = pair.split("=");
  if (!slug || !filePath) continue;
  if (!existsSync(filePath)) {
    console.error("파일을 찾을 수 없습니다:", filePath);
    process.exit(1);
  }
  const post = posts.find((p) => p.slug === slug);
  if (!post) {
    console.error("해당 slug가 seed에 없습니다:", slug);
    process.exit(1);
  }
  const ext = extname(filePath).replace(".", "") || "jpg";
  const storagePath = `interviews/${slug}-${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("images").upload(storagePath, readFileSync(filePath), {
    contentType: ext === "png" ? "image/png" : "image/jpeg",
    upsert: true,
  });
  if (error) {
    console.error("업로드 실패:", basename(filePath), error.message);
    process.exit(1);
  }
  post.coverUrl = supabase.storage.from("images").getPublicUrl(storagePath).data.publicUrl;
  console.log("업로드 완료:", slug, "->", post.coverUrl);
}

// 커버가 없으면 비공개로 올려둔다. 어드민에서 표지를 넣고 공개하면 된다.
const ready = posts;
const withoutCover = posts.filter((p) => !p.coverUrl);
if (withoutCover.length) console.log("표지 없이 비공개로 올립니다 (어드민에서 표지 추가 후 공개):", withoutCover.map((p) => p.hookLabel).join(", "));

const now = new Date();
for (const [index, post] of ready.entries()) {
  const publishedAt = new Date(now.getTime() - index * 3600_000).toISOString();
  const row = {
    slug: post.slug,
    title: post.title,
    kind: "interview",
    excerpt: post.excerpt,
    cover_url: post.coverUrl || null,
    body: post.answers.map((item) => ({ type: "text", heading: item.question, body: item.answer })),
    status: post.coverUrl ? "published" : "draft",
    published_at: post.coverUrl ? publishedAt : null,
    hook_intro: post.hookIntro || null,
    hook_label: post.hookLabel || null,
    seo_title: `${post.title} ${post.hookLabel} 인터뷰`.slice(0, 60),
    seo_description: post.excerpt.slice(0, 155),
    primary_keyword: `${post.hookLabel} 인터뷰`,
    secondary_keywords: ["창업가 인터뷰", post.title],
    og_image_url: post.coverUrl,
    is_indexable: Boolean(post.coverUrl),
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from("features").upsert(row, { onConflict: "slug" });
  if (error) {
    console.error("실패:", post.hookLabel, error.message);
    process.exit(1);
  }
  console.log(post.coverUrl ? "게시 완료:" : "비공개 저장:", post.hookLabel, "->", post.slug);
}

const { count } = await supabase
  .from("features")
  .select("id", { count: "exact", head: true })
  .eq("kind", "interview")
  .eq("status", "published");
console.log("공개된 인터뷰 총계:", count);
