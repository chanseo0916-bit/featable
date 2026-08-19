# FEATABLE — Codex 작업 지시서 (UI 담당)

> Featable은 초기 창업가의 제품·이야기·기회를 연결하는 큐레이션 플랫폼이다.
> "Wadiz는 제품을 소개해서 판매하게 하고, Featable은 창업가를 소개해서 발견되게 한다."
> 너(Codex)는 **UI 레이어 전체**를 담당한다. 백엔드/DB/인증/AI/SEO 인프라는 Claude 담당이므로 절대 건드리지 않는다.

---

## 0. 기술 스택 & 규약 (변경 금지)

- Next.js (App Router) + TypeScript + Tailwind CSS
- `src/` 디렉토리, import alias `@/*`
- 모든 페이지는 서버 컴포넌트 우선. 인터랙션 필요할 때만 `"use client"`
- 데이터는 전부 **목데이터**로 작업: `src/lib/mock/` 아래에 만들 것
- 타입은 `src/lib/types.ts` 사용 (아래 §3 계약 — Claude가 관리, 필드 추가/변경 금지. 필요하면 요청만)
- API 호출 코드 작성 금지. 컴포넌트는 props로 데이터를 받는 순수 프레젠테이션 구조로
- ⚠️ **홈·브랜드·프로덕트·검색 페이지는 `@/lib/data`의 `getCatalog()`로 데이터를 받는다** (실DB+목데이터 병합, Claude 관리). 페이지를 리디자인할 때 `@/lib/mock`의 brands/products/founders 직접 import로 되돌리지 말 것. events/support/communities/jobs/features/partners는 아직 mock 직접 import 사용.

## 1. 디자인 시스템 (엄격히 준수)

**완전한 흰색 배경 + 오렌지 강조.** 회색 배경 섹션 남발 금지.

```css
--background: #FFFFFF;      /* 모든 페이지 배경. 순백 유지 */
--foreground: #111111;      /* 본문 텍스트 */
--muted: #6B7280;           /* 보조 텍스트 */
--border: #E5E7EB;          /* 구분선, 카드 테두리 (그림자보다 헤어라인 테두리 선호) */
--accent: #EF4125;          /* 브랜드 오렌지: CTA, 링크, 활성 상태, 배지 */
--accent-hover: #D9361E;
--accent-soft: #FFF0ED;     /* 오렌지 틴트 배경 (배지, 하이라이트 박스에만) */
```

- 오렌지는 **강조에만**: CTA 버튼, 활성 탭, D-day 배지, 링크 호버, 멘토 배지 포인트
- 카드: 흰 배경 + 1px 헤어라인 테두리 + radius 12px. 무거운 그림자 금지
- 참고 UX: 상세페이지·카드는 Wadiz, 행사 카드는 이벤터스, 지원사업은 정부지원포털의 구조화된 정보 스타일
- 폰트: Pretendard (없으면 system-ui 스택). 한국어 서비스임
- 모바일 퍼스트 반응형 필수

## 2. 작업 범위 (우선순위 순서대로)

### T1. 공용 레이아웃 + 디자인 시스템 컴포넌트
- 글로벌 네비: 로고 `FEATABLE` / 메뉴: 프로덕트, 스토리, 행사, 지원사업, 더보기▾(창업가·커뮤니티·멘토·채용) / 우측: 검색 아이콘, 로그인(버튼만), **+ 브랜드 등록**(오렌지 CTA)
- 푸터: 사이트맵 링크 + "함께하는 커뮤니티" 파트너 로고 줄
- 공용 컴포넌트: `Button`, `Badge`, `Card`, `SectionHeader`(제목+"전체보기" 링크), `CategoryChip`, `DdayBadge`, `MentorBadge`

