/**
 * Featable 공유 데이터 타입 — Claude가 관리하는 계약 파일.
 * UI(Codex)는 이 타입을 그대로 소비한다. 필드 변경이 필요하면 주석으로 제안만 남길 것.
 */

export type Category =
  | "AI"
  | "SaaS"
  | "F&B"
  | "패션"
  | "뷰티"
  | "콘텐츠"
  | "커머스"
  | "라이프스타일"
  | "교육"
  | "개발"
  | "기타";

export interface Founder {
  founderNumber?: number;
  slug: string;
  name: string;
  avatarUrl: string;
  role?: string; // 공개 프로필 카드에 표시할 역할/직무
  headline: string; // 한 줄 소개
  bio?: string;
  sns?: {
    instagram?: string;
    x?: string;
    linkedin?: string;
    website?: string;
  };
  brandSlugs: string[];
}

export interface Brand {
  slug: string;
  name: string;
  logoUrl: string;
  coverUrl?: string;
  tagline: string; // 한 줄 소개
  description: string;
  problem?: string;
  audience?: string;
  category: Category;
  founderSlug: string;
  website?: string;
  sns?: { instagram?: string; x?: string; youtube?: string };
  foundedAt?: string; // "2025-03"
  productSlugs: string[];
  featureSlugs: string[];
  jobSlugs?: string[];
  isFeatured?: boolean; // 관리자 Featured 지정 (홈 노출 우선)
  seoTitle?: string;
  seoDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  ogImageUrl?: string;
  isIndexable?: boolean;
  publishedAt?: string;
  updatedAt?: string;
}

/** 와디즈식 상세 본문: 이미지 블록과 텍스트 블록이 번갈아 나오는 세로 스토리텔링 */
export type StoryBlock =
  | { type: "text"; heading?: string; body: string; tone?: "default" | "highlight" }
  | { type: "image"; src: string; alt: string; caption?: string; frame?: "none" | "phone" }
  | { type: "features"; heading?: string; tone?: "default" | "highlight"; items: { title: string; body: string }[] };

export interface MentorNote {
  mentorName: string;
  mentorField: string; // 예: "Marketing"
  comment: string;
}

export interface Product {
  slug: string;
  name: string;
  heroUrl: string;
  images: string[];
  brandSlug: string;
  founderSlug: string;
  tagline: string;
  story: StoryBlock[];
  problem: string;
  solution: string;
  features: string[];
  price?: string;
  buyUrl?: string;
  officialUrl?: string;
  category: Category;
  mentorNote?: MentorNote;
  relatedFeatureSlugs?: string[];
  relatedProductSlugs?: string[];
  viewCount?: number;
  isFeatured?: boolean; // 관리자 Featured 지정 (홈 노출 우선)
  seoTitle?: string;
  seoDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  ogImageUrl?: string;
  isIndexable?: boolean;
  publishedAt?: string;
  updatedAt?: string;
}

/** Feature = 스토리/인터뷰 등 에디토리얼 콘텐츠 */
export interface Feature {
  slug: string;
  title: string;
  coverUrl: string;
  kind:
    | "interview"
    | "brand-story"
    | "product-feature"
    | "launch"
    | "update"
    | "case-study"
    | "qna";
  excerpt: string;
  body: StoryBlock[];
  brandSlug?: string;
  founderSlug?: string;
  publishedAt: string; // ISO
  viewCount?: number;
  seoTitle?: string;
  seoDescription?: string;
  primaryKeyword?: string;
  secondaryKeywords?: string[];
  ogImageUrl?: string;
  isIndexable?: boolean;
  updatedAt?: string;
}

export interface EventItem {
  slug: string;
  name: string;
  coverUrl: string;
  host: string;
  startsAt: string;
  endsAt?: string;
  location: string;
  isOnline: boolean;
  fee?: string;
  deadline?: string;
  category:
    | "데모데이"
    | "밋업"
    | "컨퍼런스"
    | "네트워킹"
    | "해커톤"
    | "세미나"
    | "교육"
    | "IR"
    | "기타";
  audience?: string;
  applyUrl: string;
  communitySlug?: string;
  brandSlug?: string;
}

export interface SupportProgram {
  slug: string;
  name: string;
  agency: string;
  target: string;
  benefits: string;
  amount?: string;
  openAt?: string;
  closeAt: string; // D-day는 closeAt 기준 계산
  region: string;
  field?: string;
  applyUrl: string;
  status: "모집중" | "마감임박" | "마감" | "예정";
}

export interface Community {
  slug: string;
  name: string;
  logoUrl: string;
  intro: string;
  field: string;
  website?: string;
  sns?: { instagram?: string; x?: string };
  founderSlugs?: string[];
  brandSlugs?: string[];
  eventSlugs?: string[];
  featureSlugs?: string[];
}

export interface Job {
  slug: string;
  title: string;
  brandSlug: string;
  role: string;
  type: "정규직" | "계약직" | "인턴" | "파트타임";
  location: string;
  applyUrl?: string;
}

export interface Partner {
  name: string;
  logoUrl: string;
  href: string;
  /** 파트너 페이지용 — 푸터 로고만 쓰는 경우 생략 가능 */
  intro?: string;
  description?: string;
  field?: string;
  /** Featured Partner = VIP 노출 (상단 + 뱃지), Basic = 일반 등록 */
  featured?: boolean;
}
