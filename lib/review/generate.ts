import type { ZodType } from "zod";
import type { ReviewLLM } from "./llm";

const BASE_TOKENS = 4096;

/**
 * JSON 만 받아 zod 로 검증한다. 실패하면 1회 재시도하고, 응답이 잘렸으면 max_tokens 를 늘려서 다시 요청한다.
 * 재시도는 총 1번(비용 가드).
 */
export async function generateJson<T>(llm: ReviewLLM, schema: ZodType<T>, args: { system: string; user: string }): Promise<T> {
  let maxTokens = BASE_TOKENS;
  let lastError = "";
  for (let attempt = 0; attempt < 2; attempt++) {
    const { text, truncated } = await llm.complete({ ...args, maxTokens });
    if (truncated) {
      maxTokens = Math.round(maxTokens * 1.6);
      lastError = "응답이 길어서 잘렸어요";
      continue;
    }
    try {
      const parsed = schema.safeParse(JSON.parse(stripFence(text)));
      if (parsed.success) return parsed.data;
      lastError = parsed.error.issues[0]?.message ?? "형식 오류";
    } catch {
      lastError = "JSON 이 아니에요";
    }
  }
  throw new Error(`AI 응답을 해석하지 못했어요: ${lastError}`);
}

/** 모델이 ```json 으로 감싸는 경우를 풀어준다 */
function stripFence(s: string): string {
  const m = s.trim().match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1] : s.trim();
}
