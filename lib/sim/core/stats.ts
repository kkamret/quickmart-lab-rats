/**
 * 통계 함수 (docs/sim-core.md §2). reference/prototype.html 의 구현을 포팅하고 확장했다.
 * 프로토타입과 달라진 점:
 *  - normCdf 를 불완전 감마 함수 기반(정밀도 ~1e-14)으로, normInv 는 Acklam + Halley 보정으로 교체
 *  - srm 은 자유도에 맞는 카이제곱 p 값(프로토타입은 df=2 가 아니면 부정확한 근사)
 *  - 신뢰구간은 alpha 를 따른다(프로토타입은 1.96 고정)
 */

// ───────────────────────── 특수 함수 ─────────────────────────

const LANCZOS = [
  0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059,
  12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
];

function lgamma(z: number): number {
  const x0 = z - 1;
  let x = LANCZOS[0];
  for (let i = 1; i < 9; i++) x += LANCZOS[i] / (x0 + i);
  const t = x0 + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (x0 + 0.5) * Math.log(t) - t + Math.log(x);
}

/** 정규화된 상위 불완전 감마 함수 Q(a, x) */
export function gammaQ(a: number, x: number): number {
  if (x <= 0) return 1;
  const lead = Math.exp(-x + a * Math.log(x) - lgamma(a));
  if (x < a + 1) {
    // 급수로 P 를 구하고 1 - P
    let term = 1 / a;
    let sum = term;
    for (let n = 1; n < 1000; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-16) break;
    }
    return 1 - sum * lead;
  }
  // 연분수(Lentz)
  const tiny = 1e-300;
  let b = x + 1 - a;
  let c = 1 / tiny;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 1000; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < tiny) d = tiny;
    c = b + an / c;
    if (Math.abs(c) < tiny) c = tiny;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-16) break;
  }
  return lead * h;
}

function erfc(x: number): number {
  if (x === 0) return 1;
  if (!Number.isFinite(x)) return x > 0 ? 0 : 2;
  return x > 0 ? gammaQ(0.5, x * x) : 2 - gammaQ(0.5, x * x);
}

/** 표준정규 누적분포 Φ(x) */
export function normCdf(x: number): number {
  return 0.5 * erfc(-x / Math.SQRT2);
}

/** 표준정규 상측 꼬리 1 - Φ(x). 큰 x 에서도 정밀하다. */
export function normSf(x: number): number {
  return 0.5 * erfc(x / Math.SQRT2);
}

