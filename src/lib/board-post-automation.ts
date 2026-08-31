import "server-only";

import { createHash } from "node:crypto";
import Anthropic from "@anthropic-ai/sdk";
import { createAdminClient } from "@/lib/supabase/admin";

const KST_OFFSET_MINUTES = 9 * 60;
const MINUTE_MS = 60 * 1000;
const DAILY_POST_TARGET = 10;
const DAILY_SLOT_MINUTES = [
  9 * 60 + 5,
  10 * 60 + 20,
  11 * 60 + 50,
  13 * 60 + 10,
  14 * 60 + 35,
  16 * 60 + 5,
  17 * 60 + 40,
  19 * 60 + 10,
  20 * 60 + 35,
  22 * 60 + 5,
] as const;
const CATEGORY_SEQUENCE = [
  "free",
  "question",
  "feedback",
  "team",
  "free",
  "question",
  "feedback",
  "team",
  "free",
  "question",
] as const;
const HOOK_ANGLES = [
  "방금 겪은 실패나 작은 반전으로 시작하는 고백",
  "구체적인 숫자가 상식을 뒤집는 경험",
  "둘 중 하나를 골라야 하는 현실적인 딜레마",
  "돈이나 시간을 잃고 뒤늦게 깨달은 실수",
  "사람마다 의견이 갈릴 만한 솔직한 주장",
  "막막해서 실제 경험자의 기준을 묻는 질문",
  "결과물을 보여주기 직전 받는 날카로운 피드백 요청",
  "기간과 역할이 선명한 짧은 협업 제안",
  "포기 직전에 생긴 작은 성과와 다음 고민",
  "가격, 고객, 매출 중 하나에 관한 예상 밖의 변화",
] as const;
const CATEGORY_GUIDANCE = {
  free: "자유로운 경험담이나 솔직한 고백으로 시작하고, 독자가 자기 경험을 말하고 싶게 끝낸다.",
  question: "창업 과정의 구체적인 선택 하나를 묻는다. 예산, 기간, 고객 수 같은 현실적인 제약을 넣는다.",
  feedback: "문구, 랜딩페이지, 가격, 패키지, 기능처럼 평가할 대상을 구체적으로 제시하고 냉정한 의견을 구한다.",
  team: "찾는 역할, 현재 진행 상황, 짧은 실험 기간과 기대 결과를 구체적으로 밝힌다.",
} as const;
type BoardCategory = keyof typeof CATEGORY_GUIDANCE;

type GeneratedPost = {
  title: string;
  body: string;
};

type DatabaseError = { code?: string; message?: string } | null;

export type EnsureDailyBoardPostsResult = {
  date: string;
  target: number;
  due: number;
  existing: number;
  created: number;
  postIds: string[];
};

