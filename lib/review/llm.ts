import "server-only";
import OpenAI from "openai";

/** LLM 호출 경계. 모델이 JSON 문자열을 돌려준다고만 가정하고, 파싱·검증은 호출하는 쪽(generate.ts)이 한다. */
export interface ReviewLLM {
  readonly model: string;
  /** truncated=true 면 max_tokens 에 걸려 잘렸다는 뜻 */
  complete(args: { system: string; user: string; maxTokens: number }): Promise<{ text: string; truncated: boolean }>;
}

export const SOLAR_MODEL = "solar-pro4";
export const GEMINI_MODEL = "gemini-2.5-flash";
const SOLAR_URL = "https://api.upstage.ai/v1";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/";

export type LLMConfig = { apiKey: string; baseURL: string; model: string; upstage: boolean };

/** 키 하나로 공급자를 고른다. AIza 로 시작하면 Gemini(OpenAI 호환 주소), 아니면 Upstage Solar. LLM_BASE_URL·LLM_MODEL 로 덮어쓸 수 있다. */
export function resolveLLMConfig(env: Record<string, string | undefined>): LLMConfig | null {
  const apiKey = env.LLM_API_KEY || env.UPSTAGE_API_KEY;
  if (!apiKey) return null;
  const gemini = apiKey.startsWith("AIza");
  const baseURL = env.LLM_BASE_URL || (gemini ? GEMINI_URL : SOLAR_URL);
  return {
    apiKey,
    baseURL,
    model: env.LLM_MODEL || (gemini ? GEMINI_MODEL : SOLAR_MODEL),
    upstage: baseURL.includes("upstage.ai"),
  };
}

export function openAICompatLLM(cfg: LLMConfig): ReviewLLM {
  const client = new OpenAI({ apiKey: cfg.apiKey, baseURL: cfg.baseURL, timeout: 60_000, maxRetries: 1 });
  return {
    model: cfg.model,
    async complete({ system, user, maxTokens }) {
      const res = await client.chat.completions.create({
        model: cfg.model,
        temperature: 0.3,
        max_tokens: maxTokens,
        response_format: { type: "json_object" },
        // 추론 토큰이 max_tokens 를 잠식하지 않도록 낮게 (Upstage 확장 파라미터, 다른 공급자에는 보내지 않는다)
        ...(cfg.upstage ? ({ reasoning_effort: "low" } as object) : {}),
        messages: [{ role: "system", content: system }, { role: "user", content: user }],
      });
      const choice = res.choices[0];
      return { text: choice?.message?.content ?? "", truncated: choice?.finish_reason === "length" };
    },
  };
}

/** 키가 없을 때 쓰는 가짜 LLM. 호출하는 쪽이 넘긴 produce() 결과를 JSON 으로 돌려준다. */
export function mockLLM(produce: () => unknown): ReviewLLM {
  return {
    model: "mock",
    async complete() {
      return { text: JSON.stringify(produce()), truncated: false };
    },
  };
}

/** 키(LLM_API_KEY 또는 UPSTAGE_API_KEY)가 있으면 실제 모델, 없으면 mock. 키는 서버에서만 읽는다(규칙 5). */
export function getLLM(mockOutput: () => unknown): ReviewLLM {
  const cfg = resolveLLMConfig(process.env);
  return cfg ? openAICompatLLM(cfg) : mockLLM(mockOutput);
}
