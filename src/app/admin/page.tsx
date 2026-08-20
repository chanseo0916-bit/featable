import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminPageHeader } from "./admin-ui";

const sections = [
  { key: "brands", label: "브랜드", href: "/admin/brands", description: "등록 정보와 공개 상태 관리" },
  { key: "products", label: "프로덕트", href: "/admin/products", description: "제품·서비스와 피쳐 관리" },
  { key: "features", label: "스토리", href: "/admin/stories", description: "인터뷰·브랜드 스토리 발행" },
  { key: "events", label: "행사", href: "/admin/events", description: "행사 등록과 노출 관리" },
  { key: "support_programs", label: "지원사업", href: "/admin/support", description: "지원사업 공고 관리" },
  { key: "partners", label: "파트너", href: "/admin/partners", description: "파트너 정보와 공개 상태 관리" },
] as const;

export default async function AdminDashboardPage() {
  const supabase = await createClient();
  const [brands, products, features, events, support, partners] = await Promise.all([
    supabase.from("brands").select("id", { count: "exact", head: true }),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase.from("features").select("id", { count: "exact", head: true }),
    supabase.from("events").select("id", { count: "exact", head: true }),
    supabase.from("support_programs").select("id", { count: "exact", head: true }),
    supabase.from("partners").select("id", { count: "exact", head: true }),
  ]);
  const counts = [brands.count, products.count, features.count, events.count, support.count, partners.count];

  return (
    <main className="admin-main shell">
      <AdminPageHeader eyebrow="OVERVIEW" title="관리자 대시보드" description="Featable에 공개되는 모든 콘텐츠와 운영 상태를 한눈에 확인하세요." />
      <section className="admin-metric-grid" aria-label="콘텐츠 현황">
        {sections.map((section, index) => (
          <Link className="admin-metric-card" href={section.href} key={section.key}>
            <span>{section.label}</span><strong>{counts[index] ?? 0}<em>개</em></strong>
            <p>{section.description}</p><i aria-hidden="true">→</i>
          </Link>
        ))}
      </section>
      <section className="admin-dashboard-row">
        <div className="admin-dashboard-panel admin-dashboard-guide">
          <p className="admin-panel-label">QUICK START</p><h2>어떤 작업을 할까요?</h2>
          <div className="admin-quick-links">
            <Link href="/admin/brands"><span>01</span><strong>브랜드 검수하기</strong><i>→</i></Link>
            <Link href="/admin/products"><span>02</span><strong>프로덕트 공개하기</strong><i>→</i></Link>
            <Link href="/admin/events"><span>03</span><strong>새 행사 등록하기</strong><i>→</i></Link>
          </div>
        </div>
        <div className="admin-dashboard-panel admin-dashboard-note">
          <p className="admin-panel-label">ADMIN ONLY</p><h2>운영 원칙</h2>
          <p>대시보드는 현황 확인에 집중하고, 등록·검수·공개 작업은 각 관리 페이지에서 독립적으로 진행합니다.</p>
          <Link href="/">현재 공개 사이트 확인 ↗</Link>
        </div>
      </section>
    </main>
  );
}
