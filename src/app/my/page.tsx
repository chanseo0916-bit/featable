import Link from "next/link";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { signout } from "@/app/login/actions";
import { DeleteBrandButton } from "./delete-button";

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
    .select("id, name, headline")
    .eq("user_id", user.id)
    .maybeSingle();

  let brands: MyBrand[] = [];
  if (founder) {
    const { data } = await supabase
      .from("brands")
      .select("id, slug, name, tagline, category, status")
      .eq("founder_id", founder.id)
      .order("created_at", { ascending: false });
    brands = (data ?? []) as MyBrand[];
  }

  return (
    <main className="mx-auto max-w-2xl bg-white px-6 py-14">
      <div className="mb-10 flex items-end justify-between">
        <div>
          <p className="mb-1 text-[11px] font-extrabold tracking-[0.13em] text-accent">
            MY FEATABLE
          </p>
          <h1 className="text-2xl font-bold tracking-tight">
            {founder ? `${founder.name}님의 브랜드` : "마이 페이지"}
          </h1>
          {founder?.headline && (
            <p className="mt-1 text-sm text-muted">{founder.headline}</p>
          )}
        </div>
        <form action={signout}>
          <button className="text-xs font-semibold text-muted hover:text-accent">
            로그아웃
          </button>
        </form>
      </div>

      {brands.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border py-16 text-center">
          <p className="mb-4 text-sm text-muted">아직 등록한 브랜드가 없습니다.</p>
          <Link
            href="/submit"
            className="inline-block rounded-lg bg-accent px-6 py-3 text-sm font-bold text-white hover:bg-accent-hover"
          >
            + 브랜드 등록하기
          </Link>
        </div>
      ) : (
        <div className="grid gap-3">
          {brands.map((b) => (
            <div
              key={b.slug}
              className="flex items-center justify-between rounded-xl border border-border p-5 transition-colors hover:border-accent"
            >
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-bold">{b.name}</h2>
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                      b.status === "published"
                        ? "bg-accent-soft text-accent"
                        : "bg-gray-100 text-muted"
                    }`}
                  >
                    {b.status === "published" ? "공개됨" : "비공개"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted">{b.tagline}</p>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  href={`/my/edit/${b.slug}`}
                  className="text-xs font-semibold text-muted hover:text-accent"
                >
                  수정
                </Link>
                <DeleteBrandButton brandId={b.id} brandName={b.name} />
                <Link
                  href={`/brands/${b.slug}`}
                  className="text-xs font-semibold text-accent hover:underline"
                >
                  페이지 보기 →
                </Link>
              </div>
            </div>
          ))}
          <Link
            href="/submit"
            className="mt-2 rounded-xl border border-dashed border-border py-4 text-center text-sm font-semibold text-muted hover:border-accent hover:text-accent"
          >
            + 새 브랜드 등록
          </Link>
        </div>
      )}
    </main>
  );
}
