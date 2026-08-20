import { redirect } from "next/navigation";

/** 이전 통합 편집 주소를 새 기업 정보 편집 화면으로 연결한다. */
export default async function LegacyEditPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/my/company/${slug}`);
}