/** Φ⁻¹(p). Acklam 근사에 Halley 보정 1회. */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let x: number;
  if (p < pl) {
    const q = Math.sqrt(-2 * Math.log(p));
    x = (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p > 1 - pl) {
    const q = Math.sqrt(-2 * Math.log(1 - p));
    x = -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else {
    const q = p - 0.5;
    const r = q * q;
    x = ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  const e = normCdf(x) - p;
  const u = e * Math.sqrt(2 * Math.PI) * Math.exp((x * x) / 2);
  return x - u / (1 + (x * u) / 2);
}

/** 카이제곱 상측 꼬리 확률 */
export function chiSquareSf(chi: number, df: number): number {
  return gammaQ(df / 2, chi / 2);
}

// ───────────────────────── 비교 검정 ─────────────────────────

export type CompareResult = {
  vA: number;
  vB: number;
  d: number;
  se: number;
  ci: [number, number];
  z: number;
  p: number;
  rel: number;
  relCi: [number, number];
  /** B 가 A 보다 클 확률(정규 근사). 프로토타입의 "win" */
  win: number;
};

/** 차이(d = vB - vA)와 SE 에서 비교 결과를 만든다. se0 는 p 값에 쓰는 SE(비율 검정은 합동 SE). */
export function compareDiff(vA: number, vB: number, se: number, alpha = 0.05, se0 = se): CompareResult {
  const d = vB - vA;
  const zc = normInv(1 - alpha / 2);
  const z = d / se0;
  const ci: [number, number] = [d - zc * se, d + zc * se];
  return {
    vA,
    vB,
    d,
    se,
    ci,
    z,
    p: 2 * normSf(Math.abs(z)),
    rel: d / vA,
    relCi: [ci[0] / vA, ci[1] / vA],
    win: normCdf(d / se),
  };
}

/**
 * 두 비율 비교. p 값은 합동 SE, 신뢰구간은 비합동 SE.
 * seScale < 1 이면 SE 를 그만큼 줄여 계산한다(배정 단위와 분석 단위가 달라 SE 가 과소하게 나오는 상황 재현).
 */
export function propTest(a: { x: number; n: number }, b: { x: number; n: number }, alpha = 0.05, seScale = 1): CompareResult {
  const pA = a.x / a.n;
  const pB = b.x / b.n;
  const pool = (a.x + b.x) / (a.n + b.n);
  const se0 = Math.sqrt(pool * (1 - pool) * (1 / a.n + 1 / b.n)) * seScale;
  const se = Math.sqrt((pA * (1 - pA)) / a.n + (pB * (1 - pB)) / b.n) * seScale;
  return compareDiff(pA, pB, se, alpha, se0);
}

/** 두 평균 비교(Welch 형 SE). seScale 은 propTest 와 같다. */
export function meanTest(a: { m: number; sd: number; n: number }, b: { m: number; sd: number; n: number }, alpha = 0.05, seScale = 1): CompareResult {
  const se = Math.sqrt((a.sd * a.sd) / a.n + (b.sd * b.sd) / b.n) * seScale;
  return compareDiff(a.m, b.m, se, alpha);
}

/** SRM: 기대 배정비(ratios)와 관측 수(counts)의 카이제곱 적합도 검정. */
/**
 * 층별 비교를 역분산 가중으로 합친다(층화 분석). 층 안에서는 배정 비율이 같아서 합산 왜곡이 없고,
 * 합친 효과는 SE 가 작은 층에 더 큰 가중을 준다. 층이 하나면 그대로 돌려준다.
 */
export function combineStrata(parts: CompareResult[], alpha = 0.05): CompareResult {
  if (parts.length === 0) throw new Error("합칠 층이 없어요.");
  if (parts.length === 1) return parts[0];
  let w = 0;
  let dSum = 0;
  let aSum = 0;
  for (const p of parts) {
    const wi = 1 / (p.se * p.se);
    w += wi;
    dSum += wi * p.d;
    aSum += wi * p.vA;
  }
  const vA = aSum / w;
  return compareDiff(vA, vA + dSum / w, 1 / Math.sqrt(w), alpha);
}

export function srm(counts: number[], ratios: number[]): { chi: number; df: number; p: number; N: number } {
  if (counts.length !== ratios.length || counts.length < 2) throw new Error("srm: counts 와 ratios 길이가 같고 2 이상이어야 해요");
  const N = counts.reduce((s, x) => s + x, 0);
  const rs = ratios.reduce((s, x) => s + x, 0);
  let chi = 0;
  counts.forEach((c, i) => {
    const e = (N * ratios[i]) / rs;
    chi += ((c - e) * (c - e)) / e;
  });
  const df = counts.length - 1;
  return { chi, df, p: chiSquareSf(chi, df), N };
}

// ───────────────────────── 표본 크기 · 검정력 ─────────────────────────

/** 비율 지표의 그룹당 표본 크기 (양측, p1 vs p2) */
export function ssProp(p1: number, p2: number, alpha: number, power: number): number {
  const za = normInv(1 - alpha / 2);
  const zb = normInv(power);
  const pb = (p1 + p2) / 2;
  return Math.ceil(Math.pow(za * Math.sqrt(2 * pb * (1 - pb)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2)), 2) / Math.pow(p1 - p2, 2));
}

/** 평균 지표의 그룹당 표본 크기 (양측, 두 그룹 SD 동일) */
export function ssMean(sd: number, delta: number, alpha: number, power: number): number {
  const za = normInv(1 - alpha / 2);
  const zb = normInv(power);
  return Math.ceil((2 * Math.pow(za + zb, 2) * sd * sd) / (delta * delta));
}

/** 비율 지표의 달성 검정력: 기준 p1, 절대 차이 d, 그룹당 n */
export function powerProp(p1: number, d: number, n: number, alpha: number): number {
  const p2 = p1 + d;
  const se = Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / n);
  return normCdf(Math.abs(d) / se - normInv(1 - alpha / 2));
}

