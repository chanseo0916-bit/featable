import { createClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";

const EMAIL = "suchaehan@gmail.com";
const SLUG = "monov-ai-kim-chaerim-interview";
const COVER_FILE = "public/interviews/monov-ai-kim-chaerim-interview.png";
const DRY_RUN = process.argv.includes("--dry-run");

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => {
      const index = line.indexOf("=");
      return [line.slice(0, index).trim(), line.slice(index + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY);

const { data: profile, error: profileError } = await supabase
  .from("profiles")
  .select("id,email,full_name,role")
  .ilike("email", EMAIL)
  .maybeSingle();
if (profileError) throw profileError;
if (!profile) throw new Error(`${EMAIL} 계정을 찾을 수 없습니다.`);

const { data: existingFounder, error: existingFounderError } = await supabase
  .from("founders")
  .select("id,user_id,slug,name,founder_number,role_title,headline,bio,avatar_url,sns")
  .eq("user_id", profile.id)
  .maybeSingle();
if (existingFounderError) throw existingFounderError;

const { data: existingFeature, error: existingFeatureError } = await supabase
  .from("features")
  .select("id,slug,title,status,founder_id,created_by,cover_url,published_at")
  .eq("slug", SLUG)
  .maybeSingle();
if (existingFeatureError) throw existingFeatureError;

if (DRY_RUN) {
  console.log(JSON.stringify({ profile, existingFounder, existingFeature, coverExists: existsSync(COVER_FILE) }, null, 2));
  process.exit(0);
}

if (!existsSync(COVER_FILE)) throw new Error(`표지 파일이 없습니다: ${COVER_FILE}`);

const storagePath = `${profile.id}/${SLUG}.png`;
const { error: uploadError } = await supabase.storage
  .from("images")
  .upload(storagePath, readFileSync(COVER_FILE), { contentType: "image/png", upsert: true });
if (uploadError) throw new Error(`표지 업로드 실패: ${uploadError.message}`);
const coverUrl = supabase.storage.from("images").getPublicUrl(storagePath).data.publicUrl;

const founderInput = {
  user_id: profile.id,
  slug: existingFounder?.slug || "kim-chaerim",
  name: "김채림",
  role_title: "MONOV AI 대표",
  headline: "사진 한 장으로 광고와 디자인 콘텐츠를 쉽게 만드는 AI 서비스 MONOV AI를 만들고 있습니다.",
  bio: "카페, 쇼핑몰, 뷰티 브랜드처럼 제품과 서비스를 직접 운영하면서 광고 이미지와 SNS 콘텐츠까지 만들어야 하는 자영업자와 작은 브랜드를 위해 MONOV AI를 만들고 있습니다. 디자이너가 없거나 디자인을 전문적으로 배우지 않아도 자신의 제품을 더 잘 보여줄 수 있는 방법을 고민합니다.",
  avatar_url: existingFounder?.avatar_url || coverUrl,
  updated_at: new Date().toISOString(),
};

const { data: founder, error: founderError } = await supabase
  .from("founders")
  .upsert(founderInput, { onConflict: "user_id" })
  .select("id,user_id,slug,name,founder_number,role_title,headline,bio,avatar_url")
  .single();
if (founderError) throw new Error(`Founder 프로필 저장 실패: ${founderError.message}`);

const body = [
  {
    type: "text",
    heading: "자기소개",
    body: "안녕하세요. 사진 한 장으로 광고와 디자인 콘텐츠를 쉽게 만들 수 있는 AI 서비스 MONOV AI를 만들고 있는 김채림입니다. 특히 카페, 쇼핑몰, 뷰티 브랜드처럼 직접 제품과 서비스를 운영하면서도 광고 이미지나 SNS 콘텐츠까지 만들어야 하는 자영업자와 작은 브랜드를 위한 서비스를 만들고 있어요. 디자이너가 없어도, 디자인을 전문적으로 배우지 않아도 자신의 제품을 더 잘 보여줄 수 있는 방법을 고민하고 있습니다.",
  },
  {
    type: "text",
    heading: "아이템 한 줄 소개",
    body: "사진 한 장으로 광고 이미지부터 다양한 디자인 콘텐츠까지 쉽게 만들 수 있는 AI 디자인 서비스, MONOV AI입니다.",
  },
  {
    type: "text",
    heading: "창업 배경 (문제 발견)",
    body: "2024년 네이버웹툰에서 영상 제작 인턴을 하면서 처음 문제를 크게 느꼈어요. 하나의 광고나 영상을 만들기 위해 생각보다 많은 시간과 인력, 전문적인 작업이 필요했고, 작은 브랜드나 개인이 이런 제작 과정을 매번 반복하기에는 꽤 부담스럽겠다는 생각이 들었습니다. 그러면서 ‘이 과정을 AI로 조금 더 쉽게 만들 수 없을까?’, ‘전문가가 아니어도 좋은 결과물을 빠르게 만들 수 있는 방법은 없을까?’라는 생각을 하기 시작했고, 그게 지금의 MONOV AI로 이어졌습니다.",
  },
  {
    type: "text",
    heading: "가장 힘들었던 순간",
    body: "아무래도 제가 만든 프로덕트가 제 마음에 들지 않을 때가 가장 힘든 것 같아요. 계속 만들다 보면 부족한 부분만 보이고, 더 잘 만들고 싶은 마음 때문에 오히려 앞으로 나아가기 어려울 때도 있었어요. 요즘은 완벽하게 만든 다음 보여주는 것보다, 조금 부족하더라도 일단 만들고 사용자에게 보여주면서 하나씩 발전시키는 게 더 중요하다고 생각하고 있습니다. 아직도 배우고 있고, 계속 고쳐가고 있어요.",
  },
  {
    type: "text",
    heading: "제품에 대한 비전",
    body: "지금까지의 AI 콘텐츠 제작은 대부분 ‘무엇을 만들고 싶은지 텍스트로 설명하는 방식’에 가까웠다고 생각해요. 그런데 실제로 디자인할 때는 말로 길게 설명하기보다 ‘나는 이런 이미지가 좋아’라고 레퍼런스를 보여주는 경우가 훨씬 많잖아요. MONOV AI에서는 마음에 드는 이미지와 디자인을 바로 고르고, 거기에 내 제품을 넣어보고, 배경을 바꾸거나 오브젝트를 추가하고, 조명이나 분위기를 바꾸는 과정을 최대한 쉽게 만들고 싶어요. 결국 텍스트를 얼마나 잘 쓰느냐가 아니라, 내가 보고 좋아하는 것을 선택하는 것만으로도 디자인할 수 있게 만드는 거예요. 장기적으로는 MONOV가 단순히 ‘AI로 이미지를 만들어주는 서비스’가 아니라, 사람들이 AI로 디자인하는 방식 자체를 새롭게 만드는 제품이 되었으면 합니다.",
  },
  {
    type: "text",
    heading: "인생 목표",
    body: "거창한 목표보다는 재미있는 사람들과 재미있는 일을 오래 하고 싶어요. 새로운 것도 계속 시도해보고, 실패도 해보고, 생각하지 못했던 사람들과 만나면서 제가 할 수 있는 것의 범위를 계속 넓혀가고 싶습니다. 결과도 중요하지만 그 과정에서 좋은 사람들과 재미있게 살아가는 게 제일 큰 목표인 것 같아요.",
  },
  {
    type: "text",
    heading: "같은 길을 걷고 싶은 사람들에게",
    body: "저도 아직 많이 배우고 있고, 지금도 잘 모르는 것들을 하나씩 부딪혀가며 해결하고 있습니다. 브랜드를 시작하거나 자신의 가게를 운영하는 것도 비슷한 것 같아요. 처음부터 모든 걸 완벽하게 준비하기는 어렵고, 일단 해보면서 하나씩 자기만의 방식을 찾아가는 게 중요한 것 같습니다. 저도 MONOV를 계속 만들어가고 있으니, 혹시 광고 이미지나 콘텐츠를 직접 만드는 게 어려웠던 자영업자분이나 브랜드 운영자분들이 계시다면 한 번 사용해보시고 의견도 편하게 들려주시면 좋겠습니다. 곧 MONOV AI 앱 출시도 준비하고 있으니 인스타그램을 통해 지켜봐 주세요! 🙌\n\nhttps://www.monov-ai.com/landing",
  },
];

const now = new Date().toISOString();
const featureInput = {
  slug: SLUG,
  title: "사진 한장으로 콘첸츠 '딸깍' 해드립니다",
  kind: "interview",
  excerpt: "사진 한 장으로 광고와 디자인 콘텐츠를 쉽게 만드는 AI 서비스 MONOV AI. 작은 브랜드가 좋아하는 이미지를 고르는 것만으로도 디자인할 수 있는 방법을 만드는 김채림 대표의 이야기입니다.",
  cover_url: coverUrl,
  body,
  founder_id: founder.id,
  created_by: profile.id,
  hook_intro: null,
  hook_label: null,
  status: "published",
  is_featured: true,
  published_at: existingFeature?.published_at || now,
  seo_title: "MONOV AI 김채림 대표 인터뷰 | 사진 한 장으로 만드는 AI 디자인",
  seo_description: "MONOV AI 김채림 대표가 작은 브랜드의 광고·SNS 콘텐츠 제작 문제를 발견한 계기와 레퍼런스 중심 AI 디자인 서비스의 비전을 이야기합니다.",
  primary_keyword: "MONOV AI 김채림",
  secondary_keywords: ["MONOV AI", "김채림 대표", "AI 디자인 서비스", "광고 이미지 만들기", "창업가 인터뷰"],
  og_image_url: coverUrl,
  is_indexable: true,
  updated_at: now,
};

const { data: feature, error: featureError } = await supabase
  .from("features")
  .upsert(featureInput, { onConflict: "slug" })
  .select("id,slug,title,status,founder_id,created_by,cover_url,published_at")
  .single();
if (featureError) throw new Error(`인터뷰 저장 실패: ${featureError.message}`);

console.log(JSON.stringify({ founder, feature, coverUrl }, null, 2));
