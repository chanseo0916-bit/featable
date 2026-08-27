import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Edge runtime 미들웨어
 *
 * 두 가지 일을 한다:
 *  1) 보호 라우트에 비로그인 사용자가 들어오면 /login으로 보낸다.
 *  2) Supabase SSR 세션을 자동 갱신한다 (access token 만료 시 refresh).
 *     이게 없으면 만료 후 새로고침할 때마다 /login으로 튕기는 문제가 생긴다.
 *
 * Next 16부터는 `proxy.ts`(Node runtime)가 표준이지만, @opennextjs/cloudflare는
 * 아직 proxy.ts를 지원하지 않으므로 Edge runtime의 middleware.ts를 사용한다.
 * OpenNext 측 PR(#1308)이 머지되면 codemod로 옮길 수 있다:
 *   npx @next/codemod@canary middleware-to-proxy .
 */
export async function middleware(request: NextRequest) {
  // ⚠️ createServerClient와 supabase.auth.getUser() 사이에 다른 코드 두지 말 것
  // (Supabase 공식 경고: 세션 동기화가 깨질 수 있음)
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // request 객체에 쿠키 갱신 (다음 요청에 반영되도록)
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          // response 객체에도 쿠키 갱신 (지금 응답에 Set-Cookie 헤더 실어 보내도록)
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 보호 라우트 가드. prefix만 보고 빠르게 거른 뒤, 세부 권한(role 등)은 페이지에서.
  const path = request.nextUrl.pathname;
  const protectedPrefixes = [
    "/my",
    "/onboarding",
    "/submit",
    "/invite",
    "/board/write",
    "/board/", // /board/[id]/edit 등
    "/admin",
  ];
  const isProtected = protectedPrefixes.some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );

  if (isProtected && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    loginUrl.searchParams.set("next", path + request.nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  // 정적 파일과 이미지, favicon은 제외 — 매 요청마다 미들웨어 돌면 비용 낭비
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
