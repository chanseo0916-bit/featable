import Link from "next/link";
import Image from "next/image";
import type { Partner } from "@/lib/types";
import { HeaderAuthActions } from "@/components/header-auth-actions";
import { BoardSplitTrigger } from "@/components/board-split-trigger";
import { bypassImageOptimization } from "@/lib/images";
import headerStyles from "@/components/site-header.module.css";

function FeatableLogo({ priority = false }: { priority?: boolean }) {
  return <Image src="/featable-logo.png" alt="FEATABLE" width={2061} height={385} priority={priority} />;
}

export function StudioBrand() {
  return <strong className="dash-brand-lockup"><FeatableLogo /><span>STUDIO</span></strong>;
}

export function Header({ showChannels = true }: { showChannels?: boolean } = {}) {
  return <header className="site-header"><div className="shell header-primary"><Link className="logo" href="/" aria-label="Featable 홈"><FeatableLogo priority /></Link><div className={headerStyles.searchCluster}><form className="header-search" action="/search" role="search" aria-label="사이트 검색"><span aria-hidden="true" /><input name="q" aria-label="창업가, 브랜드, 제품 검색" placeholder="창업가, 브랜드, 제품을 검색해보세요" /><button type="submit" aria-label="검색">검색</button></form><BoardSplitTrigger /></div><div className="nav-actions"><Link className={headerStyles.mobileSearch} href="/search" aria-label="사이트 검색"><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m15.5 15.5 4 4" /></svg></Link><HeaderAuthActions /></div></div>{showChannels && <div className="header-channel-row"><nav className="shell channel-nav" aria-label="주요 메뉴"><Link href="/products">피쳐</Link><Link href="/stories">스토리</Link><Link href="/brands">브랜드</Link><Link href="/events">이벤트</Link><Link href="/support">지원사업</Link><Link href="/communities">커뮤니티</Link><Link href="/jobs">채용</Link><Link href="/partners">파트너</Link></nav></div>}</header>;
}

export function Footer({ partners }: { partners: Partner[] }) {
  const partnerLinks = <div className="partner-row">{partners.map((partner, index) => <Link href={partner.href} key={`partner-${partner.name}-${index}`} title={partner.name}><span className="partner-logo-canvas"><img src={partner.logoUrl} alt={partner.name} /></span></Link>)}</div>;
  return <footer className="footer"><div className="shell"><div className="footer-top"><div><div className="footer-brand-lockup"><Link className="logo footer-logo" href="/"><FeatableLogo /></Link><span>피터블</span></div><p>창업가가 세상에 발견되기 시작하는 곳.</p></div><div className="footer-links"><div><strong>둘러보기</strong><Link href="/products">프로덕트</Link><Link href="/stories">스토리</Link><Link href="/events">행사</Link><Link href="/board">게시판</Link></div><div><strong>함께하기</strong><Link href="/submit">프로필 만들기</Link><Link href="/communities">커뮤니티</Link><Link href="/jobs">채용</Link><Link href="/partners">파트너</Link></div></div></div><div className="partner-area"><p className="partner-heading">함께하는 커뮤니티 · 파트너사</p><div className="partner-board">{partnerLinks}</div></div><div className="footer-bottom"><div className="footer-meta"><span>© 2026 Featable 피터블</span><span>창업가와 다음 발견을 연결합니다.</span></div><nav className="footer-legal"><Link href="/terms">이용약관</Link><Link href="/privacy">개인정보처리방침</Link></nav></div></div></footer>;
}

export function SectionHeader({ eyebrow, title, href = "#" }: { eyebrow?: string; title: string; href?: string | null }) {
  return <div className="section-header"> <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div>{href != null && <Link href={href}>전체보기 <span>→</span></Link>}</div>;
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "orange" | "dark" }) { return <span className={`badge badge-${tone}`}>{children}</span>; }

export function ImageCard({ src, alt, className = "" }: { src: string; alt: string; className?: string }) {
  // src가 비어 있으면(이미지 없음) 랜덤 이미지를 넣지 않고 이미지 아이콘을 보여준다.
  if (!src) {
    return (
      <div className={`image-card image-card--empty ${className}`} role="img" aria-label={alt}>
        <svg className="image-card-placeholder-icon" viewBox="0 0 24 24" aria-hidden="true">
          <circle cx="12" cy="8" r="3.5" />
          <path d="M5 20c.7-4.2 3-6.5 7-6.5s6.3 2.3 7 6.5" />
        </svg>
      </div>
    );
  }
  return (
    <div className={`image-card ${className}`}>
      <Image src={src} alt={alt} fill sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 25vw" unoptimized={bypassImageOptimization(src)} />
    </div>
  );
}
