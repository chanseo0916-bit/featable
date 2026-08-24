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
  const [{ data: ownedBrands }, { data: editorMemberships }] = await Promise.all([
    founder
      ? supabase.from("brands").select("id,name").eq("founder_id", founder.id)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from("brand_members").select("brand_id").eq("user_id", user.id).eq("member_role", "editor"),
  ]);
  const editorBrandIds = (editorMemberships ?? []).map((membership) => membership.brand_id);
  const { data: memberBrands } = editorBrandIds.length
    ? await supabase.from("brands").select("id,name").in("id", editorBrandIds)
    : { data: [] as { id: string; name: string }[] };
  const brands = [...(ownedBrands ?? []), ...(memberBrands ?? [])]
    .filter((brand, index, all) => all.findIndex((candidate) => candidate.id === brand.id) === index)
    .sort((a, b) => a.name.localeCompare(b.name));
  if (!brands.length) redirect("/my/brand/new");
  const { brand } = await searchParams;
  const initialBrandId = brands.some((item) => item.id === brand) ? brand : brands[0].id;
  const saved = await loadProductDraft(`new:${initialBrandId}`);

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><Link href="/my/brand/new">기업 정보</Link><span className="active">프로덕트 등록</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page product-registration-page"><div className="shell"><ProductRegistrationForm brands={brands} initialBrandId={initialBrandId} initial={saved?.draft} draftKey={`new:${initialBrandId}`} initialSavedAt={saved?.savedAt} /></div></main>
  </>;
}
