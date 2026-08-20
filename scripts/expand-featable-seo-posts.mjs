import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

for (const line of fs.readFileSync(".env.local", "utf8").split(/\r?\n/)) {
  const match = line.match(/^([^#=]+)=(.*)$/);
  if (match) process.env[match[1].trim()] = match[2];
}

const slugs = [
  "startup-promotion-guide", "product-launch-checklist", "brand-story-writing",
  "customer-interview-questions", "landing-page-conversion", "seo-keyword-research",
  "mvp-validation", "customer-persona-guide", "product-positioning",
  "early-adopter-acquisition", "startup-pr-checklist", "founder-personal-branding",
  "startup-content-marketing", "customer-review-collection", "community-marketing",
  "product-demo-guide", "b2b-lead-generation", "startup-growth-metrics",
  "startup-pivot-decision", "startup-funding-preparation",
];

function longFormBlocks(post) {
  const keyword = post.primary_keyword || post.title;
  return [
    {
      type: "text",
      heading: `${keyword}, 시작 전에 정리할 기준`,
      body: `${post.excerpt}\n\n이 주제에서 성과를 만드는 팀은 실행 목록부터 늘리지 않습니다. 먼저 고객이 처한 상황과 바꾸려는 결과를 한 문장으로 적고, 지금 당장 확인할 수 있는 가장 작은 행동을 정합니다. 기준이 선명해지면 채널과 도구는 나중에 바꿔도 메시지와 우선순위는 흔들리지 않습니다.\n\n피터블은 새로운 제품과 브랜드를 발견하는 사람이 실제로 궁금해하는 질문에서 콘텐츠를 시작합니다. ${keyword} 역시 ‘더 많이 하는 법’보다 고객에게 어떤 경험을 남길지부터 정리할 때 가장 빠르게 개선됩니다.`,
    },
    {
      type: "features",
      heading: "실무에서 바로 쓰는 실행 순서",
      items: [
        { title: "1. 현재 상황을 한 장으로 정리하기", body: "고객의 문제, 지금 쓰는 대안, 우리가 만들 변화, 확인할 지표를 한 문서에 적습니다. 팀이 같은 말을 하는지부터 확인하세요." },
        { title: "2. 한 번에 하나만 실험하기", body: "메시지와 고객군, 채널을 동시에 바꾸면 무엇이 효과였는지 알 수 없습니다. 가장 불확실한 가설 하나를 정해 짧게 검증합니다." },
        { title: "3. 고객의 언어로 다시 쓰기", body: "조회수만 보지 말고 문의, 이탈 이유, 인터뷰 표현을 모읍니다. 고객이 쓰는 문장을 다음 랜딩페이지와 콘텐츠에 반영합니다." },
      ],
    },
    {
      type: "text",
      heading: "실행할 때 가장 자주 놓치는 점",
      body: `첫째, 결과를 너무 빨리 판단하는 것입니다. ${keyword}는 한 번의 게시물이나 한 번의 캠페인으로 결론낼 수 없습니다. 둘째, 팀 내부의 표현을 고객의 표현이라고 착각하는 것입니다. 기능명보다 고객이 겪는 장면을 먼저 말해야 합니다. 셋째, 배운 내용을 남기지 않는 것입니다. 실험의 가설·결과·다음 행동을 기록하면 같은 시행착오를 반복하지 않습니다.`,
    },
    {
      type: "text",
      heading: "7일 안에 시작하는 실전 계획",
      body: `1일 차에는 해결하려는 고객 문제를 한 문장으로 씁니다. 2일 차에는 최근 고객 대화와 문의에서 같은 표현을 다섯 개 찾습니다. 3일 차에는 그 표현으로 제목과 소개 문장을 고칩니다. 4~5일 차에는 가장 적합한 고객 5명에게 보여 주고 질문을 받습니다. 6일 차에는 반응을 문제·메시지·전환으로 나눠 기록합니다. 7일 차에는 다음 주에 검증할 한 가지를 정합니다. 작은 반복이 ${keyword}를 실행 가능한 성장 루틴으로 바꿉니다.`,
    },
  ];
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SECRET_KEY,
  { auth: { persistSession: false } },
);

const { data: posts, error } = await supabase
  .from("features")
  .select("id,slug,title,excerpt,body,primary_keyword")
  .in("slug", slugs)
  .eq("status", "published");

if (error) throw error;
if (posts.length !== slugs.length) throw new Error(`Expected ${slugs.length} posts, found ${posts.length}`);

for (const post of posts) {
  const body = [...(Array.isArray(post.body) ? post.body.slice(0, 3) : []), ...longFormBlocks(post)];
  const { error: updateError } = await supabase
    .from("features")
    .update({ body, updated_at: new Date().toISOString() })
    .eq("id", post.id);
  if (updateError) throw updateError;
}

const { data: verified, error: verifyError } = await supabase
  .from("features")
  .select("slug,body")
  .in("slug", slugs);

if (verifyError) throw verifyError;
const corrupted = verified.filter((post) => JSON.stringify(post.body).includes("???"));
if (corrupted.length) throw new Error(`Encoding corruption remains: ${corrupted.map((post) => post.slug).join(", ")}`);
if (verified.some((post) => !Array.isArray(post.body) || post.body.length < 7)) throw new Error("Some articles still have fewer than 7 content blocks.");

console.log(`Rewrote and verified ${verified.length} SEO articles with UTF-8 Korean content.`);
