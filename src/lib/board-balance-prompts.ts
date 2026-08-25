export type BoardBalancePrompt = {
  key: string;
  question: string;
  optionA: string;
  optionB: string;
  optionAReasons: string[];
  optionBReasons: string[];
};

/**
 * Founder conversations for the daily board balance game.
 *
 * Keep this list deterministic: the same KST game date must always produce
 * the same prompt, even when the publishing job runs more than once.
 */
export const BOARD_BALANCE_AUTOMATION_PROMPTS: BoardBalancePrompt[] = [
  {
    key: "product-sales-problem",
    question: "진짜 잘 안 팔리는 상품이 있는데, 뭐가 문제일까?",
    optionA: "마케팅",
    optionB: "상품 퀄리티",
    optionAReasons: ["고객이 아직 모른다", "도달 채널이 약하다"],
    optionBReasons: ["써볼 이유가 약하다", "재구매가 이어지지 않는다"],
  },
  {
    key: "customer-focus",
    question: "초기 고객을 잡을 때 무엇을 먼저 좁힐까?",
    optionA: "한 업종에 깊게 판다",
    optionB: "여러 업종을 넓게 만난다",
    optionAReasons: ["문제가 선명해진다", "추천이 빨라진다"],
    optionBReasons: ["큰 기회를 놓치지 않는다", "수요를 넓게 검증한다"],
  },
  {
    key: "first-product-scope",
    question: "첫 제품은 어디까지 만들어야 출시할 수 있을까?",
    optionA: "핵심 기능 하나만",
    optionB: "완성도 높은 전체 흐름",
    optionAReasons: ["학습 속도가 빠르다", "만들다 버릴 위험이 낮다"],
    optionBReasons: ["첫인상이 오래 남는다", "사용 맥락을 확인한다"],
  },
  {
    key: "founder-sales",
    question: "첫 10곳의 고객은 누가 직접 따야 할까?",
    optionA: "창업자가 직접 판다",
    optionB: "영업 전문가를 먼저 뽑는다",
    optionAReasons: ["고객 언어를 배운다", "빠르게 메시지를 고친다"],
    optionBReasons: ["파이프라인이 빨리 쌓인다", "창업자는 제품에 집중한다"],
  },
  {
    key: "free-trial",
    question: "초기 유저에게 제품을 어떻게 열어둘까?",
    optionA: "완전 무료로 푼다",
    optionB: "처음부터 돈을 받는다",
    optionAReasons: ["진입 장벽이 낮다", "사용 데이터를 모은다"],
    optionBReasons: ["진짜 수요만 남는다", "가격 감각을 빨리 얻는다"],
  },
  {
    key: "pricing-test",
    question: "가격이 애매할 때 무엇을 먼저 확인할까?",
    optionA: "더 비싸게 제안한다",
    optionB: "더 싸게 진입시킨다",
    optionAReasons: ["가치를 선명하게 말한다", "고객군이 선별된다"],
    optionBReasons: ["도입 장벽을 낮춘다", "사용 표본이 늘어난다"],
  },
  {
    key: "enterprise-contract",
    question: "큰 고객이 무리한 커스텀을 요구한다면?",
    optionA: "이번 계약을 위해 만든다",
    optionB: "제품 원칙을 지킨다",
    optionAReasons: ["현금과 레퍼런스를 얻는다", "현장 요구를 배운다"],
    optionBReasons: ["제품이 복잡해지지 않는다", "다음 고객도 빨리 온보딩한다"],
  },
  {
    key: "marketing-channel",
    question: "마케팅 예산이 하나뿐이라면 어디에 걸까?",
    optionA: "콘텐츠를 꾸준히 쌓는다",
    optionB: "광고로 빠르게 테스트한다",
    optionAReasons: ["신뢰가 자산으로 남는다", "검색 유입이 누적된다"],
    optionBReasons: ["결과를 빨리 비교한다", "잘 먹히는 소재를 찾는다"],
  },
  {
    key: "launch-message",
    question: "출시 첫날 어떤 약속을 전면에 둘까?",
    optionA: "가장 큰 결과",
    optionB: "가장 빠른 변화",
    optionAReasons: ["임팩트가 강하게 보인다", "고가 고객을 끌어온다"],
    optionBReasons: ["효과를 상상하기 쉽다", "체험 전환이 올라간다"],
  },
  {
    key: "growth-loop",
    question: "성장을 하나만 설계한다면 무엇을 고를까?",
    optionA: "추천이 퍼지는 구조",
    optionB: "반복 사용이 깊어지는 구조",
    optionAReasons: ["획득 비용이 내려간다", "고객이 영업을 돕는다"],
    optionBReasons: ["이탈이 줄어든다", "매출 예측이 쉬워진다"],
  },
  {
    key: "activation-metric",
    question: "초기 성장 지표 하나만 본다면 무엇일까?",
    optionA: "가입자 수",
    optionB: "첫 가치 경험률",
    optionAReasons: ["시장 관심을 가늠한다", "유입 흐름을 볼 수 있다"],
    optionBReasons: ["제품의 진짜 힘을 본다", "허수 성장을 걸러낸다"],
  },
  {
    key: "retention-fix",
    question: "첫 주 이탈이 높을 때 어디부터 고칠까?",
    optionA: "온보딩을 짧게 만든다",
    optionB: "핵심 가치를 더 강하게 만든다",
    optionAReasons: ["첫 사용 피로를 줄인다", "가치를 빨리 보여준다"],
    optionBReasons: ["다시 찾을 이유가 생긴다", "제품 차별점이 선명해진다"],
  },
  {
    key: "fundraising-timing",
    question: "투자는 언제 받는 게 창업자에게 유리할까?",
    optionA: "지금 크게 받는다",
    optionB: "지표를 만든 뒤 받는다",
    optionAReasons: ["실험 속도가 빨라진다", "채용 선택지가 넓어진다"],
    optionBReasons: ["희석을 줄일 수 있다", "협상력이 올라간다"],
  },
  {
    key: "runway-choice",
    question: "런웨이가 6개월 남았다면 무엇을 줄일까?",
    optionA: "팀 규모를 줄인다",
    optionB: "성장 실험을 줄인다",
    optionAReasons: ["생존 기간이 길어진다", "집중력이 높아진다"],
    optionBReasons: ["큰 기회를 지킨다", "성장 모멘텀을 유지한다"],
  },
  {
    key: "investor-fit",
    question: "투자자를 고를 때 무엇을 더 우선할까?",
    optionA: "업계 네트워크",
    optionB: "창업자와의 합",
    optionAReasons: ["소개와 채용이 쉬워진다", "시장 정보가 빨라진다"],
    optionBReasons: ["어려울 때 믿고 간다", "간섭 비용이 낮다"],
  },
  {
    key: "fundraising-story",
    question: "투자자에게 어떤 미래를 먼저 보여줄까?",
    optionA: "큰 시장의 크기",
    optionB: "지금의 고객 증거",
    optionAReasons: ["상승 여력을 보여준다", "비전이 선명해진다"],
    optionBReasons: ["실행력을 증명한다", "과장처럼 들리지 않는다"],
  },
  {
    key: "cofounder-conflict",
    question: "공동창업자와 큰 의견 충돌이 생긴다면?",
    optionA: "데이터로 결론 낸다",
    optionB: "빠르게 한쪽에 위임한다",
    optionAReasons: ["감정 소모가 줄어든다", "가설을 함께 검증한다"],
    optionBReasons: ["결정이 늦어지지 않는다", "책임 소재가 분명해진다"],
  },
  {
    key: "cofounder-equity",
    question: "공동창업자 지분은 무엇을 기준으로 나눌까?",
    optionA: "초기 기여도",
    optionB: "앞으로의 역할",
    optionAReasons: ["시작의 공을 인정한다", "합의가 직관적이다"],
    optionBReasons: ["미래 책임을 반영한다", "장기 동기를 만든다"],
  },
  {
    key: "hiring-first-role",
    question: "첫 번째 핵심 채용은 어떤 사람이어야 할까?",
    optionA: "나보다 잘하는 전문가",
    optionB: "무엇이든 하는 제너럴리스트",
    optionAReasons: ["병목을 즉시 푼다", "팀의 기준이 높아진다"],
    optionBReasons: ["초기 변화를 잘 버틴다", "역할 공백을 메운다"],
  },
  {
    key: "hiring-signal",
    question: "면접에서 가장 강한 채용 신호는 무엇일까?",
    optionA: "과거 성과",
    optionB: "문제 푸는 방식",
    optionAReasons: ["검증된 실행을 본다", "역할 적합성을 가늠한다"],
    optionBReasons: ["낯선 문제를 예측한다", "성장 가능성을 본다"],
  },
  {
    key: "hiring-speed",
    question: "좋은 후보가 나타났을 때 채용 속도는?",
    optionA: "일주일 안에 결정한다",
    optionB: "더 오래 검증한다",
    optionAReasons: ["좋은 인재를 놓치지 않는다", "채용 경쟁에서 앞선다"],
    optionBReasons: ["미스핏 비용을 줄인다", "팀과의 합을 확인한다"],
  },
  {
    key: "team-standard",
    question: "작은 팀의 기준은 무엇으로 먼저 세울까?",
    optionA: "속도",
    optionB: "완성도",
    optionAReasons: ["학습 주기가 짧아진다", "기회를 빠르게 잡는다"],
    optionBReasons: ["신뢰가 쌓인다", "나중의 재작업이 줄어든다"],
  },
  {
    key: "delegation",
    question: "창업자가 놓아야 할 일은 무엇부터일까?",
    optionA: "반복 운영",
    optionB: "고객 인터뷰",
    optionAReasons: ["레버리지 업무에 집중한다", "팀이 자립한다"],
    optionBReasons: ["고객 감각을 잃지 않는다", "문제의 본질을 붙든다"],
  },
  {
    key: "sales-motion",
    question: "초기 매출은 어떤 방식으로 만들어야 할까?",
    optionA: "고객 맞춤형 영업",
    optionB: "셀프서브 결제",
    optionAReasons: ["큰 계약을 빨리 만든다", "구매 장벽을 직접 배운다"],
    optionBReasons: ["판매가 자동으로 쌓인다", "시장 범위를 넓힌다"],
  },
  {
    key: "sales-discount",
    question: "계약 직전 가격을 깎아달라면 어떻게 할까?",
    optionA: "가격을 낮춰 닫는다",
    optionB: "조건을 지키고 기다린다",
    optionAReasons: ["현금 흐름이 생긴다", "첫 레퍼런스를 확보한다"],
    optionBReasons: ["가격 기준이 무너지지 않는다", "가치 중심 고객을 만난다"],
  },
  {
    key: "market-entry",
    question: "새 시장에 들어갈 때 무엇으로 시작할까?",
    optionA: "작은 틈새를 장악한다",
    optionB: "대중 시장을 바로 노린다",
    optionAReasons: ["메시지가 날카로워진다", "초기 승리가 쉬워진다"],
    optionBReasons: ["시장 크기를 빠르게 증명한다", "브랜드가 크게 보인다"],
  },
  {
    key: "competition",
    question: "강한 경쟁자가 따라오면 어떤 전략을 택할까?",
    optionA: "더 빠르게 출시한다",
    optionB: "더 깊은 해자를 판다",
    optionAReasons: ["학습 우위를 만든다", "고객 접점을 선점한다"],
    optionBReasons: ["가격 경쟁을 피한다", "따라 하기 어려워진다"],
  },
  {
    key: "roadmap-vote",
    question: "로드맵 우선순위는 누구의 목소리로 정할까?",
    optionA: "가장 큰 고객",
    optionB: "반복되는 다수 요구",
    optionAReasons: ["매출 임팩트가 크다", "깊은 사용 사례를 얻는다"],
    optionBReasons: ["제품 방향이 넓어진다", "특정 고객 의존이 줄어든다"],
  },
  {
    key: "feature-request",
    question: "고객 요청이 쏟아질 때 무엇을 먼저 볼까?",
    optionA: "요청한 고객의 규모",
    optionB: "문제의 반복 빈도",
    optionAReasons: ["매출로 바로 연결된다", "큰 계정을 지킬 수 있다"],
    optionBReasons: ["제품 공통성이 높아진다", "확장성이 좋아진다"],
  },
  {
    key: "brand-voice",
    question: "초기 브랜드는 어떤 목소리를 가져야 할까?",
    optionA: "대담하고 도발적으로",
    optionB: "차분하고 신뢰감 있게",
    optionAReasons: ["기억에 오래 남는다", "팬을 빠르게 만든다"],
    optionBReasons: ["구매 불안을 낮춘다", "큰 고객에게 잘 맞는다"],
  },
  {
    key: "content-founder",
    question: "창업자 콘텐츠는 어떤 이야기를 해야 할까?",
    optionA: "실패와 시행착오",
    optionB: "성과와 숫자",
    optionAReasons: ["공감과 신뢰가 생긴다", "여정에 사람들이 붙는다"],
    optionBReasons: ["실력을 빠르게 증명한다", "투자 관심을 끌어온다"],
  },
  {
    key: "community-growth",
    question: "커뮤니티를 키울 때 무엇을 먼저 만들까?",
    optionA: "활발한 대화",
    optionB: "유용한 아카이브",
    optionAReasons: ["관계가 빠르게 만들어진다", "재방문이 자연스럽다"],
    optionBReasons: ["검색 자산이 쌓인다", "신규 유입을 돕는다"],
  },
  {
    key: "burnout-boundary",
    question: "번아웃 조짐이 보일 때 무엇을 지킬까?",
    optionA: "주말 완전 휴식",
    optionB: "매일 짧은 회복 시간",
    optionAReasons: ["회복을 확실히 확보한다", "일과 삶의 경계가 선다"],
    optionBReasons: ["리듬이 쉽게 무너지지 않는다", "작은 피로를 바로 푼다"],
  },
  {
    key: "founder-priority",
    question: "이번 주 시간을 하나에 몰아준다면?",
    optionA: "고객을 더 만난다",
    optionB: "제품을 더 만든다",
    optionAReasons: ["우선순위가 선명해진다", "지불 의사를 확인한다"],
    optionBReasons: ["사용 경험을 개선한다", "핵심 병목을 제거한다"],
  },
  {
    key: "decision-making",
    question: "불확실한 결정 앞에서 무엇을 믿을까?",
    optionA: "작은 실험",
    optionB: "창업자의 직감",
    optionAReasons: ["리스크를 작게 진다", "팀이 함께 납득한다"],
    optionBReasons: ["결정이 빠르다", "새로운 길을 연다"],
  },
  {
    key: "pivot-signal",
    question: "피벗을 고민하게 만드는 가장 큰 신호는?",
    optionA: "고객이 돈을 안 낸다",
    optionB: "팀이 문제를 믿지 않는다",
    optionAReasons: ["수요가 냉정하게 드러난다", "사업 지속성이 흔들린다"],
    optionBReasons: ["실행 에너지가 떨어진다", "문제 이해가 어긋났을 수 있다"],
  },
  {
    key: "profit-vs-growth",
    question: "매출이 생기기 시작하면 무엇을 우선할까?",
    optionA: "흑자 전환",
    optionB: "공격적 성장",
    optionAReasons: ["외부 변수에 강해진다", "의사결정이 자유로워진다"],
    optionBReasons: ["시장 지위를 선점한다", "규모의 이익을 만든다"],
  },
  {
    key: "focus-vs-opportunity",
    question: "예상 밖의 큰 기회가 오면 어떻게 할까?",
    optionA: "현재 핵심에 집중한다",
    optionB: "기회를 잡고 방향을 튼다",
    optionAReasons: ["팀의 집중력이 지켜진다", "약속한 고객을 놓치지 않는다"],
    optionBReasons: ["성장 속도가 폭발할 수 있다", "새 시장을 선점한다"],
  },
  {
    key: "customer-feedback",
    question: "고객 피드백이 서로 엇갈릴 때 무엇을 따를까?",
    optionA: "가장 자주 나온 말",
    optionB: "가장 절실한 행동",
    optionAReasons: ["공통 문제를 찾기 쉽다", "제품 방향이 안정적이다"],
    optionBReasons: ["진짜 불편을 포착한다", "말보다 행동을 믿는다"],
  },
  {
    key: "exit-vs-independence",
    question: "회사의 다음 목표는 무엇이어야 할까?",
    optionA: "빠른 매각",
    optionB: "오래가는 독립 회사",
    optionAReasons: ["창업자 보상이 빨라진다", "새 자원을 만날 수 있다"],
    optionBReasons: ["장기 가치를 직접 쌓는다", "외부 목표에 흔들리지 않는다"],
  },
  {
    key: "early-metric",
    question: "이번 달 팀이 함께 볼 숫자는 무엇일까?",
    optionA: "신규 매출",
    optionB: "활성 고객 유지율",
    optionAReasons: ["현금의 현실을 본다", "영업 실행이 선명해진다"],
    optionBReasons: ["제품의 체력을 본다", "성장 질을 확인한다"],
  },
  {
    key: "launch-timing",
    question: "출시가 80% 완성됐을 때 어떤 선택을 할까?",
    optionA: "지금 공개한다",
    optionB: "조금 더 다듬는다",
    optionAReasons: ["시장 반응을 빨리 얻는다", "경쟁자보다 먼저 간다"],
    optionBReasons: ["첫 신뢰를 지킨다", "지원 비용을 줄인다"],
  },
  {
    key: "founder-role",
    question: "팀이 커질수록 창업자는 무엇을 해야 할까?",
    optionA: "비전을 반복한다",
    optionB: "병목을 직접 푼다",
    optionAReasons: ["팀의 방향이 정렬된다", "채용 매력이 높아진다"],
    optionBReasons: ["결과가 즉시 개선된다", "현장의 신호를 놓치지 않는다"],
  },
];

const DAY_MS = 24 * 60 * 60 * 1000;
const AUTOMATION_START_DAY = Date.parse("2026-08-26T00:00:00.000Z") / DAY_MS;

function dayNumber(gameDate: string): number {
  const parsed = Date.parse(`${gameDate}T00:00:00.000Z`);
  return Number.isFinite(parsed) ? Math.floor(parsed / DAY_MS) : AUTOMATION_START_DAY;
}

/** Selects the same prompt for a given KST calendar date on every run. */
export function getAutoBoardBalancePrompt(gameDate: string): BoardBalancePrompt {
  if (gameDate === "2026-08-26") return BOARD_BALANCE_AUTOMATION_PROMPTS[0];

  const offset = dayNumber(gameDate) - AUTOMATION_START_DAY;
  const index = ((offset % BOARD_BALANCE_AUTOMATION_PROMPTS.length) + BOARD_BALANCE_AUTOMATION_PROMPTS.length)
    % BOARD_BALANCE_AUTOMATION_PROMPTS.length;
  return BOARD_BALANCE_AUTOMATION_PROMPTS[index];
}
