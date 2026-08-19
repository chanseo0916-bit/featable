import Link from "next/link";
import type { Partner } from "@/lib/types";

export function Header() {
  return <header className="site-header"><div className="shell nav-wrap"><Link className="logo" href="/">FEATABLE<span>.</span></Link><nav className="desktop-nav"><Link href="/products">프로덕트</Link><Link href="/stories">스토리</Link><Link href="/events">행사</Link><Link href="/support">지원사업</Link><details><summary>더보기</summary><div className="more-menu"><Link href="/founders">창업가</Link><Link href="/communities">커뮤니티</Link><Link href="/mentors">멘토</Link><Link href="/jobs">채용</Link></div></details></nav><div className="nav-actions"><Link className="search-link" href="/search">⌕<span className="sr-only">검색</span></Link><Link className="login-link" href="/login">로그인</Link><Link className="button button-small" href="/submit">+ 브랜드 등록</Link></div></div></header>;
}

export function Footer({ partners }: { partners: Partner[] }) {
  return <footer className="footer"><div className="shell"><div className="footer-top"><div><Link className="logo" href="/">FEATABLE<span>.</span></Link><p>창업가가 세상에 발견되기 시작하는 곳.</p></div><div className="footer-links"><div><strong>둘러보기</strong><Link href="/products">프로덕트</Link><Link href="/stories">스토리</Link><Link href="/events">행사</Link></div><div><strong>함께하기</strong><Link href="/submit">브랜드 등록</Link><Link href="/communities">커뮤니티</Link><Link href="/jobs">채용</Link></div></div></div><div className="partner-area"><p className="eyebrow">함께하는 커뮤니티</p><div className="partner-row">{partners.map((partner) => <Link href={partner.href} key={partner.name} title={partner.name}><img src={partner.logoUrl} alt={partner.name} /></Link>)}</div></div><div className="footer-bottom"><span>© 2026 Featable</span><span>Every founder deserves to be featured.</span></div></div></footer>;
}

export function SectionHeader({ eyebrow, title, href = "#" }: { eyebrow?: string; title: string; href?: string }) {
  return <div className="section-header"> <div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h2>{title}</h2></div><Link href={href}>전체보기 <span>→</span></Link></div>;
}

export function Badge({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "orange" | "dark" }) { return <span className={`badge badge-${tone}`}>{children}</span>; }

export function ImageCard({ src, alt, className = "" }: { src: string; alt: string; className?: string }) { return <div className={`image-card ${className}`}><img src={src} alt={alt} /></div>; }
