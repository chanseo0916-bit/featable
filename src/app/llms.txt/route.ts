import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

const link = (path: string) => `${SITE_URL}${path}`;

const content = `# Featable 피터블

> Featable(피터블)은 창업가, 브랜드, 제품, 스토리와 창업 기회를 연결하는 공개 발견 플랫폼입니다.

## 공개 서비스

- [홈](${link("/")}): Featable의 공개 콘텐츠를 탐색합니다.
- [프로덕트](${link("/products")}): 만든 사람의 이야기가 있는 제품을 발견합니다.
- [브랜드](${link("/brands")}): 제품을 만드는 브랜드와 팀을 살펴봅니다.
- [스토리](${link("/stories")}): 창업가와 브랜드의 인터뷰, 사례와 제품 이야기를 읽습니다.
- [이벤트](${link("/events")}): 창업가와 빌더를 위한 공개 이벤트를 확인합니다.
- [지원사업](${link("/support")}): 창업 지원 프로그램을 찾아봅니다.
- [커뮤니티](${link("/communities")}): 창업가와 메이커 커뮤니티를 탐색합니다.
- [파트너](${link("/partners")}): Featable과 함께하는 파트너를 확인합니다.

## 전체 공개 콘텐츠

- [전체 콘텐츠 목록](${link("/llms-full.txt")}): 현재 공개된 브랜드, 제품, 창업가, 스토리, 이벤트, 지원사업, 커뮤니티와 채용 페이지의 상세 목록입니다.

## 이용 안내

Featable의 상세 페이지는 각 목록의 공개 URL에서 확인할 수 있습니다. 제품 구매나 이벤트·지원사업 신청과 같은 조건은 각 상세 페이지의 공식 안내를 기준으로 확인하세요.
`;

export async function GET() {
  return new Response(content, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}