function stableUuid(key: string): string {
  const hex = createHash("sha256")
    .update(`featable-board-auto:${key}`)
    .digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

function kstParts(date: Date) {
  const shifted = new Date(date.getTime() + KST_OFFSET_MINUTES * MINUTE_MS);
  return {
    date: shifted.toISOString().slice(0, 10),
    minutes: shifted.getUTCHours() * 60 + shifted.getUTCMinutes(),
  };
}

function slotDate(date: string, slotMinutes: number): string {
  const [year, month, day] = date.split("-").map(Number);
  const utcTime = Date.UTC(
    year,
    month - 1,
    day,
    Math.floor(slotMinutes / 60),
    slotMinutes % 60,
  ) - KST_OFFSET_MINUTES * MINUTE_MS;
  return new Date(utcTime).toISOString();
}

function categoryForSlot(date: string, slot: number): BoardCategory {
  const rotation = Number(date.replaceAll("-", "")) % CATEGORY_SEQUENCE.length;
  return CATEGORY_SEQUENCE[(slot + rotation) % CATEGORY_SEQUENCE.length];
}

function normalizeTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ko-KR")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

function titleTokens(value: string): Set<string> {
  return new Set(
    value
      .normalize("NFKC")
      .toLocaleLowerCase("ko-KR")
      .replace(/[^\p{L}\p{N}\s]/gu, " ")
      .split(/\s+/)
      .filter((token) => token.length >= 2),
  );
}

function nearDuplicate(candidate: string, existingTitles: string[]): boolean {
  const normalized = normalizeTitle(candidate);
  if (!normalized) return true;

  return existingTitles.some((title) => {
    const other = normalizeTitle(title);
    if (normalized === other || normalized.includes(other) || other.includes(normalized)) {
      return true;
    }
    const candidateTokens = titleTokens(candidate);
    const otherTokens = titleTokens(title);
    if (candidateTokens.size === 0 || otherTokens.size === 0) return false;
    const intersection = [...candidateTokens].filter((token) => otherTokens.has(token)).length;
    const union = new Set([...candidateTokens, ...otherTokens]).size;
    return union > 0 && intersection / union >= 0.78;
  });
}

function parseGeneratedPost(text: string): GeneratedPost {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI response did not contain JSON.");
  const parsed = JSON.parse(match[0]) as Partial<GeneratedPost>;
  const title = typeof parsed.title === "string" ? parsed.title.trim() : "";
  const body = typeof parsed.body === "string" ? parsed.body.trim() : "";

  if (title.length < 12 || title.length > 90) {
    throw new Error("Generated title length is invalid.");
  }
  if (body.length < 140 || body.length > 1200) {
    throw new Error("Generated body length is invalid.");
  }
  if (/```|https?:\/\/|@[\w.-]+|운영진|자동 생성|인공지능|AI가/iu.test(`${title}\n${body}`)) {
    throw new Error("Generated post contains a disallowed marker.");
  }
  return { title, body };
}

const FALLBACK_PRODUCTS = [
  "예약 관리 도구",
  "반려동물 간식",
  "직장인 밀키트",
  "운동 기록 앱",
  "소형 가구",
  "업무 자동화 서비스",
  "스킨케어 샘플",
  "동네 클래스",
  "카페 정기권",
  "디지털 템플릿",
  "팀 협업 도구",
  "로컬 여행 상품",
] as const;
const FALLBACK_CHANNELS = [
  "인스타그램",
  "검색광고",
  "지인 소개",
  "오프라인 팝업",
  "커뮤니티",
  "이메일",
  "제휴 판매",
  "스마트스토어",
] as const;

function hashNumber(key: string): number {
  return Number.parseInt(createHash("sha256").update(key).digest("hex").slice(0, 8), 16);
}

function pick<T>(key: string, values: readonly T[]): T {
  return values[hashNumber(key) % values.length];
}

function fallbackCandidate(category: BoardCategory, key: string): GeneratedPost {
  const product = pick(`${key}:product`, FALLBACK_PRODUCTS);
  const channel = pick(`${key}:channel`, FALLBACK_CHANNELS);
  const days = 3 + (hashNumber(`${key}:days`) % 39);
  const seconds = 2 + (hashNumber(`${key}:seconds`) % 5);
  const customers = 2 + (hashNumber(`${key}:customers`) % 47);
  const budget = 7 + (hashNumber(`${key}:budget`) % 83);
  const percent = 10 + (hashNumber(`${key}:percent`) % 36);
  const weeks = 2 + (hashNumber(`${key}:weeks`) % 7);
  const template = hashNumber(`${key}:template`) % 6;

  if (category === "free") {
    return [
      {
        title: `${channel}에 ${budget}만원 썼는데 주문은 ${customers}건이었습니다`,
        body: `${product}를 알리려고 이번 달에는 ${channel} 하나에만 집중했습니다. 콘텐츠도 바꾸고 문구도 여러 번 손봤는데, 결과는 광고비 ${budget}만원에 주문 ${customers}건이 전부였어요. 숫자만 보면 멈추는 게 맞지만 문의 내용은 전보다 구체적이라 더 해볼지 고민됩니다. 비슷한 단계에서 채널을 바꿀지 메시지를 바꿀지 어떤 기준으로 결정하셨나요?`,
      },
      {
        title: `${days}일 내내 0건이었는데 오늘 첫 결제가 들어왔어요`,
        body: `${product}를 공개하고 ${days}일 동안 결제가 한 건도 없었습니다. 주변에서는 조금 더 기다리라고 했지만 저는 매일 페이지를 뜯어고치고 있었어요. 오늘 처음 보는 고객 한 분이 별도 문의도 없이 결제해 주셨는데 기쁘면서도 이 한 건을 신호로 봐도 될지 모르겠습니다. 첫 결제 뒤에 가장 먼저 확인했던 것은 무엇이었나요?`,
      },
      {
        title: `친구 ${customers}명은 좋다는데 아무도 돈을 내지는 않았습니다`,
        body: `${product} 아이디어를 주변 ${customers}명에게 보여줬고 반응은 전부 좋았습니다. 그런데 작은 예약금이라도 받을 수 있는 링크를 보내자 실제 결제는 0명이었어요. 응원과 수요가 다르다는 건 알았지만 숫자로 보니 꽤 아프네요. 지인 반응 말고 진짜 구매 가능성을 확인할 때 가장 효과 있었던 방법이 궁금합니다.`,
      },
      {
        title: `매출은 ${percent}% 늘었는데 통장 잔고는 더 줄었습니다`,
        body: `이번 달 ${product} 매출이 지난달보다 ${percent}% 늘어서 처음에는 방향이 맞다고 생각했습니다. 그런데 배송비와 소량 제작비, 환불 비용을 다시 넣어보니 통장에 남는 돈은 오히려 줄었어요. 매출 숫자만 매일 본 대가를 치르는 기분입니다. 초기에는 매출 외에 어떤 숫자를 반드시 같이 봐야 이런 착각을 줄일 수 있을까요?`,
      },
      {
        title: `첫 악평 한 줄이 좋은 후기 ${customers}개보다 크게 보이네요`,
        body: `${product}를 써본 고객에게 처음으로 날카로운 불만을 받았습니다. 이미 해결과 환불 안내는 끝냈지만, 그 문장만 계속 떠올라 제품 전체를 다시 만들어야 하나 고민하고 있어요. 반대로 만족했다는 메시지도 ${customers}개쯤 있었는데 이상하게 눈에 들어오지 않습니다. 첫 악평을 제품 개선 신호와 감정으로 어떻게 나눠서 보셨나요?`,
      },
      {
        title: `가격을 ${percent}% 올렸더니 문의는 줄고 결제는 늘었습니다`,
        body: `${product} 원가가 올라 어쩔 수 없이 가격을 ${percent}% 인상했습니다. 문의 자체는 눈에 띄게 줄었는데, 상담 뒤 결제하는 비율은 전보다 높아졌어요. 아직 고객 수가 적어 우연인지 가격이 고객을 걸러준 건지 판단이 어렵습니다. 가격을 올린 뒤 어떤 지표까지 봐야 제대로 된 변화라고 볼 수 있을까요?`,
      },
    ][template];
  }

  if (category === "question") {
    return [
      {
        title: `재고 ${customers * 10}개 찍기 전에 선주문 몇 명이면 충분할까요?`,
        body: `${product} 샘플은 완성됐지만 공장 최소 수량이 ${customers * 10}개라 바로 생산하기에는 부담이 큽니다. 사진과 상세 설명으로 선주문을 받으면 배송까지 ${weeks}주를 기다려야 하고요. 지인 설문 말고 실제 결제로 수요를 확인하려는데, 최소 몇 명 또는 생산비의 몇 퍼센트가 모이면 시작하시겠어요?`,
      },
      {
        title: `고객 ${customers}명이 같은 기능을 원하면 바로 만들어야 하나요?`,
        body: `${product} 사용자 인터뷰 중 ${customers}명이 비슷한 기능을 요청했습니다. 문제는 그 기능을 만들면 지금 계획한 일정이 최소 ${weeks}주 밀린다는 점이에요. 목소리는 분명하지만 실제 결제로 이어질지는 아직 확인하지 못했습니다. 이런 상황에서 요청을 기능으로 옮기기 전에 어떤 행동을 확인하시나요?`,
      },
      {
        title: `첫 고객 100명, ${channel} 하나만 파는 게 맞을까요?`,
        body: `${product}를 출시했고 지금까지 고객은 ${customers}명입니다. 광고 예산이 많지 않아 앞으로 한 달은 ${channel} 한 곳에만 시간을 쓰려고 해요. 다만 채널이 틀렸을 때 한 달을 통째로 잃을까 걱정됩니다. 첫 100명을 모을 때 한 채널을 오래 파는 기준과 포기하는 기준이 각각 무엇이었나요?`,
      },
      {
        title: `${budget}만원짜리 외주, 매출 전에 써도 되는 돈일까요?`,
        body: `${product}의 핵심 화면을 다듬는 데 ${budget}만원 견적을 받았습니다. 직접 하면 비용은 없지만 최소 ${weeks}주가 걸리고, 외주를 맡기면 그 시간에 고객을 만날 수 있어요. 아직 반복 매출이 없는 단계라 선뜻 결제하기 어렵습니다. 이런 비용은 어떤 숫자나 가설이 확인됐을 때 집행하시나요?`,
      },
      {
        title: `무료 고객 ${customers}명보다 유료 고객 3명을 먼저 봐야 할까요?`,
        body: `${product} 무료 테스트에는 ${customers}명이 참여했지만 적극적으로 쓰는 사람은 많지 않습니다. 반면 유료로 먼저 써보겠다는 분은 3명이고 원하는 기능도 서로 달라요. 무료 사용량을 더 모을지, 적더라도 돈을 낸 세 명에게 맞출지 고민입니다. 초기 제품 방향을 정할 때 어느 쪽 행동을 더 크게 보셨나요?`,
      },
      {
        title: `반응 없는 상세페이지, ${days}일이면 결론 내리기 이른가요?`,
        body: `${product} 상세페이지를 새로 열고 ${days}일 동안 ${channel}에서 유입을 보냈습니다. 방문은 생기는데 문의와 결제가 거의 없어 메시지가 틀린 건지 제품 자체가 약한 건지 모르겠어요. 성급하게 다시 만들면 학습이 끊길 것 같고 기다리자니 시간만 가는 기분입니다. 몇 명의 방문 또는 어떤 행동까지 보고 수정 여부를 정하시나요?`,
      },
    ][template];
  }

  if (category === "feedback") {
    return [
      {
        title: `이 문장만 보고 ${product}에 돈 낼 이유가 보이나요?`,
        body: `첫 화면 문구를 ‘복잡한 과정을 줄여 매일 더 가볍게’라고 적었습니다. 팀에서는 감성적이고 좋다고 하지만, 처음 보는 사람은 무엇을 파는지 모르겠다는 반응도 있어요. ${product}의 기능을 더 직접적으로 써야 할지 결과만 보여줘야 할지 고민입니다. 이 문장에서 가장 먼저 지우거나 구체화할 단어 하나만 골라주세요.`,
      },
      {
        title: `${percent}% 할인 문구, 솔직히 더 싸 보여서 손해일까요?`,
        body: `${product} 첫 구매 장벽을 낮추려고 ${percent}% 할인 문구를 가장 크게 배치했습니다. 클릭은 늘었지만 원래 가격의 가치가 약해 보인다는 의견도 받았어요. 아직 브랜드를 모르는 고객에게 할인이 필요한지, 차라리 작은 체험 상품을 앞세울지 판단이 어렵습니다. 처음 봤을 때 어느 쪽이 더 신뢰가 가나요?`,
      },
      {
        title: `첫 화면 ${seconds}초만 본다면 뭘 파는 곳처럼 느껴지나요?`,
        body: `${product} 랜딩페이지 첫 화면에 제품 사진보다 사용자의 문제를 크게 넣었습니다. 내부에서는 차별점이 잘 보인다고 하지만, 테스트한 분들은 아래로 내려가야 제품을 이해했어요. 첫 화면 ${seconds}초 안에 제품, 대상 고객, 차별점 중 무엇이 반드시 보여야 하는지 우선순위를 듣고 싶습니다.`,
      },
      {
        title: `옵션 ${weeks + 2}개, 고르기 편한가요 아니면 피곤한가요?`,
        body: `${product} 구매 옵션을 취향별로 ${weeks + 2}개 만들었습니다. 선택 폭이 넓다는 반응과 처음부터 뭘 골라야 할지 모르겠다는 반응이 정확히 갈려요. 가장 인기 있는 하나를 기본으로 두고 나머지를 숨길지 고민 중입니다. 처음 구매하는 입장이라면 몇 개까지 비교할 수 있을까요?`,
      },
      {
        title: `브랜드명보다 검색되는 설명을 앞에 두는 게 나을까요?`,
        body: `${product}를 처음 소개할 때 낯선 브랜드명을 크게 보여주고 그 아래에 설명을 두고 있습니다. 그런데 ${channel}에서 들어온 사람들은 브랜드명을 기억하지 못하고 제품 종류로 다시 검색하더라고요. 초기에는 이름을 각인시키기보다 무엇을 파는지 반복하는 편이 나을까요? 솔직한 첫인상이 궁금합니다.`,
      },
      {
        title: `후기 ${customers}개를 첫 화면에 두니 오히려 광고 같아졌습니다`,
        body: `${product}에 대한 짧은 후기 ${customers}개를 첫 화면에 모아뒀습니다. 신뢰를 주려는 의도였는데, 문장이 비슷해서 만들어낸 후기처럼 보인다는 피드백을 받았어요. 숫자를 줄이고 구체적인 후기 몇 개만 남길지, 사용 전후 상황을 보여줄지 고민입니다. 어떤 형태의 후기가 가장 실제처럼 느껴지나요?`,
      },
    ][template];
  }

  return [
    {
      title: `${weeks}주만 ${product}를 같이 팔아볼 파트너를 찾습니다`,
      body: `${product} 개발과 기본 테스트는 끝났고 이제 실제 고객을 만나야 합니다. 저는 제품 개선과 운영을 맡고, ${channel}에서 고객 접점을 만들 수 있는 분과 ${weeks}주 동안 작은 판매 실험을 해보고 싶어요. 처음부터 지분이나 장기 합류를 정하기보다 매주 목표와 결과를 공개하려 합니다. 비슷한 방식의 단기 협업에 관심 있는 분이 있을까요?`,
    },
    {
      title: `개발은 끝났는데 고객 ${customers}명에게 연락할 사람이 없습니다`,
      body: `${product} MVP는 바로 보여줄 수 있는 상태지만 저는 낯선 고객에게 연락하는 일을 계속 미루고 있습니다. 앞으로 ${weeks}주 동안 잠재 고객 ${customers}명을 함께 만나고 반응을 기록할 영업 파트너를 찾고 있어요. 업계 경력보다 직접 연락하고 거절 이유를 정리해본 경험을 중요하게 봅니다. 먼저 짧게 실험해볼 분 계실까요?`,
    },
    {
      title: `주말 하루에 ${product} 핵심 화면 5장만 완성해볼까요?`,
      body: `${product} 사용자 인터뷰와 기능 목록까지는 정리했지만 화면 흐름에서 막혀 있습니다. 이번 주말 온라인으로 집중해서 핵심 화면 5장만 프로토타입으로 만들 디자이너를 찾습니다. 저는 기획 정리와 구현을 맡고, 결과물이 나오면 사용자 ${customers}명에게 바로 테스트할 예정입니다. 짧고 결과가 분명한 협업을 선호하는 분이 있을까요?`,
    },
    {
      title: `${channel} 경험 있는 분과 예산 ${budget}만원으로 실험해보고 싶어요`,
      body: `${product}는 판매 중이지만 신규 고객 유입이 막혀 있습니다. 큰 대행 계약보다 ${budget}만원 안에서 ${channel} 가설 하나를 정하고 ${weeks}주간 실행할 파트너를 찾습니다. 매출만 약속하기보다 콘텐츠 수, 문의 수, 전환 과정을 함께 기록하려고 해요. 비슷한 초기 실험을 직접 운영해본 분이라면 어떤 조건부터 확인하고 싶으신가요?`,
    },
    {
      title: `아이디어 말고 이미 만든 ${product}, 공동창업자는 이른가요?`,
      body: `${product}를 혼자 만들어 사용자 ${customers}명에게 테스트했습니다. 이제 판매와 고객 인터뷰를 함께할 사람이 필요하지만, 몇 번 만나지 않은 상태에서 공동창업자를 정하는 건 위험하다고 생각해요. 우선 ${weeks}주 동안 주당 가능한 시간과 맡을 결과를 정해 협업해보려 합니다. 이런 시험 협업에서 반드시 합의해야 할 항목이 무엇일까요?`,
    },
    {
      title: `매출 ${percent}%를 나누는 조건으로 판매 파트너를 구합니다`,
      body: `${product} 생산과 배송은 제가 맡을 수 있지만 ${channel} 운영 경험이 없습니다. 고정 외주비 대신 실제 판매에서 발생한 매출의 ${percent}%를 나누는 짧은 실험을 생각하고 있어요. 기간은 ${weeks}주, 비용과 데이터는 모두 공개하려 합니다. 이런 조건에서 역할과 기여를 공정하게 나누려면 무엇을 먼저 정해야 할까요?`,
    },
  ][template];
}

function generateFallbackPost({
  category,
  date,
  slot,
  recentTitles,
}: {
  category: BoardCategory;
  date: string;
  slot: number;
  recentTitles: string[];
}): GeneratedPost {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    const candidate = fallbackCandidate(category, `${date}:${slot}:${attempt}`);
    if (!nearDuplicate(candidate.title, recentTitles)) return candidate;
  }
  throw new Error("Fallback generator could not produce a distinct title.");
}

async function generatePost({
  category,
  date,
  slot,
  recentTitles,
}: {
  category: BoardCategory;
  date: string;
  slot: number;
  recentTitles: string[];
}): Promise<GeneratedPost> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return generateFallbackPost({ category, date, slot, recentTitles });
  const client = new Anthropic({ apiKey });
  const recent = recentTitles.slice(0, 60).map((title) => `- ${title}`).join("\n");
  let lastError: unknown;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await client.messages.create({
        model: process.env.BOARD_AUTOMATION_MODEL ?? "claude-opus-5",
        max_tokens: 1400,
        system: [
          "당신은 한국의 초기 창업가 익명 커뮤니티에 올라갈 게시글을 쓰는 전문 에디터다.",
          "광고문이 아니라 실제 사람이 오늘 겪은 일처럼 구체적이고 생활감 있게 쓴다.",
          "제목 첫 구절에 갈등, 숫자, 실수, 반전 또는 선택을 넣어 클릭하고 싶게 만든다.",
          "낚시만 하고 본문이 비어 있으면 안 된다. 본문에는 상황, 실제 제약, 이미 해본 행동을 담는다.",
          "말투와 문장 길이를 매번 바꾸고, 완벽하게 정돈된 칼럼체나 AI 특유의 요약체를 피한다.",
          "실존 인물이나 식별 가능한 회사에 관한 주장을 만들지 말고 개인정보, 연락처, 외부 링크를 쓰지 않는다.",
          "과장 광고, 투자 권유, 의료·법률 조언은 쓰지 않는다.",
          "마지막에는 댓글로 답하기 쉬운 하나의 구체적인 질문이나 요청을 둔다.",
          "반드시 JSON 하나만 출력한다: {\"title\":\"제목\",\"body\":\"본문\"}",
        ].join("\n"),
        messages: [{
          role: "user",
          content: [
            `작성 날짜: ${date}`,
            `카테고리: ${category}`,
            `카테고리 지침: ${CATEGORY_GUIDANCE[category]}`,
            `이번 글의 후킹 각도: ${HOOK_ANGLES[slot % HOOK_ANGLES.length]}`,
            `오늘의 변주 번호: ${slot + 1}-${attempt}`,
            "제목은 12~55자, 본문은 줄바꿈을 포함해 180~700자로 작성한다.",
            "아래 최근 제목과 소재·숫자·갈등이 겹치지 않게 완전히 다른 글을 쓴다.",
            recent || "- 최근 글 없음",
          ].join("\n"),
        }],
      });
      const text = response.content
        .filter((block) => block.type === "text")
        .map((block) => block.text)
        .join("");
      const post = parseGeneratedPost(text);
      if (nearDuplicate(post.title, recentTitles)) {
        throw new Error("Generated title is too similar to a recent post.");
      }
      return post;
    } catch (error) {
      lastError = error;
    }
  }
  console.error("[board-posts] AI generation exhausted retries; using fallback.", lastError);
  return generateFallbackPost({ category, date, slot, recentTitles });
}

function isUniqueConflict(error: DatabaseError) {
  return error?.code === "23505" || /duplicate key|unique constraint/i.test(error?.message ?? "");
}

export async function ensureDailyAutomatedBoardPosts(
  now = new Date(),
): Promise<EnsureDailyBoardPostsResult> {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase admin client is not configured.");

  const current = kstParts(now);
  const dueSlots = DAILY_SLOT_MINUTES
    .map((minutes, slot) => ({ minutes, slot }))
    .filter(({ minutes }) => current.minutes >= minutes);
  const dueIds = dueSlots.map(({ slot }) => stableUuid(`${current.date}:${slot}`));
  if (dueIds.length === 0) {
    return {
      date: current.date,
      target: DAILY_POST_TARGET,
      due: 0,
      existing: 0,
      created: 0,
      postIds: [],
    };
  }

  const { data: existingRows, error: existingError } = await admin
    .from("board_posts")
    .select("id")
    .in("id", dueIds);
  if (existingError) throw new Error(existingError.message || "Failed to inspect daily board posts.");
  const existingIds = new Set((existingRows ?? []).map((row) => row.id));
  const missingSlots = dueSlots.filter(({ slot }) => !existingIds.has(stableUuid(`${current.date}:${slot}`)));

  if (missingSlots.length === 0) {
    return {
      date: current.date,
      target: DAILY_POST_TARGET,
      due: dueSlots.length,
      existing: existingIds.size,
      created: 0,
      postIds: dueIds,
    };
  }

  const [{ data: adminProfile, error: profileError }, { data: recentRows, error: recentError }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("id")
        .eq("role", "admin")
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle(),
      admin
        .from("board_posts")
        .select("title")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(100),
    ]);
  if (profileError || !adminProfile?.id) {
    throw new Error(profileError?.message || "No administrator profile is available for board automation.");
  }
  if (recentError) throw new Error(recentError.message || "Failed to read recent board titles.");

  const recentTitles = (recentRows ?? [])
    .map((row) => row.title)
    .filter((title): title is string => typeof title === "string" && Boolean(title.trim()));
  const createdIds: string[] = [];

  for (const { minutes, slot } of missingSlots) {
    const id = stableUuid(`${current.date}:${slot}`);
    const category = categoryForSlot(current.date, slot);
    const generated = await generatePost({
      category,
      date: current.date,
      slot,
      recentTitles,
    });
    const createdAt = slotDate(current.date, minutes);
    const { error } = await admin.from("board_posts").insert({
      id,
      author_id: adminProfile.id,
      author_visibility: "anonymous",
      category,
      title: generated.title,
      body: generated.body,
      status: "published",
      created_at: createdAt,
      updated_at: createdAt,
    });
    if (error) {
      if (isUniqueConflict(error)) continue;
      throw new Error(error.message || `Failed to publish automated board post ${slot}.`);
    }
    createdIds.push(id);
    recentTitles.unshift(generated.title);
  }

  return {
    date: current.date,
    target: DAILY_POST_TARGET,
    due: dueSlots.length,
    existing: existingIds.size,
    created: createdIds.length,
    postIds: [...existingIds, ...createdIds],
  };
}
