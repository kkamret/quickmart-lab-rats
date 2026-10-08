import { describe, expect, it } from "vitest";
import { BUSINESS_MDE_PP, mdeOf } from "../mde";
import { METRIC_KEYS } from "../schema";
import { formMeta } from "../formMeta";
import { validateDesign } from "../index";

const hyp = { action: "가게홈에서 안내해요", behavior: "바로 주문해요", impact: "장바구니 이탈률이 줄어요" };
const p1 = (over: Record<string, unknown> = {}) => ({
  phase: "p1", hypothesis: hyp, scope: { os: "android", surface: "store_home" }, unit: "user",
  metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov"] },
  alpha: 0.05, power: 0.8, duration_days: 14, allocation: 1, ramp: "none", analysis_mode: "pooled",
  stopping: "fixed", count_basis: "assignment", ...over,
});

describe("비즈니스 협의 MDE", () => {
  it("모든 지표에 양수 MDE 가 있다", () => {
    for (const k of METRIC_KEYS) {
      expect(BUSINESS_MDE_PP[k], k).toBeGreaterThan(0);
      expect(mdeOf(k)).toBe(BUSINESS_MDE_PP[k]);
    }
    expect(Object.keys(BUSINESS_MDE_PP).sort()).toEqual([...METRIC_KEYS].sort());
  });

  it("예전 설계에 mde_pp 가 남아 있어도 검증을 통과하고 키는 버려진다", () => {
    const v = validateDesign(p1({ mde_pp: 9 })) as unknown as Record<string, unknown>;
    expect(v).toBeTruthy();
    expect(JSON.stringify(v)).not.toContain("mde_pp");
  });

  it("Primary 지표 도움말에 협의 MDE 가 표시된다", () => {
    const f = formMeta.p1.find((x) => x.name === "metrics.primary")!;
    expect(f.help).toContain("교육용 가상 값");
    expect(f.help).toContain("장바구니 이탈률 1.5%p");
    expect(f.help).toContain("평균주문금액 3%");
    expect(formMeta.p1.some((x) => x.name === "mde_pp")).toBe(false);
  });
});