### T2. 홈 (`/`)
스펙 6장 구조 그대로, 위에서부터:
1. 검색 히어로 — "어떤 브랜드를 찾고 있나요?" + 큰 검색 인풋
2. 퀵 카테고리 칩 — AI, SaaS, F&B, 패션, 뷰티, 콘텐츠, 커머스, 라이프스타일, 교육, 개발, 기타
3. THIS WEEK'S FEATURE — 에디토리얼 히어로 (큰 이미지 + 창업가 이름 + 브랜드 + [이야기 보기])
4. 트렌딩 프로덕트 — 와디즈 스타일 이미지 카드 그리드 (이미지 / 제품명 / 브랜드명 / 카테고리 / Founder)
5. 새로 등록된 브랜드
6. Founder Stories — 사람 얼굴 중심 카드
7. 행사 — 이벤터스 스타일 카드 (이미지 / 행사명 / 날짜·장소 / 주최 / [신청하기])
8. 지원사업 — 리스트형 (D-day 배지 / 사업명 / 주관 / 지역·대상 / 지원규모)
9. 추천 커뮤니티
10. 채용 (간단 리스트)
11. 파트너 로고
12. 최종 CTA — "당신의 브랜드는 세상에 소개될 준비가 되었나요?" + [브랜드 등록하기]

### T3. Product Detail (`/products/[slug]`) — 와디즈 상세 스타일
- 상단: 히어로 이미지 / 제품명 / 브랜드 / Founder / 한 줄 소개 / [공식 사이트] [공유]
- 본문(세로 스토리텔링): "왜 만들었나요?" → Product Story(긴 이미지 섹션들, `story` 필드의 블록 배열을 순서대로 렌더) → 문제 → 솔루션 → 주요 기능 → Founder 카드 → Mentor's Note → 관련 스토리 → 관련 프로덕트
- 스토리 본문은 이미지 블록 + 텍스트 블록이 번갈아 나오는 구조 (types의 `StoryBlock` 참조)

### T4. Brand Detail (`/brands/[slug]`) — 핵심 허브
- 헤더: 로고 / 브랜드명 / 한 줄 소개 / Founder / 카테고리 / 홈페이지·SNS / [공유] [관심]
- 인페이지 탭 네비: 소개 · 프로덕트 · Founder · Story · Mentor's Note · Jobs
- 각 섹션 순서대로 렌더

### T5. 피드 & 리스트 페이지
- `/products` — 카테고리 필터 + 카드 그리드
- `/brands` — 브랜드 카드 그리드
- `/stories` + `/stories/[slug]` — Feature/스토리 리스트와 본문 (에디토리얼 레이아웃)
- `/events` — 이벤터스식 카드 그리드 + 카테고리 필터
- `/support` — 지원사업 리스트 + 필터(지역/대상/분야/모집상태) + D-day 정렬
- `/communities` + `/communities/[slug]` — 커뮤니티 프로필

### T6. 검색 (`/search`)
- 쿼리 파라미터 기반, 결과를 브랜드/프로덕트/스토리/지원사업 탭으로 구분 (목데이터 필터링이면 충분)

## 3. 데이터 타입 계약 (`src/lib/types.ts`)

이 타입 그대로 사용. 목데이터도 이 형태로 작성:

