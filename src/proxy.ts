import { NextResponse, type NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const forwardedProtocol = request.headers.get("x-forwarded-proto");
  const isSecure = forwardedProtocol === "https" || request.nextUrl.protocol === "https:";
  if (isSecure) return NextResponse.next();

  const secureUrl = request.nextUrl.clone();
  secureUrl.protocol = "https:";
  return NextResponse.redirect(secureUrl, 308);
}
