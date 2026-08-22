/**
 * 인스타 캡션을 Featable 인터뷰 데이터로 바꾼다.
 *
 * 사용법:
 *   1) captions/<slug>.txt 를 만들고 맨 위 3줄에 표지 정보를 적는다.
 *        hookIntro: 07년생, 20살
 *        title: 생활 법률 플랫폼 대표
 *        hookLabel: BARO 황은찬
 *        ---
 *        (여기부터 인스타 캡션 전문을 그대로 붙여넣기)
 *   2) node parse-interview.mjs captions/<slug>.txt
 *      → supabase/seed/interviews-youthfounder.json 에 추가/갱신된다.
 *   3) node publish-interviews.mjs 로 올린다.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { basename, extname } from "node:path";

const file = process.argv[2];
if (!file) {
  console.error("사용법: node parse-interview.mjs captions/<slug>.txt");
  process.exit(1);
}

const raw = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
const [head, ...bodyParts] = raw.split(/^---$/m);
if (!bodyParts.length) {
  console.error("표지 정보와 캡션을 --- 로 구분해주세요.");
  process.exit(1);
}
const body = bodyParts.join("---").trim();

const meta = {};
for (const line of head.trim().split("\n")) {
  const match = line.match(/^(hookIntro|title|hookLabel|excerpt|slug)\s*:\s*(.+)$/);
  if (match) meta[match[1]] = match[2].trim();
}
const slug = meta.slug || basename(file, extname(file));
if (!meta.title || !meta.hookLabel) {
  console.error("title 과 hookLabel 은 필수입니다.");
  process.exit(1);
}

// 이모지 + 제목으로 시작하는 줄을 문항 구분선으로 본다
const LABELS = [
  [/자기\s*소개/, "자기소개"],
  [/아이템.*한\s*줄/, "아이템 한 줄 소개"],
  [/창업\s*배경/, "창업 배경"],
  [/힘들었던/, "가장 힘들었던 순간"],
  [/터닝\s*포인트/, "결정적 터닝 포인트"],
  [/비전/, "제품에 대한 비전"],
  [/목표/, "앞으로의 목표 · 인생 목표"],
  [/전하고\s*싶은|같은\s*길/, "같은 길을 걷는 분들에게"],
];

const answers = [];
let current = null;
for (const line of body.split("\n")) {
  const text = line.trim();
  if (!text) {
    if (current) current.lines.push("");
    continue;
  }
  // 헤더 후보: 이모지로 시작하거나 아주 짧은 줄
  const stripped = text.replace(/^[\p{Extended_Pictographic}‍️\s]+/u, "").trim();
  const isHeader = stripped !== text && stripped.length > 0 && stripped.length <= 40;
  const matched = isHeader ? LABELS.find(([re]) => re.test(stripped)) : null;
  if (matched) {
    current = { question: matched[1], lines: [] };
    answers.push(current);
    continue;
  }
  if (!current) {
    current = { question: "자기소개", lines: [] };
    answers.push(current);
  }
  current.lines.push(text);
}

const parsed = answers
  .map((item) => ({ question: item.question, answer: item.lines.join("\n").replace(/\n{3,}/g, "\n\n").trim() }))
  .filter((item) => item.answer);

if (!parsed.length) {
  console.error("문항을 찾지 못했습니다. 캡션의 소제목이 이모지로 시작하는지 확인해주세요.");
  process.exit(1);
}

const SEED = "supabase/seed/interviews-youthfounder.json";
const posts = JSON.parse(readFileSync(SEED, "utf8"));
const entry = {
  slug,
  hookIntro: meta.hookIntro || "",
  title: meta.title,
  hookLabel: meta.hookLabel,
  coverUrl: "",
  excerpt: meta.excerpt || `${parsed[0].answer.slice(0, 90)}...`,
  answers: parsed,
};
const at = posts.findIndex((p) => p.slug === slug);
if (at >= 0) { entry.coverUrl = posts[at].coverUrl || ""; posts[at] = entry; }
else posts.push(entry);
writeFileSync(SEED, JSON.stringify(posts, null, 2) + "\n");

console.log(`${meta.hookLabel} — 문항 ${parsed.length}개`);
parsed.forEach((item) => console.log(`  · ${item.question} (${item.answer.length}자)`));
console.log(`\nseed 총 ${posts.length}건. 이제 node publish-interviews.mjs 로 올리세요.`);
