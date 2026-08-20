import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { StudioBrand } from "@/components/site-shell";
import { createClient } from "@/lib/supabase/server";
import { BrandRegistrationForm } from "./brand-form";

export const metadata: Metadata = {
  title: "기업 정보 등록 · FEATABLE",
  description: "내 기업과 브랜드의 기본 정보를 간편하게 등록하세요.",
};

// Cloudflare(OpenNext)가 Node 미들웨어를 미지원이라 페이지에서 직접 로그인 보호
export default async function SubmitPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/submit");

  return <>
    <div className="publish-console-nav simple-register-nav"><div className="shell"><StudioBrand /><nav><span className="active">기업 정보 등록</span></nav><Link href="/my">나가기</Link></div></div>
    <main className="simple-registration-page"><div className="shell"><div className="simple-registration-context"><span>1 / 1</span><p>기업 정보는 한 번만 등록하면 됩니다.<br />프로덕트는 이후 자유롭게 추가할 수 있어요.</p></div><BrandRegistrationForm /></div></main>
  </>;
}
