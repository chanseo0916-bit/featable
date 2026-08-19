import type { Brand, Community, EventItem, Feature, Founder, Job, Partner, Product, SupportProgram } from "@/lib/types";

const image = (slug: string, width = 1200, height = 800) => `https://picsum.photos/seed/${slug}/${width}/${height}`;

export const founders: Founder[] = [
  { slug: "minseo-kim", name: "김민서", avatarUrl: image("founder-minseo", 240, 240), headline: "매일 쓰고 싶은 업무 도구를 만듭니다.", bio: "제품을 통해 일하는 사람들의 작은 불편을 해결합니다.", brandSlugs: ["caramel-lab"] },
  { slug: "jiyoon-lee", name: "이지윤", avatarUrl: image("founder-jiyoon", 240, 240), headline: "더 건강한 식탁을 설계하는 창업가", brandSlugs: ["grain-table"] },
  { slug: "doheon-park", name: "박도헌", avatarUrl: image("founder-doheon", 240, 240), headline: "팀의 실행력을 높이는 개발자", brandSlugs: ["flow-note"] },
  { slug: "sora-han", name: "한소라", avatarUrl: image("founder-sora", 240, 240), headline: "취향을 발견하는 새로운 방법", brandSlugs: ["moodboard"] },
];

export const brands: Brand[] = [
  { slug: "caramel-lab", name: "카라멜랩", logoUrl: image("logo-caramel", 160, 160), coverUrl: image("cover-caramel"), tagline: "생각을 정리하면, 일이 빨라집니다.", description: "팀의 아이디어와 업무를 한 곳에서 정리하는 AI 노트 SaaS입니다.", problem: "회의와 자료가 여러 곳에 흩어져 중요한 생각이 사라집니다.", audience: "빠르게 움직이는 작은 팀", category: "AI", founderSlug: "minseo-kim", foundedAt: "2025-03", productSlugs: ["caramel-note"], featureSlugs: ["caramel-founder-story"] },
  { slug: "grain-table", name: "그레인테이블", logoUrl: image("logo-grain", 160, 160), coverUrl: image("cover-grain"), tagline: "매일의 식사를 더 단단하게.", description: "바쁜 사람을 위한 균형 잡힌 곡물 식품 브랜드입니다.", category: "F&B", founderSlug: "jiyoon-lee", productSlugs: ["grain-box"], featureSlugs: ["grain-launch-story"] },
  { slug: "flow-note", name: "플로우노트", logoUrl: image("logo-flow", 160, 160), tagline: "일의 흐름을 끊지 않는 협업.", description: "개발팀을 위한 가볍고 빠른 협업 워크스페이스입니다.", category: "SaaS", founderSlug: "doheon-park", productSlugs: ["flow-board"], featureSlugs: [] },
  { slug: "moodboard", name: "무드보드", logoUrl: image("logo-mood", 160, 160), tagline: "나의 취향이 모이는 곳.", description: "좋아하는 것들을 모으고 새로운 취향을 발견하는 큐레이션 서비스입니다.", category: "콘텐츠", founderSlug: "sora-han", productSlugs: ["mood-archive"], featureSlugs: [] },
];

