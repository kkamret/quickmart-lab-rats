import { describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
import { resolveLLMConfig } from "../llm";

describe("resolveLLMConfig", () => {
  it("키가 없으면 null(mock)", () => {
    expect(resolveLLMConfig({})).toBeNull();
  });
  it("AIza 키는 Gemini 호환 주소·모델, Upstage 전용 파라미터 없음", () => {
    const c = resolveLLMConfig({ UPSTAGE_API_KEY: "AIzaXXXX" })!;
    expect(c.baseURL).toContain("generativelanguage.googleapis.com");
    expect(c.model).toBe("gemini-2.5-flash");
    expect(c.upstage).toBe(false);
  });
  it("AQ. 로 시작하는 키도 Gemini", () => {
    expect(resolveLLMConfig({ UPSTAGE_API_KEY: "AQ.Ab8x" })!.model).toBe("gemini-2.5-flash");
  });
  it("그 외 키는 Solar", () => {
    const c = resolveLLMConfig({ UPSTAGE_API_KEY: "up_x" })!;
    expect(c.model).toBe("solar-pro4");
    expect(c.upstage).toBe(true);
  });
  it("환경 변수로 덮어쓰기", () => {
    const c = resolveLLMConfig({ LLM_API_KEY: "AIzaX", LLM_MODEL: "gemini-2.5-pro" })!;
    expect(c.model).toBe("gemini-2.5-pro");
  });
});
