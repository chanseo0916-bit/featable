import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

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
const userId = "4589e991-d4f2-4d18-a9f1-2a79bcfa7de6";
const imagePath = `${userId}/boonggaeting-choi-jeong-yoon-interview.png`;
const imageFile = "public/interviews/boonggaeting-choi-jeong-yoon.png";

const { error: uploadError } = await supabase.storage
  .from("images")
  .upload(imagePath, readFileSync(imageFile), { contentType: "image/png", upsert: true });
if (uploadError) throw new Error(`이미지 업로드 실패: ${uploadError.message}`);

const coverUrl = supabase.storage.from("images").getPublicUrl(imagePath).data.publicUrl;
const { data: founder, error: founderError } = await supabase
  .from("founders")
  .upsert(
    {
      user_id: userId,
      slug: "choi-jeong-yoon",
      name: "최정윤",
      avatar_url: coverUrl,
      role_title: "붕개팅 대표",
      headline: "붕어빵 사장이 만든 로테이션 소개팅, 붕개팅을 운영합니다.",
      bio: "5년간 붕어빵을 팔고 붕마카세를 운영하며 사람들과 소통해 온 경험을 바탕으로, 지금은 붕개팅에서 사람들의 사랑을 찾아주고 있습니다.",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  )
  .select("id,user_id,slug,name,founder_number,avatar_url")
  .single();
if (founderError) throw new Error(`Founder 프로필 저장 실패: ${founderError.message}`);

const body = [
  {
    type: "text",
    heading: "자기소개",
    body: "5년간 붕어빵 1티어로 붕어빵만 미친 듯이 팔다가, 이제는 미친 듯이 사람들의 사랑을 찾아주고 있는 붕개팅 대표 최정윤입니다.",
  },
  {
    type: "text",
    heading: "아이템 한 줄 소개",
    body: "뿌리가 붕어빵인 사장이 만든 로테이션 소개팅. 그래서 더 달콤하고 따뜻합니다.",
  },
  {
    type: "text",
    heading: "창업 배경",
    body: "저는 고등학생 때부터 사업을 꿈꿨습니다. 대학 진학을 포기한 후 20살 때부터 주 6일 12시간씩 근무하며 언젠가 할 나만의 사업을 위해 열심히 돈을 모았습니다. 롯데월드, 베이비시터 등 해보고 싶은 일들을 열심히 하다 보니 우연히 아빠 떡볶이 가게 앞 아주 조그만 노상 자리에서 붕어빵 장사 제의를 받게 됩니다. 초심자의 행운인지, 2022년 겨울, 붕어빵 장사는 초대박을 터트렸고 한 달 220만 원의 월급에도 방방 뛰며 좋아했던 저는 붕어빵 장사 두 달 만에 월 800만 원 이상의 수익을 거둡니다. 붕어빵 장사 이후, 붕마카세라는 소셜다이닝 아이템을 개발하여 단순히 음식을 파는 것이 아닌 사람들과 소통하며 함께하는 사업에 눈을 뜨게 됩니다. 그 이후 제가 잘하는 것, 소비자의 소비동기를 파악하여 자연스레 소개팅 사업에 뛰어듭니다. 그렇게 붕어빵 사장이 만든 소개팅, 붕개팅을 만듭니다.",
  },
  {
    type: "text",
    heading: "가장 힘들었던 순간",
    body: "다들 아시다시피 붕어빵은 부정할 수 없는 겨울 간식입니다. 겨울에는 남녀노소 누구나 붕어빵을 찾지만, 벚꽃 개화와 동시에 쳐다보지도 않는 음식이기도 합니다. 어린 나이, 빠른 성공을 거둔 저는 뭘 해도 잘될 것이고 내 붕어빵은 사계절 내내 잘 팔릴 거라는 말도 안 되는 착각에 빠집니다. 그리고 다행히도 그게 착각이라는 것을 아주 빠르게 깨달음과 동시에 극심한 우울증에 빠집니다. 하루 1,000원짜리 붕어빵을 150만 원씩 팔던 내 자랑스러운 가게가, 10만 원도 팔리지 않는 파리 날리는 가게가 됐을 때 말로 표현할 수 없는 자괴감에 빠집니다. 길을 걸으며 누군가와 눈만 마주쳐도 모든 사람이 나를 실패한 사람으로 보는 것 같았고, 어떤 가게를 가든 간에 그 가게의 매출을 계산하느라 밥을 제대로 먹지도 못하는 상태가 되었습니다. 밝고 자신감 넘치던 제 성격은 온데간데없이 사라지고, 평생 이렇게 우울증에 사로잡혀 사는 게 아닌가 하는 생각에 매일 울며 두 달을 보냈습니다.",
  },
  {
    type: "text",
    heading: "결정적 터닝 포인트",
    body: "제 터닝 포인트는 미친 듯한 무기력함과 우울감 속에서도 '이대로 죽어서는 안 된다, 시간이 약이다'라는 생각으로 다양한 시도를 해봤던 것입니다. 물론 붕어빵만큼 좋은 성과를 냈던 아이템은 없었지만, 무언가를 개발하고 만드는 과정에서 조금씩 우울감이 씻겨 나갔습니다. 하지만 그런 시도들도 제 우울증을 완치해 주기에는 역부족이었고, 저는 이대로는 죽겠다 싶은 생각에 회피성 제주 살이를 떠납니다. 다행히 그곳에서 붕마카세라는 아이템이 떠올랐고, 서울에 복귀하자마자 붕마카세라는 아이템으로 제2의 전성기를 맞이합니다. 붕마카세를 하며 몇천 명의 사람들과 직접 대화를 나누며 사람들이 어떤 것에 열광하는지 아주 자세히 습득합니다. 그리고 5년간의 장기 연애 종료로 인해 주변인들에게 연애 관련 이벤트도 해보는 게 어떠냐는 제안을 받게 됩니다. 그들의 제안으로 2024년 크리스마스, 붕개팅이 처음으로 시작되었습니다.",
  },
  {
    type: "text",
    heading: "사업에 대한 비전",
    body: "기술은 바뀌어도 인간의 외로움과 사랑의 욕구는 변하지 않습니다. 아무리 AI가 발달하고 모든 것이 편리함에 가까워져도 사랑은 그럴 수가 없습니다. 비효율의 대명사이자 평생 자동화가 불가능합니다. 겨울에만 비전이 가득한 붕어빵 사업을 하며 우울증까지 걸렸던 저는 계절을 타지 않는 사업에 항상 목말라 있었습니다. 그리고 붕개팅을 본업으로 전환하자마자 저는 그토록 바라던 '여름 야근'을 시작합니다. 겨울에만 미친 듯이 일하고 여름에는 좋아하는 베이비시터 일을 하며 여행을 다니던 저는 여름 휴가도 안 가고 일만 하는 워커홀릭 큐피트가 됩니다. 사랑은 누구에게나 필요합니다. 그래서 이 사업은 대표가 진심이라면 망하지 않을 겁니다.",
  },
  {
    type: "text",
    heading: "인생 목표",
    body: "아주 어릴 때부터 \"선한 영향력을 주는 큰 부자가 되자\"가 제 좌우명이었습니다. 지금 저는 아주 많은 사람들에게 사랑을 찾아주고 있고, 부자도 되어가고 있습니다. 앞으로의 목표는 지금처럼 제가 이 사업에 계속 진심이었으면 좋겠습니다.",
  },
  {
    type: "text",
    heading: "같은 길을 걷고 싶은 사람들에게",
    body: "참 아이러니하게도 저는 초기 자본이 거의 들지 않는 사업으로 성공을 거뒀습니다. 붕어빵, 소개팅 사업 모두 타 사업에 비하여 진입 장벽이 낮은 사업입니다. 하지만 쉽지 않습니다. 특히나 돈을 보고 시작했다면 더 쉽지 않을 겁니다. 그럼에도 불구하고 뛰어들고 싶다면 뛰어드세요. 어려움을 발견하고 하나하나 해결해 가며 성장하는 본인의 모습을 직면하는 것만큼 짜릿하고 행복한 게 없습니다. 개인적인 바람이지만, 사람들의 사랑을 찾아주는 일을 오로지 돈만 보고 시작하는 사람들이 없었으면 좋겠습니다.",
  },
];

const now = new Date().toISOString();
const { data: feature, error: featureError } = await supabase
  .from("features")
  .upsert(
    {
      slug: "boonggaeting-choi-jeong-yoon-interview",
      title: "뿌리가 붕어빵인 사장이 만든 로테이션 소개팅",
      kind: "interview",
      excerpt: "5년간 붕어빵을 팔고 붕마카세를 운영한 경험을 바탕으로, 이제는 로테이션 소개팅 붕개팅에서 사람들의 사랑을 찾아주는 최정윤 대표의 이야기입니다.",
      cover_url: coverUrl,
      body,
      founder_id: founder.id,
      created_by: userId,
      hook_intro: "5년간 붕어빵 1티어",
      hook_label: "붕개팅 대표 최정윤",
      status: "published",
      is_featured: true,
      published_at: now,
      seo_title: "붕개팅 최정윤 대표 인터뷰 | 붕어빵에서 로테이션 소개팅까지",
      seo_description: "붕어빵 장사와 붕마카세를 거쳐 로테이션 소개팅 붕개팅을 만든 최정윤 대표의 창업 배경, 우울증을 이겨낸 터닝 포인트와 사랑을 연결하는 사업 비전을 소개합니다.",
      primary_keyword: "붕개팅 최정윤",
      secondary_keywords: ["붕개팅", "최정윤 대표", "로테이션 소개팅", "붕어빵 창업", "창업가 인터뷰"],
      og_image_url: coverUrl,
      is_indexable: true,
      updated_at: now,
    },
    { onConflict: "slug" },
  )
  .select("id,slug,title,status,founder_id,created_by,cover_url,published_at")
  .single();
if (featureError) throw new Error(`인터뷰 저장 실패: ${featureError.message}`);

console.log(JSON.stringify({ founder, feature, coverUrl }, null, 2));
