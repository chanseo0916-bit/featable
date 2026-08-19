import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/login/actions";
import { DeleteBrandButton } from "./delete-button";
import { BrandStatusButton } from "./brand-status-button";
import { ProfileEditor } from "./profile-editor";

export const metadata: Metadata = { title: "워크스페이스 · FEATABLE" };

interface MyBrand {
  id: string;
  slug: string;
  name: string;
  logo_url: string | null;
  tagline: string;
  category: string;
  status: "draft" | "published" | "hidden";
  updated_at: string;
}

interface MyProduct { id: string; brand_id: string; name: string; view_count: number; status: string; }
interface SavedDraft { payload: Record<string, unknown>; current_step: number; updated_at: string; }

export default async function MyPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: founder } = await supabase.from("founders").select("id,slug,name,headline,bio,avatar_url,sns").eq("user_id", user.id).maybeSingle();
  const sns = (founder?.sns ?? {}) as { instagram?: string; x?: string; linkedin?: string; website?: string };

  let brands: MyBrand[] = [];
  let products: MyProduct[] = [];
  if (founder) {
    const { data: brandRows } = await supabase.from("brands").select("id,slug,name,logo_url,tagline,category,status,updated_at").eq("founder_id", founder.id).order("updated_at", { ascending: false });
    brands = (brandRows ?? []) as MyBrand[];
    if (brands.length) {
      const { data: productRows } = await supabase.from("products").select("id,brand_id,name,view_count,status").in("brand_id", brands.map((brand) => brand.id));
      products = (productRows ?? []) as MyProduct[];
    }
  }

  const { data: draftRow } = await supabase.from("submission_drafts").select("payload,current_step,updated_at").eq("user_id", user.id).maybeSingle();
  const savedDraft = draftRow as SavedDraft | null;
  const draftName = typeof savedDraft?.payload?.brandName === "string" ? savedDraft.payload.brandName : "새 브랜드";
  const draftFields = savedDraft ? ["brandName", "tagline", "founderName", "founderHeadline", "description", "productName", "productTagline", "logoUrl", "heroUrl"] : [];
  const draftCompletion = savedDraft ? Math.round((draftFields.filter((key) => typeof savedDraft.payload[key] === "string" && String(savedDraft.payload[key]).trim()).length / draftFields.length) * 100) : 0;
  const publishedCount = brands.filter((brand) => brand.status === "published").length;
  const totalViews = products.reduce((sum, product) => sum + (product.view_count ?? 0), 0);

  return <>
    <div className="publish-console-nav"><div className="shell"><strong><i>F</i> FEATABLE STUDIO</strong><nav><Link className="active" href="/my">대시보드</Link><a href="#brands">브랜드 관리</a><a href="#profile">Founder 프로필</a><Link href="/submit">새 프로젝트</Link></nav><form action={signout}><button>로그아웃</button></form></div></div>
    <div className="publish-console-tabs"><div className="shell"><Link className="active" href="/my">워크스페이스 홈</Link><a href="#brands">콘텐츠</a><a href="#profile">프로필 설정</a>{founder?.slug && <Link href={`/founders/${founder.slug}`}>공개 페이지 바로가기 ↗</Link>}</div></div>

    <main className="studio-dashboard">
      <div className="shell studio-dashboard-inner">
        <header className="studio-owner-head">
          <div className="studio-owner-avatar">{founder?.avatar_url ? <img src={founder.avatar_url} alt="" /> : <span>{(founder?.name || "F").slice(0, 1)}</span>}</div>
          <div><p>FOUNDER WORKSPACE</p><h1>{founder?.name ?? "Founder"}님의 스튜디오</h1><span>{founder?.headline || "브랜드와 프로덕트를 한 곳에서 관리하세요."}</span></div>
          <Link href="/submit">새 프로젝트 만들기 <b>＋</b></Link>
        </header>

        <section className="studio-overview-panel">
          <div className="studio-panel-heading"><strong>워크스페이스 인사이트</strong><span>현재 등록된 프로젝트를 기준으로 집계됩니다.</span></div>
          <div className="studio-overview-grid">
            <a href="#brands"><span>전체 조회수</span><strong>{totalViews.toLocaleString("ko-KR")}</strong><small>프로덕트 누적</small></a>
            <a href="#brands"><span>공개 중</span><strong>{publishedCount}<em>개</em></strong><small>전체 브랜드 {brands.length}개</small></a>
            <a href="#brands"><span>프로덕트</span><strong>{products.length}<em>개</em></strong><small>등록된 제품과 서비스</small></a>
            <Link href="/submit"><span>작성 중 초안</span><strong>{savedDraft ? 1 : 0}<em>개</em></strong><small>{savedDraft ? `${draftCompletion}% 작성됨` : "새 초안 만들기"}</small></Link>
          </div>
        </section>

        {savedDraft && <section className="studio-draft-banner">
          <div><span>작성 중</span><strong>{draftName}</strong><p>STEP {savedDraft.current_step + 1}에서 멈췄어요 · {draftCompletion}% 완료</p></div>
          <div className="studio-draft-progress"><i style={{ width: `${draftCompletion}%` }} /></div>
          <time>{new Date(savedDraft.updated_at).toLocaleString("ko-KR", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} 저장</time>
          <Link href="/submit">이어서 작성 →</Link>
        </section>}

        <section id="brands" className="studio-content-panel">
          <div className="studio-panel-heading"><strong>브랜드와 프로덕트</strong><span>{brands.length}개의 브랜드</span><Link href="/submit">＋ 새 브랜드</Link></div>
          {brands.length === 0 ? <div className="studio-empty"><span>＋</span><strong>첫 브랜드를 등록해보세요.</strong><p>기본 정보부터 상세페이지까지 단계별로 만들 수 있습니다.</p><Link href="/submit">등록 시작하기</Link></div> : <div className="studio-brand-table">
            <div className="studio-brand-table-head"><span>브랜드</span><span>프로덕트</span><span>조회수</span><span>공개 상태</span><span>관리</span></div>
            {brands.map((brand) => {
              const brandProducts = products.filter((product) => product.brand_id === brand.id);
              const brandViews = brandProducts.reduce((sum, product) => sum + (product.view_count ?? 0), 0);
              return <div className="studio-brand-row" key={brand.id}>
                <div className="studio-brand-identity">{brand.logo_url ? <img src={brand.logo_url} alt="" /> : <span>{brand.name.slice(0, 1)}</span>}<div><strong>{brand.name}</strong><small>{brand.category} · {brand.tagline}</small></div></div>
                <div><strong>{brandProducts.length}개</strong><small>{brandProducts.map((product) => product.name).join(", ") || "등록 전"}</small></div>
                <div><strong>{brandViews.toLocaleString("ko-KR")}</strong><small>누적 조회</small></div>
                <BrandStatusButton brandId={brand.id} published={brand.status === "published"} />
                <div className="studio-row-actions"><Link href={`/my/edit/${brand.slug}`}>수정</Link><Link href={`/brands/${brand.slug}`}>미리보기</Link><DeleteBrandButton brandId={brand.id} brandName={brand.name} /></div>
              </div>;
            })}
          </div>}
        </section>

        <section id="profile" className="studio-profile-panel"><div className="studio-panel-heading"><strong>Founder 프로필</strong><span>공개 프로필에 표시되는 정보입니다.</span></div><ProfileEditor initial={{ slug: founder?.slug, name: founder?.name ?? "", headline: founder?.headline ?? "", bio: founder?.bio ?? "", avatarUrl: founder?.avatar_url ?? "", instagram: sns.instagram ?? "", x: sns.x ?? "", linkedin: sns.linkedin ?? "", website: sns.website ?? "" }} /></section>
      </div>
    </main>
  </>;
}
