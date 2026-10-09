import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { ENGINE_VERSION, canonicalJSON, crnStream, crnZ, designHash, type NoiseKey } from "../crn";
import { binomialCount, groupMean, heavyTailGroup, poisson, sampleGroupMoments, sampleSd } from "../noise";
import { hashSeed, mulberry32 } from "../rng";

const SEED = 20241001;
const key: NoiseKey = { case: "baemin", phase: "p1", period: 3, segment: "android", arm: "A", metric: "abandon" };

describe("rng", () => {
  it("mulberry32 는 같은 시드에서 같은 수열, [0,1) 범위", () => {
    const a = mulberry32(7);
    const b = mulberry32(7);
    for (let i = 0; i < 100; i++) {
      const x = a();
      expect(x).toBe(b());
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });
  it("hashSeed 는 입력이 다르면 다르고 uint32", () => {
    expect(hashSeed("a", 1)).not.toBe(hashSeed("a", 2));
    expect(hashSeed("a", 1)).toBe(hashSeed("a", 1));
    expect(hashSeed("x")).toBeGreaterThanOrEqual(0);
    expect(hashSeed("x")).toBeLessThan(2 ** 32);
  });
});

describe("공통 난수(CRN)", () => {
  it("같은 키는 같은 z", () => {
    expect(crnZ(SEED, key)).toBe(crnZ(SEED, { ...key }));
  });
  it("키의 어느 한 조각만 달라도 다른 스트림", () => {
    const z = crnZ(SEED, key);
    for (const patch of [{ period: 4 }, { segment: "ios_new" }, { arm: "B" }, { metric: "conv" }, { phase: "p2" }, { case: "toss" }]) {
      expect(crnZ(SEED, { ...key, ...patch })).not.toBe(z);
    }
    expect(crnZ(SEED + 1, key)).not.toBe(z);
  });
  it("설계 필드는 키에 없으므로 설계가 달라도 대조군 스트림은 동일", () => {
    // 같은 날짜·세그먼트·대조군 → 기간이 다른 두 설계가 겹치는 날의 노이즈를 공유
    const day3_designA = crnStream(SEED, { ...key, period: 3 });
    const day3_designB = crnStream(SEED, { ...key, period: 3 });
    expect([day3_designA(), day3_designA(), day3_designA()]).toEqual([day3_designB(), day3_designB(), day3_designB()]);
  });
  it("표준정규에 가깝다 (평균 0, SD 1)", () => {
    const N = 20000;
    let s = 0, ss = 0;
    for (let i = 0; i < N; i++) {
      const z = crnZ(SEED, { ...key, period: i });
      s += z; ss += z * z;
    }
    expect(Math.abs(s / N)).toBeLessThan(0.03);
    expect(Math.abs(Math.sqrt(ss / N) - 1)).toBeLessThan(0.03);
  });
});

describe("designHash / canonicalJSON", () => {
  it("키 순서가 달라도 같은 해시", () => {
    const d1 = { a: 1, b: { x: [1, 2], y: "z" } };
    const d2 = { b: { y: "z", x: [1, 2] }, a: 1 };
    expect(canonicalJSON(d1)).toBe(canonicalJSON(d2));
    expect(designHash("baemin", "p1", d1)).toBe(designHash("baemin", "p1", d2));
  });
  it("값, 사례, phase 가 다르면 다른 해시. undefined 필드는 무시", () => {
    const h = designHash("baemin", "p1", { a: 1 });
    expect(designHash("baemin", "p1", { a: 2 })).not.toBe(h);
    expect(designHash("toss", "p1", { a: 1 })).not.toBe(h);
    expect(designHash("baemin", "p2", { a: 1 })).not.toBe(h);
    expect(designHash("baemin", "p1", { a: 1, b: undefined })).toBe(h);
    expect(h).toMatch(/^[0-9a-f]{64}$/);
  });
  it("엔진 버전이 캐시 키에 들어간다(옛 버전 행과 겹치지 않는다). 난수 시드는 버전과 무관하다", () => {
    const legacy = createHash("sha256").update(`baemin|p1|${canonicalJSON({ a: 1 })}`).digest("hex");
    expect(designHash("baemin", "p1", { a: 1 })).not.toBe(legacy);
    const withVersion = (v: number) => createHash("sha256").update(`v${v}|baemin|p1|${canonicalJSON({ a: 1 })}`).digest("hex");
    expect(designHash("baemin", "p1", { a: 1 })).toBe(withVersion(ENGINE_VERSION));
    expect(withVersion(ENGINE_VERSION + 1)).not.toBe(withVersion(ENGINE_VERSION));
    // 시드: 버전이 시드에 섞이면 시뮬레이션 숫자가 통째로 바뀐다. 값이 고정돼 있음을 못 박아 둔다.
    expect(crnZ(20260101, { case: "baemin", phase: "p1", period: 1, segment: "s", arm: "A", metric: "m" })).toBeCloseTo(-2.2803750975050567, 12);
  });
});

describe("노이즈 생성", () => {
  it("binomialCount: 0 ≤ x ≤ n, z=0 이면 반올림한 평균", () => {
    expect(binomialCount(1000, 0.3, 0)).toBe(300);
    expect(binomialCount(10, 0.99, 50)).toBe(10);
    expect(binomialCount(10, 0.01, -50)).toBe(0);
    expect(binomialCount(0, 0.5, 1)).toBe(0);
  });
  it("groupMean / sampleSd", () => {
    expect(groupMean(100, 10, 100, 2)).toBeCloseTo(102);
    expect(sampleSd(10, 0)).toBe(10);
    expect(sampleSd(10, 1)).toBeCloseTo(10.2);
  });
  it("sampleGroupMoments: 평균 주변에 퍼지고 X·Y 상관이 유지", () => {
    const m = { meanX: 1.2, meanY: 8, varX: 2, varY: 16, covXY: 4 }; // ρ = 4/√32 ≈ 0.707
    const reps = 4000;
    const xs: number[] = [], ys: number[] = [];
    for (let i = 0; i < reps; i++) {
      const next = crnStream(SEED, { ...key, period: i, metric: "moments" });
      const g = sampleGroupMoments(m, 5000, next);
      xs.push(g.meanX); ys.push(g.meanY);
      expect(g.covXY / Math.sqrt(g.varX * g.varY)).toBeCloseTo(4 / Math.sqrt(32), 10);
    }
    const mean = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
    const mx = mean(xs), my = mean(ys);
    const cov = mean(xs.map((x, i) => (x - mx) * (ys[i] - my)));
    const rho = cov / Math.sqrt(mean(xs.map((x) => (x - mx) ** 2)) * mean(ys.map((y) => (y - my) ** 2)));
    expect(Math.abs(mx - 1.2)).toBeLessThan(0.002);
    expect(Math.abs(rho - 0.707)).toBeLessThan(0.05);
  });
  it("poisson: 평균≈분산≈λ (작은 λ, 큰 λ)", () => {
    for (const lam of [3, 200]) {
      const rng = mulberry32(5);
      const N = 20000;
      let s = 0, ss = 0;
      for (let i = 0; i < N; i++) { const k = poisson(lam, rng); s += k; ss += k * k; }
      const m = s / N;
      expect(Math.abs(m / lam - 1)).toBeLessThan(0.03);
      expect(Math.abs((ss / N - m * m) / lam - 1)).toBeLessThan(0.1);
    }
    expect(poisson(0, mulberry32(1))).toBe(0);
  });
  it("heavyTailGroup: 같은 입력은 같은 출력, 고래가 평균과 SD 를 키운다", () => {
    const base = { zeroMass: 0.12, mu: 1.5, sigma: 1.1, whaleRate: 0, whaleValue: 60 };
    const withWhales = { ...base, whaleRate: 0.003 };
    const a = heavyTailGroup(withWhales, 300000, 0.3, mulberry32(8));
    const b = heavyTailGroup(withWhales, 300000, 0.3, mulberry32(8));
    expect(a).toEqual(b);
    const none = heavyTailGroup(base, 300000, 0.3, mulberry32(8));
    expect(none.whales).toBe(0);
    expect(a.whales).toBeGreaterThan(700);
    expect(a.mean).toBeGreaterThan(none.mean);
    expect(a.sd).toBeGreaterThan(none.sd);
  });
});
