import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StudioBrand } from "@/components/site-shell";
import { ProductRegistrationForm } from "../product-form";
import { loadProductDraft } from "../actions";

export const metadata: Metadata = { title: "프로덕트 등록 · FEATABLE" };

export default async function ProductSubmitPage({ searchParams }: { searchParams: Promise<{ brand?: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/submit/product");
  const { data: founder } = await supabase.from("founders").select("id").eq("user_id", user.id).maybeSingle();
  if (!founder) redirect("/submit");
  const { data } = await supabase.from("brands").select("id,name").eq("founder_id", founder.id).order("created_at", { ascending: true });
  const brands = data ?? [];
  if (!brands.length) redirect("/submit");
  const { brand } = await searchParams;
  const initialBrandId = brands.some((item) => item.id === brand) ? brand : brands[0].id;
  const saved = await loadProductDraft(`new:${initialBrandId}`);

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><Link href="/submit">기업 정보</Link><span className="active">프로덕트 등록</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page product-registration-page"><div className="shell"><ProductRegistrationForm brands={brands} initialBrandId={initialBrandId} initial={saved?.draft} draftKey={`new:${initialBrandId}`} initialSavedAt={saved?.savedAt} /></div></main>
  </>;
}