export const products: Product[] = [
  { slug: "caramel-note", name: "카라멜 노트", heroUrl: image("product-caramel", 1200, 900), images: [image("caramel-detail-1", 900, 1100), image("caramel-detail-2", 900, 1100)], brandSlug: "caramel-lab", founderSlug: "minseo-kim", tagline: "팀의 모든 생각을 한 번에 연결하는 AI 노트", story: [{ type: "text", heading: "왜 만들었나요?", body: "좋은 아이디어는 회의가 끝난 뒤에도 계속 자라야 합니다. 카라멜 노트는 흩어진 메모를 팀의 다음 액션으로 바꿉니다." }, { type: "image", src: image("caramel-story", 900, 1100), alt: "카라멜 노트를 사용하는 모습", caption: "생각을 기록하는 순간부터 팀의 일이 시작됩니다." }], problem: "회의록, 링크, 할 일이 여러 도구에 흩어져 다시 찾기 어렵습니다.", solution: "대화와 자료를 자동으로 정리하고 다음 액션까지 연결합니다.", features: ["AI 회의 요약", "프로젝트별 지식 연결", "팀 액션 자동 추출"], category: "AI", price: "월 9,900원", officialUrl: "https://example.com", viewCount: 1280, mentorNote: { mentorName: "김OO", mentorField: "Marketing", comment: "첫 메시지가 명확하고, 작은 팀을 위한 제품의 장점이 잘 보입니다." }, relatedFeatureSlugs: ["caramel-founder-story"] },
  { slug: "grain-box", name: "아침 곡물박스", heroUrl: image("product-grain", 1200, 900), images: [image("grain-detail", 900, 1100)], brandSlug: "grain-table", founderSlug: "jiyoon-lee", tagline: "바쁜 아침을 위한 한 끼", story: [{ type: "text", heading: "좋은 아침의 기준", body: "아침을 거르는 사람도 부담 없이 시작할 수 있는 식사를 만들었습니다." }], problem: "건강한 아침을 챙기기에는 매일의 시간이 부족합니다.", solution: "간편하지만 든든한 곡물 한 끼를 문 앞으로 보냅니다.", features: ["주간 배송", "맞춤 구성", "국산 곡물"], category: "F&B", price: "월 29,000원", officialUrl: "https://example.com", viewCount: 842 },
  { slug: "flow-board", name: "플로우보드", heroUrl: image("product-flow", 1200, 900), images: [], brandSlug: "flow-note", founderSlug: "doheon-park", tagline: "개발팀을 위한 가장 가벼운 보드", story: [{ type: "text", heading: "일의 맥락을 잃지 않도록", body: "작은 팀이 복잡한 설정 없이 바로 시작할 수 있는 협업 공간입니다." }], problem: "프로젝트 관리 도구가 오히려 팀의 속도를 늦춥니다.", solution: "필요한 기능만 남긴 빠른 협업 보드입니다.", features: ["한 화면 칸반", "GitHub 연결", "주간 리포트"], category: "SaaS", officialUrl: "https://example.com", viewCount: 531 },
  { slug: "mood-archive", name: "무드 아카이브", heroUrl: image("product-mood", 1200, 900), images: [], brandSlug: "moodboard", founderSlug: "sora-han", tagline: "좋아하는 것에서 시작하는 취향 탐색", story: [{ type: "text", heading: "취향은 발견하는 것", body: "저장해둔 이미지와 장소를 연결해 나만의 취향 지도를 만듭니다." }], problem: "좋아하는 것들이 저장함 속에서 서로 연결되지 않습니다.", solution: "취향의 패턴을 발견하고 다음 영감을 추천합니다.", features: ["취향 컬렉션", "공간별 큐레이션", "새로운 발견"], category: "콘텐츠", officialUrl: "https://example.com", viewCount: 391 },
];

export const features: Feature[] = [
  { slug: "caramel-founder-story", title: "대학생 때 시작해 6개월 만에 1만 사용자를 만든 팀", coverUrl: image("feature-caramel", 1400, 900), kind: "interview", excerpt: "작은 팀의 기록을 다음 실행으로 바꾸는 카라멜랩의 이야기", body: [{ type: "text", heading: "기록이 실행이 되기까지", body: "카라멜랩은 팀의 대화 속에 있는 가능성을 놓치지 않기 위해 시작했습니다." }], brandSlug: "caramel-lab", founderSlug: "minseo-kim", publishedAt: "2026-08-12" },
  { slug: "grain-launch-story", title: "매일 먹는 것부터 바꾸고 싶었습니다", coverUrl: image("feature-grain", 1400, 900), kind: "brand-story", excerpt: "그레인테이블이 건강한 식사의 기준을 다시 묻는 방법", body: [{ type: "text", body: "좋은 식사가 특별한 날의 일이 되지 않도록." }], brandSlug: "grain-table", founderSlug: "jiyoon-lee", publishedAt: "2026-08-08" },
  { slug: "flow-small-team", title: "세 명의 개발팀이 복잡한 협업툴을 버린 이유", coverUrl: image("feature-flow-team", 1400, 900), kind: "case-study", excerpt: "기능을 더하기보다 일의 흐름을 지키기로 한 플로우노트", body: [{ type: "text", heading: "작을수록 가볍게", body: "좋은 협업은 도구를 관리하는 시간이 아니라 서로의 맥락을 이해하는 데서 시작합니다." }], brandSlug: "flow-note", founderSlug: "doheon-park", publishedAt: "2026-08-18" },
  { slug: "mood-taste-map", title: "저장만 하던 취향이 하나의 지도가 되기까지", coverUrl: image("feature-mood-map", 1400, 900), kind: "product-feature", excerpt: "무드보드가 흩어진 영감을 연결하는 새로운 방식", body: [{ type: "text", heading: "좋아하는 것에는 패턴이 있습니다", body: "무드보드는 사용자가 모은 장면에서 아직 발견하지 못한 취향을 찾아줍니다." }], brandSlug: "moodboard", founderSlug: "sora-han", publishedAt: "2026-08-17" },
  { slug: "first-100-users", title: "광고비 0원으로 첫 100명의 팬을 만든 과정", coverUrl: image("feature-first-fans", 1400, 900), kind: "qna", excerpt: "초기 창업가가 커뮤니티에서 진짜 사용자를 만나는 법", body: [{ type: "text", heading: "고객보다 먼저 팬을 만났습니다", body: "제품을 설명하기 전에 왜 만들었는지 이야기하자 사람들이 반응하기 시작했습니다." }], brandSlug: "caramel-lab", founderSlug: "minseo-kim", publishedAt: "2026-08-16" },
  { slug: "student-founder-week", title: "요즘 대학생 창업가는 무엇을 만들고 있을까", coverUrl: image("feature-student-founder", 1400, 900), kind: "update", excerpt: "캠퍼스에서 시작해 시장으로 향하는 네 팀의 이번 주", body: [{ type: "text", heading: "작게 시작하고 빠르게 만나는 팀들", body: "아이디어를 오래 품기보다 사용자에게 먼저 보여주는 창업가들을 만났습니다." }], founderSlug: "minseo-kim", publishedAt: "2026-08-19" },
];

