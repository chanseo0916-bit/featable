import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * 이미지 업로드를 서버에서 처리한다.
 *
 * 인스타그램 같은 인앱 브라우저는 저장소 접근이 막혀 브라우저 쪽 Supabase 클라이언트가
 * 로그인 세션을 읽지 못한다(업로드가 RLS 위반으로 거절됨). 서버는 쿠키로 인증하므로
 * 같은 상황에서도 정상 동작한다.
 */
const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다. 다시 로그인해주세요." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "파일을 읽지 못했습니다." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return NextResponse.json({ error: "사진을 선택해주세요." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "사진 용량이 너무 커요. 15MB 이하로 올려주세요." }, { status: 413 });
  }

  const kindValue = form.get("kind");
  const kind = typeof kindValue === "string" && /^[a-z-]{1,20}$/.test(kindValue) ? kindValue : "image";
  const rawExt = file.name.split(".").pop()?.toLowerCase() ?? "";
  const ext = /^[a-z0-9]{2,5}$/.test(rawExt) ? rawExt : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}-${kind}.${ext}`;

  const { error } = await supabase.storage
    .from("images")
    .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const url = supabase.storage.from("images").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ url });
}
