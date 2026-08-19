import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/login/actions";
import { Header } from "@/components/site-shell";
import { DeleteBrandButton } from "./delete-button";
import { ProfileEditor } from "./profile-editor";

export const metadata: Metadata = {
  title: "마이 페이지 — FEATABLE",
};

interface MyBrand {
  id: string;
  slug: string;
  name: string;
  tagline: string;
  category: string;
  status: "draft" | "published" | "hidden";
}

export default async function MyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 미들웨어가 막지만 방어적으로 한 번 더
  if (!user) return null;

  const { data: founder } = await supabase
    .from("founders")
    .select("id, slug, name, headline, bio, avatar_url, sns")
    .eq("user_id", user.id)
    .maybeSingle();

  const sns = (founder?.sns ?? {}) as {
    instagram?: string;
    x?: string;
    linkedin?: string;
    website?: string;
  };

  let brands: MyBrand[] = [];
  if (founder) {
    const { data } = await supabase
      .from("brands")
      .select("id, slug, name, tagline, category, status")
      .eq("founder_id", founder.id)
      .order("created_at", { ascending: false });
    brands = (data ?? []) as MyBrand[];
  }

  const publishedCount = brands.filter((b) => b.status === "published").length;

  return (
    <>
      <Header />
      <main className="shell my-dash">
        <div className="my-dash-heading">
          <div>
            <p className="eyebrow">MY FEATABLE</p>
            <h1>{founder ? `${founder.name}님의 대시보드` : "마이 페이지"}</h1>
            <p>브랜드 등록 현황과 파운더 프로필을 한 곳에서 관리하세요.</p>
          </div>
          <Link className="my-dash-cta" href="/submit">
            + 브랜드 등록
          </Link>
        </div>

        <div className="my-dash-grid">
          <aside className="my-dash-side">
            <div className="my-dash-user">
              {founder?.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={founder.avatar_url} alt="" />
              ) : (
                <div className="my-dash-avatar-fallback">
                  {(founder?.name || "F").slice(0, 1)}
                </div>
              )}
              <strong>{founder?.name ?? "파운더"}</strong>
              <span>{founder?.headline || "한 줄 소개를 등록해보세요"}</span>
              {founder?.slug && (
                <Link href={`/founders/${founder.slug}`}>공개 프로필 보기 →</Link>
              )}
            </div>
            <nav className="my-dash-menu">
              <a href="#brands">브랜드 관리</a>
              <a href="#profile">프로필 설정</a>
              <Link href="/submit">새 브랜드 등록</Link>
              <form action={signout}>
                <button>로그아웃</button>
              </form>
            </nav>
          </aside>

          <div className="my-dash-main">
            <div className="my-dash-stats">
              <div className="my-dash-stat">
                <span>전체 브랜드</span>
                <strong>
                  {brands.length}
                  <em>개</em>
                </strong>
              </div>
              <div className="my-dash-stat">
                <span>공개 중</span>
                <strong>
                  {publishedCount}
                  <em>개</em>
                </strong>
              </div>
              <div className="my-dash-stat">
                <span>비공개 · 초안</span>
                <strong>
                  {brands.length - publishedCount}
                  <em>개</em>
                </strong>
              </div>
            </div>

            <section id="brands" className="my-dash-panel">
              <div className="my-dash-panel-head">
                <h2>브랜드 관리</h2>
                <Link href="/submit">+ 새 브랜드</Link>
              </div>
              {brands.length === 0 ? (
                <div className="my-dash-empty">
                  <p>아직 등록한 브랜드가 없습니다.</p>
                  <Link href="/submit">+ 브랜드 등록하기</Link>
                </div>
              ) : (
                <>
                  <div className="my-brand-table-head my-brand-cols">
                    <span>브랜드</span>
                    <span>카테고리</span>
                    <span>상태</span>
                    <span style={{ textAlign: "right" }}>관리</span>
                  </div>
                  {brands.map((b) => (
                    <div key={b.slug} className="my-brand-row my-brand-cols">
                      <div className="my-brand-cell">
                        <strong>{b.name}</strong>
                        <span>{b.tagline}</span>
                      </div>
                      <span className="my-brand-cat">{b.category}</span>
                      <span
                        className={`my-brand-status ${
                          b.status === "published" ? "on" : "off"
                        }`}
                      >
                        {b.status === "published" ? "공개됨" : "비공개"}
                      </span>
                      <div className="my-brand-actions">
                        <Link href={`/my/edit/${b.slug}`}>수정</Link>
                        <DeleteBrandButton brandId={b.id} brandName={b.name} />
                        <Link className="view" href={`/brands/${b.slug}`}>
                          페이지 보기 →
                        </Link>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </section>

            <div id="profile">
              <ProfileEditor
                initial={{
                  slug: founder?.slug,
                  name: founder?.name ?? "",
                  headline: founder?.headline ?? "",
                  bio: founder?.bio ?? "",
                  avatarUrl: founder?.avatar_url ?? "",
                  instagram: sns.instagram ?? "",
                  x: sns.x ?? "",
                  linkedin: sns.linkedin ?? "",
                  website: sns.website ?? "",
                }}
              />
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
