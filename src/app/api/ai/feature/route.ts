import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@/lib/supabase/server";

interface AiRequest {
  brandName: string;
  productName: string;
  category: string;
  answers: {
    what: string; // 무엇을 만들고 있나요?
    why: string; // 왜 시작했나요?
    who: string; // 누구를 위한 제품인가요?
    diff: string; // 기존 방식과 무엇이 다른가요?
    say: string; // 지금 가장 알리고 싶은 것은?
  };
}

export async function POST(request: Request) {
  // 로그인한 사용자만 사용 가능
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "AI 기능이 아직 준비 중입니다. 문구를 직접 입력해주세요." },
      { status: 503 },
    );
  }

  const body = (await request.json()) as AiRequest;
  const answered = Object.values(body.answers ?? {}).filter((v) => v?.trim());
  if (answered.length === 0) {
    return NextResponse.json(
      { error: "질문에 하나 이상 답해주세요." },
      { status: 400 },
    );
  }

  const client = new Anthropic();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      system: [
        "당신은 초기 스타트업 브랜드의 소개 문구를 쓰는 한국어 카피라이터다.",
        "과장된 홍보 문구나 상투적인 표현(혁신적인, 최고의 등)을 피하고, 구체적이고 담백하게 쓴다.",
        "창업가(Founder)라는 사람이 드러나는 톤을 유지한다.",
        "반드시 아래 JSON 형식으로만 응답한다. JSON 외 다른 텍스트를 출력하지 않는다.",
        '{"tagline": "브랜드 한 줄 소개 (40자 이내)", "productTagline": "제품 한 줄 소개 (40자 이내)", "founderHeadline": "창업가 한 줄 소개 (30자 이내)", "description": "브랜드 소개 문단 (3~5문장, 문제-해결-차별점 순서)"}',
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: [
            `브랜드명: ${body.brandName || "(미정)"}`,
            `제품명: ${body.productName || "(미정)"}`,
            `카테고리: ${body.category || "기타"}`,
            "",
            "창업가의 답변:",
            `- 무엇을 만들고 있나요?: ${body.answers.what || "(무응답)"}`,
            `- 왜 시작했나요?: ${body.answers.why || "(무응답)"}`,
            `- 누구를 위한 제품인가요?: ${body.answers.who || "(무응답)"}`,
            `- 기존 방식과 무엇이 다른가요?: ${body.answers.diff || "(무응답)"}`,
            `- 지금 가장 알리고 싶은 것은?: ${body.answers.say || "(무응답)"}`,
          ].join("\n"),
        },
      ],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");

    // 코드펜스 등 여분 텍스트 방어
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: "AI 응답 처리에 실패했습니다. 다시 시도해주세요." },
        { status: 502 },
      );
    }

    const parsed = JSON.parse(jsonMatch[0]) as {
      tagline?: string;
      productTagline?: string;
      founderHeadline?: string;
      description?: string;
    };

    return NextResponse.json(parsed);
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) {
      return NextResponse.json(
        { error: "요청이 많습니다. 잠시 후 다시 시도해주세요." },
        { status: 429 },
      );
    }
    return NextResponse.json(
      { error: "AI 생성 중 오류가 발생했습니다." },
      { status: 502 },
    );
  }
}