export const events: EventItem[] = [
  { slug: "seoul-demo-day", name: "서울 초기 창업가 데모데이", coverUrl: image("event-demo"), host: "서울창업허브", startsAt: "2026-08-28T18:00:00+09:00", location: "서울 마포구", isOnline: false, fee: "무료", deadline: "2026-08-26", category: "데모데이", audience: "초기 창업가·투자자", applyUrl: "https://example.com" },
  { slug: "product-meetup", name: "작은 팀의 제품 만들기 밋업", coverUrl: image("event-meetup"), host: "Product People", startsAt: "2026-09-03T19:00:00+09:00", location: "온라인", isOnline: true, fee: "무료", category: "밋업", applyUrl: "https://example.com" },
  { slug: "founder-hackathon", name: "Founder Hack Night", coverUrl: image("event-hack"), host: "Build Club", startsAt: "2026-09-12T10:00:00+09:00", location: "성수동", isOnline: false, fee: "20,000원", category: "해커톤", applyUrl: "https://example.com" },
];

export const supportPrograms: SupportProgram[] = [
  { slug: "early-startup-package", name: "2026 초기창업패키지", agency: "창업진흥원", target: "창업 3년 이내", benefits: "사업화 자금 및 보육", amount: "최대 1억원", closeAt: "2026-08-23", region: "전국", field: "일반", applyUrl: "https://example.com", status: "마감임박" },
  { slug: "seoul-open-innovation", name: "서울 오픈이노베이션", agency: "서울경제진흥원", target: "기술 기반 스타트업", benefits: "대기업 협업·실증", amount: "사업별 상이", closeAt: "2026-09-14", region: "서울", field: "기술", applyUrl: "https://example.com", status: "모집중" },
  { slug: "university-founder", name: "대학 창업동아리 지원", agency: "창업진흥센터", target: "대학생 예비창업자", benefits: "팀 활동비 및 멘토링", amount: "최대 500만원", closeAt: "2026-09-02", region: "전국", field: "예비창업", applyUrl: "https://example.com", status: "모집중" },
];

export const communities: Community[] = [
  { slug: "youth-founders-club", name: "Youth Founders Club", logoUrl: image("community-yfc", 160, 160), intro: "젊은 창업가들이 서로의 다음을 만드는 커뮤니티", field: "창업", website: "https://example.com", founderSlugs: ["minseo-kim", "jiyoon-lee"] },
  { slug: "build-club", name: "Build Club", logoUrl: image("community-build", 160, 160), intro: "만들면서 배우는 사람들의 모임", field: "개발", website: "https://example.com", founderSlugs: ["doheon-park"] },
];

export const jobs: Job[] = [
  { slug: "caramel-product-designer", title: "Product Designer", brandSlug: "caramel-lab", role: "제품 디자인", type: "정규직", location: "서울 / 하이브리드", applyUrl: "https://example.com" },
  { slug: "flow-frontend-engineer", title: "Frontend Engineer", brandSlug: "flow-note", role: "프론트엔드 개발", type: "정규직", location: "서울", applyUrl: "https://example.com" },
  { slug: "grain-content-intern", title: "콘텐츠 인턴", brandSlug: "grain-table", role: "브랜드 콘텐츠", type: "인턴", location: "서울", applyUrl: "https://example.com" },
];

export const partners: Partner[] = [
  { name: "Youth Founders Club", logoUrl: image("partner-yfc", 160, 160), href: "/communities/youth-founders-club" },
  { name: "Build Club", logoUrl: image("partner-build", 160, 160), href: "/communities/build-club" },
  { name: "서울창업허브", logoUrl: image("partner-seoul", 160, 160), href: "https://example.com" },
  { name: "Product People", logoUrl: image("partner-product", 160, 160), href: "https://example.com" },
];
