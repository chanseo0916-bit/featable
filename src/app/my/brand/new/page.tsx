import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioBrand } from "@/components/site-shell";
import { createClient } from "@/lib/supabase/server";
import { BrandRegistrationForm } from "@/app/submit/brand-form";

export const metadata: Metadata = {
  title: "기업 정보 등록 · FEATABLE",
  description: "스튜디오에서 내 기업과 브랜드의 기본 정보를 등록하세요.",
  robots: { index: false, follow: false },
};

export default async function NewBrandPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/my/brand/new");

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><span className="active">기업 정보 등록</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page"><div className="shell"><div className="simple-registration-context"><span>STUDIO</span><p>필요한 경우 스튜디오에서 브랜드를 등록할 수 있습니다.<br />프로덕트는 등록 후 자유롭게 추가하세요.</p></div><BrandRegistrationForm /></div></main>
  </>;
}