```ts
export type Category = "AI" | "SaaS" | "F&B" | "패션" | "뷰티" | "콘텐츠" | "커머스" | "라이프스타일" | "교육" | "개발" | "기타";

export interface Founder {
  slug: string; name: string; avatarUrl: string;
  headline: string;            // 한 줄 소개
  bio?: string;
  brandSlugs: string[];
}

export interface Brand {
  slug: string; name: string; logoUrl: string; coverUrl?: string;
  tagline: string;             // 한 줄 소개
  description: string;
  problem?: string; audience?: string;
  category: Category;
  founderSlug: string;
  website?: string; sns?: { instagram?: string; x?: string; youtube?: string };
  foundedAt?: string;          // "2025-03"
  productSlugs: string[]; featureSlugs: string[]; jobSlugs?: string[];
}

export type StoryBlock =
  | { type: "text"; heading?: string; body: string }
  | { type: "image"; src: string; alt: string; caption?: string };

export interface Product {
  slug: string; name: string; heroUrl: string; images: string[];
  brandSlug: string; founderSlug: string;
  tagline: string;
  story: StoryBlock[];         // 와디즈식 상세 본문
  problem: string; solution: string; features: string[];
  price?: string; buyUrl?: string; officialUrl?: string;
  category: Category;
  mentorNote?: MentorNote;
  relatedFeatureSlugs?: string[]; relatedProductSlugs?: string[];
  viewCount?: number;
}

export interface Feature {                    // = 스토리/인터뷰 콘텐츠
  slug: string; title: string; coverUrl: string;
  kind: "interview" | "brand-story" | "product-feature" | "launch" | "update" | "case-study" | "qna";
  excerpt: string; body: StoryBlock[];
  brandSlug?: string; founderSlug?: string;
  publishedAt: string;         // ISO
}

export interface MentorNote {
  mentorName: string; mentorField: string;    // 예: "Marketing"
  comment: string;
}

export interface EventItem {
  slug: string; name: string; coverUrl: string;
  host: string; startsAt: string; endsAt?: string;
  location: string; isOnline: boolean;
  fee?: string; deadline?: string;
  category: "데모데이" | "밋업" | "컨퍼런스" | "네트워킹" | "해커톤" | "세미나" | "교육" | "IR" | "기타";
  audience?: string; applyUrl: string;
  communitySlug?: string; brandSlug?: string;
}

export interface SupportProgram {
  slug: string; name: string; agency: string;
  target: string; benefits: string; amount?: string;
  openAt?: string; closeAt: string;            // D-day는 closeAt 기준 계산
  region: string; field?: string; applyUrl: string;
  status: "모집중" | "마감임박" | "마감" | "예정";
}

export interface Community {
  slug: string; name: string; logoUrl: string;
  intro: string; field: string;
  website?: string; sns?: { instagram?: string; x?: string };
  founderSlugs?: string[]; brandSlugs?: string[]; eventSlugs?: string[]; featureSlugs?: string[];
}

export interface Job {
  slug: string; title: string; brandSlug: string;
  role: string; type: "정규직" | "계약직" | "인턴" | "파트타임";
  location: string; applyUrl?: string;
}

export interface Partner { name: string; logoUrl: string; href: string }
```

## 4. 목데이터 규칙

- `src/lib/mock/` 에 엔티티별 파일 (`brands.ts`, `products.ts`, …) + `index.ts` 재수출
- 분량: 브랜드 8개, 프로덕트 12개, Founder 8명, 스토리 6개, 행사 8개, 지원사업 8개, 커뮤니티 4개, 채용 5개
- 내용은 그럴듯한 한국 초기 스타트업 가상 데이터 (예: "카라멜랩 — 대학생 팀이 만든 AI 노트 SaaS")
- 이미지는 일단 `https://picsum.photos/seed/{slug}/…` 플레이스홀더 사용. 추후 실제 이미지로 교체 예정

## 5. 하지 말 것 (Claude 담당 영역)

- ❌ 인증/로그인 로직, DB/Supabase, API 라우트(`app/api/**`), 서버 액션
- ❌ AI 생성 기능, 브랜드 등록 폼(8단계 위저드) — UI 뼈대도 만들지 말 것
- ❌ `src/lib/types.ts` 필드 변경 (추가 필요하면 주석으로 제안만)
- ❌ SEO 메타/사이트맵 인프라 (페이지별 `<h1>` 등 시맨틱 HTML은 지킬 것)
- 로그인/등록 버튼은 `href="/login"`, `href="/submit"` 링크만 걸어두면 됨 (페이지는 Claude가 만듦)

## 6. 완료 기준

- `npm run dev` 로 전 페이지가 목데이터로 완전히 동작
- 모바일(375px)~데스크톱(1280px) 반응형 확인
- 페이지 배경은 어디서든 순백, 오렌지는 강조에만 쓰였는지 확인
- 타입 에러 0 (`npx tsc --noEmit`)