/** 평균 지표의 달성 검정력 */
export function powerMean(sd: number, d: number, n: number, alpha: number): number {
  const se = Math.sqrt((2 * sd * sd) / n);
  return normCdf(Math.abs(d) / se - normInv(1 - alpha / 2));
}

// ───────────────────────── 다중검정 ─────────────────────────

export type Correction = "none" | "bonferroni" | "bh";

/** p 값 배열에 보정을 적용해 유의 여부를 돌려준다. */
export function sigFlags(ps: number[], alpha: number, method: Correction): boolean[] {
  const m = ps.length;
  if (method === "bonferroni") return ps.map((p) => p < alpha / m);
  if (method === "bh") {
    const order = ps.map((p, i) => [p, i] as const).sort((x, y) => x[0] - y[0]);
    let k = -1;
    order.forEach(([p], r) => {
      if (p <= ((r + 1) * alpha) / m) k = r;
    });
    const out = ps.map(() => false);
    order.forEach(([, i], r) => {
      if (r <= k) out[i] = true;
    });
    return out;
  }
  return ps.map((p) => p < alpha);
}

// ───────────────────────── 비율 지표 · 분산 축소 · 클러스터 ─────────────────────────

/**
 * Delta Method: 사용자 단위 비율 R = ΣX/ΣY (예: 클릭 수 / 발송 수)의 SE.
 * Var(R) ≈ (Var(X) − 2R·Cov(X,Y) + R²·Var(Y)) / (n·E[Y]²)  (모두 사용자 단위 적률)
 */
export function deltaRatio(meanX: number, meanY: number, varX: number, varY: number, covXY: number, n: number): { ratio: number; se: number } {
  const ratio = meanX / meanY;
  const v = (varX - 2 * ratio * covXY + ratio * ratio * varY) / (n * meanY * meanY);
  return { ratio, se: Math.sqrt(Math.max(0, v)) };
}

/**
 * 비열등성 검정(단측). H0: d ≤ margin, H1: d > margin. margin 은 보통 음수(허용 손실, d 와 같은 단위).
 * lowerBound 는 (1−α) 단측 하한; margin 보다 크면 통과.
 */
export function nonInferiority(d: number, se: number, margin: number, alpha = 0.05): { z: number; p: number; passed: boolean; lowerBound: number } {
  const z = (d - margin) / se;
  const p = normSf(z);
  return { z, p, passed: p < alpha, lowerBound: d - normInv(1 - alpha) * se };
}

export type CupedGroup = { n: number; meanY: number; varY: number; meanX: number; varX: number; covYX: number };

/** θ = Cov(Y,X) / Var(X) (두 그룹을 표본 수로 가중해 합동) */
export function cupedTheta(a: CupedGroup, b: CupedGroup): number {
  const cov = a.covYX * a.n + b.covYX * b.n;
  const v = a.varX * a.n + b.varX * b.n;
  return cov / v;
}

/**
 * CUPED: Y_adj = Y − θ(X − E[X]). 두 그룹의 공변량 평균 차이를 빼서 효과 추정을 보정하고,
 * 분산은 Var(Y) + θ²Var(X) − 2θCov 로 줄어든다. 최적 θ 에서 분산 배수 = 1 − ρ².
 */
export function cuped(a: CupedGroup, b: CupedGroup, theta = cupedTheta(a, b)) {
  const adjVar = (g: CupedGroup) => g.varY + theta * theta * g.varX - 2 * theta * g.covYX;
  const rawVar = a.varY / a.n + b.varY / b.n;
  const adj = adjVar(a) / a.n + adjVar(b) / b.n;
  const rho2 = (theta * theta * (a.varX + b.varX)) / (a.varY + b.varY); // θ 가 최적일 때 ρ² 와 같다
  return {
    theta,
    rawD: b.meanY - a.meanY,
    rawSe: Math.sqrt(rawVar),
    d: b.meanY - theta * b.meanX - (a.meanY - theta * a.meanX),
    se: Math.sqrt(adj),
    varianceRatio: adj / rawVar,
    rho2,
  };
}

