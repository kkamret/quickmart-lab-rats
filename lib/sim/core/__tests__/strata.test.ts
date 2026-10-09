import { describe, expect, it } from "vitest";
import { combineStrata, compareDiff } from "../stats";

describe("combineStrata (역분산 가중 층화 합산)", () => {
  it("층이 하나면 그대로 돌려준다", () => {
    const one = compareDiff(0.5, 0.49, 0.01);
    expect(combineStrata([one])).toBe(one);
  });

  it("같은 효과·같은 SE 의 두 층: 효과는 같고 SE 는 1/√2 로 줄어든다", () => {
    const a = compareDiff(0.5, 0.49, 0.01);
    const out = combineStrata([a, a]);
    expect(out.vA).toBeCloseTo(0.5, 10);
    expect(out.d).toBeCloseTo(-0.01, 10);
    expect(out.se).toBeCloseTo(0.01 / Math.sqrt(2), 10);
    expect(out.ci[1] - out.ci[0]).toBeLessThan(a.ci[1] - a.ci[0]);
  });

  it("SE 가 작은 층에 더 큰 가중을 준다", () => {
    const noisy = compareDiff(0.5, 0.4, 0.05); // d=-0.10, 큰 SE
    const sharp = compareDiff(0.5, 0.49, 0.005); // d=-0.01, 작은 SE
    const out = combineStrata([noisy, sharp]);
    // 가중: 1/0.05² = 400, 1/0.005² = 40000 → 합친 d 는 sharp 쪽에 훨씬 가깝다
    expect(out.d).toBeGreaterThan(-0.011);
    expect(out.d).toBeLessThan(-0.01);
    expect(out.se).toBeLessThan(0.005);
  });

  it("층마다 대조군 값이 다르면 가중 평균을 vA 로 둔다", () => {
    const out = combineStrata([compareDiff(0.4, 0.38, 0.01), compareDiff(0.6, 0.58, 0.01)]);
    expect(out.vA).toBeCloseTo(0.5, 10);
    expect(out.vB).toBeCloseTo(0.48, 10);
  });

  it("층이 없으면 던진다", () => {
    expect(() => combineStrata([])).toThrow();
  });
});
