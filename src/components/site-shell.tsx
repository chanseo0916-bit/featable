import Link from "next/link";
import Image from "next/image";
import type { Partner } from "@/lib/types";
import { HeaderAuthActions } from "@/components/header-auth-actions";

function FeatableLogo({ priority = false }: { priority?: boolean }) {
  return <Image src="/featable-logo.png" alt="FEATABLE" width={2061} height={385} priority={priority} />;
}

export function StudioBrand() {
  return <strong className="studio-brand-lockup"><FeatableLogo /><span>STUDIO</span></strong>;
}

export function Header() {
  return <header className="site-header"><div className="shell header-primary"><Link className="logo" href="/"><FeatableLogo priority /></Link><form className="header-search" action="/search"><span aria-hidden="true" /><input name="q" placeholder="창업가, 브랜드, 제품을 검색해보세요" /><button>검색</button></form><div className="nav-actions"><Link className="mobile-search-link" href="/search" aria-label="검색"><span /></Link><HeaderAuthActions /></div></div><div className="header-channel-row"><nav className="shell channel-nav"><Link href="/products">피쳐</Link><Link href="/stories">스토리</Link><Link href="/brands">브랜드</Link><Link href="/events">이벤트</Link><Link href="/support">지원사업</Link><Link href="/communities">커뮤니티</Link><Link href="/jobs">채용</Link><Link href="/partners">파트너</Link><i /><Link className="channel-highlight" href="/stories">이번 주 큐레이션</Link></nav></div></header>;
}

export function Footer({ partners }: { partners: Partner[] }) {
  return <footer className="footer"><div className="shell"><div className="footer-top"><div><Link className="logo footer-logo" href="/"><FeatableLogo /></Link><p>창업가가 세상에 발견되기 시작하는 곳.</p></div><div className="footer-links"><div><strong>둘러보기</strong><Link href="/products">프로덕트</Link><Link href="/stories">스토리</Link><Link href="/events">행사</Link></div><div><strong>함께하기</strong><Link href="/submit">브랜드 등록</Link><Link href="/communities">커뮤니티</Link><Link href="/jobs">채용</Link><Link href="/partners">파트너</Link></div></div></div><div className="partner-area"><p className="eyebrow">함께하는 커뮤니티</p><div className="partner-row">{partners.map((partner) => <Link href={partner.href} key={partner.name} title={partner.name}><img src={partner.logoUrl} alt={partner.name} /></Link>)}</div></div><div className="footer-bottom"><span>© 2026 Featable</span><span>창업가와 다음 발견을 연결합니다.</span></div></div></footer>;
}

export function SectionHeader({ eyebrow, title, href = "#" }: { eyebrow?: string; title: string; href?: string }) {
  return <div className="section-header"> <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><Link href={href}>전체보기 <span>→</span></Link></div>;
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "orange" | "dark" }) { return <span className={`badge badge-${tone}`}>{children}</span>; }

export function ImageCard({ src, alt, className = "" }: { src: string; alt: string; className?: string }) { return <div className={`image-card ${className}`}><img src={src} alt={alt} /></div>; }