/** 상관계수 ρ 일 때 CUPED 분산 배수 */
export const cupedVarianceRatio = (rho: number) => 1 - rho * rho;

/**
 * 클러스터 강건 SE (클러스터 크기 가중 평균의 군집 표준오차).
 * Var = G/(G−1) · Σ mᵢ²(x̄ᵢ − μ)² / (Σmᵢ)²
 */
export function clusterSE(clusterMeans: number[], clusterSizes: number[]): { mean: number; se: number; clusters: number } {
  const G = clusterMeans.length;
  if (G < 2 || G !== clusterSizes.length) throw new Error("clusterSE: 클러스터가 2개 이상이고 길이가 같아야 해요");
  const M = clusterSizes.reduce((s, m) => s + m, 0);
  const mean = clusterMeans.reduce((s, x, i) => s + clusterSizes[i] * x, 0) / M;
  const ss = clusterMeans.reduce((s, x, i) => s + clusterSizes[i] ** 2 * (x - mean) ** 2, 0);
  return { mean, se: Math.sqrt((G / (G - 1)) * ss) / M, clusters: G };
}

/** 디자인 효과: 사용자 단위 SE 를 쓰면 SE 가 sqrt(DEFF) 배 과소 */
export const designEffect = (meanClusterSize: number, icc: number) => 1 + (meanClusterSize - 1) * icc;

// ───────────────────────── 순차 검정 ─────────────────────────

/** O'Brien–Fleming 형 경계: z_k = z_{α/2}·sqrt(K/k). k 번째 중간 확인(1..K). */
export function obfBoundary(k: number, K: number, alpha: number): number {
  return normInv(1 - alpha / 2) * Math.sqrt(K / k);
}

// ───────────────────────── 꼬리 지표 ─────────────────────────

export type Moments = { m1: number; m2: number };
export type LogNormalMixture = { zeroMass: number; mu: number; sigma: number };

/** 0 질량 + 로그정규 혼합분포를 cap 으로 윈저라이즈했을 때의 1·2차 적률. cap = Infinity 면 원본. */
export function lognormalMixtureMoments(mix: LogNormalMixture): (cap: number) => Moments {
  const { zeroMass: z0, mu, sigma } = mix;
  return (cap) => {
    if (!(cap > 0)) return { m1: 0, m2: 0 };
    const lc = Math.log(cap);
    const tail = cap === Infinity ? 0 : normSf((lc - mu) / sigma);
    const m1 = Math.exp(mu + (sigma * sigma) / 2) * (cap === Infinity ? 1 : normCdf((lc - mu - sigma * sigma) / sigma)) + (cap === Infinity ? 0 : cap * tail);
    const m2 = Math.exp(2 * mu + 2 * sigma * sigma) * (cap === Infinity ? 1 : normCdf((lc - mu - 2 * sigma * sigma) / sigma)) + (cap === Infinity ? 0 : cap * cap * tail);
    return { m1: (1 - z0) * m1, m2: (1 - z0) * m2 };
  };
}

/** 혼합분포의 q 분위수 (예: 윈저라이징 p99 의 cap) */
export function mixtureQuantile(mix: LogNormalMixture, q: number): number {
  if (q <= mix.zeroMass) return 0;
  return Math.exp(mix.mu + mix.sigma * normInv((q - mix.zeroMass) / (1 - mix.zeroMass)));
}

/** cap 으로 상한 처리한 지표의 평균, SD, 평균의 SE (표본 n). */
export function winsorize(momentFn: (cap: number) => Moments, cap: number, n: number): { mean: number; sd: number; se: number } {
  const { m1, m2 } = momentFn(cap);
  const sd = Math.sqrt(Math.max(0, m2 - m1 * m1));
  return { mean: m1, sd, se: sd / Math.sqrt(n) };
}
