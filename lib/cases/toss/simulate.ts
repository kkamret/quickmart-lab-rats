/**
 * 토스 시뮬레이션 엔진 (docs/cases/toss.md §1~§3).
 * 같은 (설계, 시드)면 항상 같은 Readout. 노이즈는 공통 난수(CRN)라서 설계가 달라도 같은 주·세그먼트·그룹의 노이즈는 공유된다.
 *
 * 사용자 단위 적률(발송 S, 클릭 C)은 닫힌 형태로 계산한다(population.ts). 그룹 집계는 그 적률에서 정규근사로 만들고,
 * 주마다 새로 생기는 잡음과 사용자 간 차이(모든 주에 공유)를 나눠서 넣어 기간이 길어져도 SE 가 일관되게 한다.
 */
import { SimulationRejected } from "../types";
import {
  compareDiff, crnStream, deltaRatio, designHash, heavyTailGroup, hashSeed, lognormalMixtureMoments, mixtureQuantile, mulberry32,
  nonInferiority, normCdf, obfBoundary, sigFlags, srm, winsorize,
  type Arm, type Comparison, type Flag, type MetricResult, type PeriodRow, type Readout,
} from "@/lib/sim/core";
import { AU_PERSIST, OPT_OUT_MONTHLY, PRE_RHO, REVENUE, SALT, SEED, SERVICES, USERS, betweenWeek, isLowFreq, mixMoments, totalMoments, withinWeek, type Moments } from "./population";
import { CALIB, ZERO, erosionRamp, trueEffect, type Effect } from "./effects";
import { POOLED_CTR, SEGMENTS, ctrSuppressed, replay, segmentReduction, type Rule, type SegKey } from "./replay";
import { designUnion, type Design, type MetricKey } from "./schema";

const ALPHA = 0.05;
const OLD_COHORT_FRACTION = 0.06; // s5 확대 실험에 이미 장기 노출된 기존 6% 코호트

export type SimOptions = { seed?: number; noise?: boolean; withTruth?: boolean };

type ArmName = "A" | "V1" | "V2";
const OUT_ARM: Record<ArmName, Arm> = { A: "A", V1: "B", V2: "C" };

export type Cfg = {
  phase: "p1" | "p2";
  arms: ArmName[];
  variants: { V1: Rule; V2: Rule };
  nArm: number;
  weeks: number;
  primary: MetricKey;
  htype: Partial<Record<MetricKey, "superiority" | "non_inferiority">>;
  niMargin?: number;
  guardrails: MetricKey[];
  secondary: MetricKey[];
  unit: "push" | "user_delta";
  cuped: boolean;
  correction: "none" | "bonferroni" | "bh";
  stopping: "fixed" | "peek_stop" | "sequential";
  stakeholderAlignment: boolean;
  response?: string;
  aa: boolean;
  fractionTotal: number;
};

export function validateDesign(input: unknown): { ok: true; design: Design } | { ok: false; message: string } {
  const parsed = designUnion.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "설계 입력을 확인해 주세요." };
  return { ok: true, design: parsed.data };
}

function toCfg(d: Design): Cfg {
  if (!d.variants) throw new SimulationRejected("먼저 2번 스텝(설계)에서 변이안 두 개를 제출해 주세요. 확대 실험은 그 변이안을 이어받아요.");
  const stakeholderAlignment = d.stakeholder_alignment ?? true;
  if (d.phase === "p2") {
    if (!stakeholderAlignment && !d.response_to_stakeholders) {
      throw new SimulationRejected("서비스 담당자 두 분이 도달 감소를 이유로 실험 중단을 요청했어요. 대응안을 적어주세요.");
    }
    return {
      phase: "p2", arms: d.arms, variants: d.variants, nArm: Math.round((USERS * d.fraction_total) / d.arms.length), weeks: d.duration_weeks,
      primary: d.primary ?? "push_ctr", htype: d.hypothesis_type ?? {}, niMargin: d.ni_margin_pct,
      guardrails: d.guardrails ?? ["app_open_au"], secondary: d.secondary ?? ["clicks_per_user"],
      unit: d.ctr_analysis_unit ?? "user_delta", cuped: d.cuped, correction: d.correction, stopping: "fixed",
      stakeholderAlignment, response: d.response_to_stakeholders, aa: d.aa === true, fractionTotal: d.fraction_total,
    };
  }
  return {
    phase: "p1", arms: ["A", "V1", "V2"], variants: d.variants, nArm: Math.round((USERS * d.sample_fraction) / 3), weeks: d.duration_weeks,
    primary: d.primary, htype: d.hypothesis_type, niMargin: d.ni_margin_pct, guardrails: d.guardrails, secondary: d.secondary,
    unit: d.ctr_analysis_unit, cuped: d.cuped, correction: d.correction, stopping: d.stopping,
    stakeholderAlignment, aa: d.aa === true, fractionTotal: d.sample_fraction,
  };
}

// ───────────────────────── 그룹 데이터 생성 ─────────────────────────

type SegWeek = { S: number; C: number; au: number };
type ArmData = { n: number; seg: Record<SegKey, { n: number; weeks: SegWeek[] }> };
type Data = Record<ArmName, ArmData | undefined> & { cfg: Cfg; eff: Record<ArmName, Effect> };

const chol2 = (m: { s: number; c: number; sc: number }) => {
  const l11 = Math.sqrt(m.s);
  const l21 = m.sc / l11;
  return { l11, l21, l22: Math.sqrt(Math.max(0, m.c - l21 * l21)) };
};

/** 노출 w 주차의 침식 진행률. 확대 실험의 변이안 그룹에는 이미 장기 노출된 기존 코호트가 섞여 있다. */
function rampFor(cfg: Cfg, arm: ArmName, week: number): number {
  const fresh = erosionRamp(week);
  if (cfg.phase !== "p2" || arm === "A") return fresh;
  const old = Math.min(1, OLD_COHORT_FRACTION / cfg.fractionTotal);
  return old + (1 - old) * fresh;
}

const segParams = (eff: Effect, key: SegKey) => {
  const g = SEGMENTS.find((x) => x.key === key)!;
  const sg = eff.s ? segmentReduction(eff.s, key) : 0;
  return { lam: g.sends * (1 - sg), c: (g.ctr * (1 + eff.deltaC)) / (1 - sg), share: g.share, au: g.au };
};

function effectsOf(cfg: Cfg): Record<ArmName, Effect> {
  const none = { A: ZERO, V1: ZERO, V2: ZERO };
  if (cfg.aa) return none;
  return { A: ZERO, V1: trueEffect(cfg.variants.V1), V2: trueEffect(cfg.variants.V2) };
}

function generate(cfg: Cfg, noise: boolean, seed: number): Data {
  const eff = effectsOf(cfg);
  const data = { cfg, eff } as Data;
  const K = cfg.arms.length;
  for (const arm of cfg.arms) {
    const key = (period: number | string, segment: string, metric: string) => ({ case: "toss", phase: cfg.phase, period, segment, arm, metric });
    const z = (period: number | string, segment: string, metric: string) => (noise ? crnStream(seed, key(period, segment, metric)) : () => 0);

    const nObs = noise ? Math.round(cfg.nArm + Math.sqrt(cfg.nArm * (1 - 1 / K)) * z("persist", "*", "split")()) : cfg.nArm;
    // 사용자 무작위 배정이라 세그먼트 구성도 그룹마다 조금씩 다르다(모든 주에 공유)
    const raw = SEGMENTS.map((g) => nObs * g.share + (noise ? Math.sqrt(nObs * g.share * (1 - g.share)) * z("persist", g.key, "mix")() : 0));
    const total = raw.reduce((s, x) => s + x, 0);
    const seg = {} as ArmData["seg"];
    SEGMENTS.forEach((g, i) => {
      const n = (raw[i] * nObs) / total;
      const p = segParams(eff[arm], g.key);
      const Lw = chol2(withinWeek(p.lam, p.c));
      const Lb = chol2(betweenWeek(p.lam, p.c));
      const hb = z("persist", g.key, "scb");
      const hb1 = hb();
      const hb2 = hb();
      const hAu = z("persist", g.key, `au${SALT.au}`)();
      const weeks: SegWeek[] = [];
      for (let w = 1; w <= cfg.weeks; w++) {
        const e = z(w, g.key, "sc");
        const e1 = e();
        const e2 = e();
        const S = p.lam + (Lw.l11 * e1 + Lb.l11 * hb1) / Math.sqrt(n);
        const C = p.lam * p.c + (Lw.l21 * e1 + Lw.l22 * e2 + Lb.l21 * hb1 + Lb.l22 * hb2) / Math.sqrt(n);
        const rel = g.key === "light" ? eff[arm].erosionRel * rampFor(cfg, arm, w) : 0;
        const pAu = Math.min(0.999, Math.max(0.001, p.au * (1 + rel)));
        const au = pAu + Math.sqrt((pAu * (1 - pAu)) / n) * (Math.sqrt(1 - AU_PERSIST) * z(w, g.key, `au${SALT.au}`)() + Math.sqrt(AU_PERSIST) * hAu);
        weeks.push({ S, C, au: Math.min(1, Math.max(0, au)) });
      }
      seg[g.key] = { n, weeks };
    });
    data[arm] = { n: nObs, seg };
  }
  return data;
}

// ───────────────────────── 지표 계산 ─────────────────────────

type Stat = { n: number; x?: number; mean?: number; sd?: number };
type Est = { val: number; se: number; stat: Stat };

export const LABELS: Record<string, string> = {
  push_ctr: "푸시 CTR", clicks_per_user: "인당 주간 클릭 수", sends_per_user: "인당 주간 발송 수", app_open_au: "앱 오픈 AU (마지막 주)",
  revenue_per_user: "인당 주간 매출(원)", revenue_per_user_w: "인당 주간 매출(원, 상위 1% 윈저라이즈)", opt_out_rate: "알림 수신 거부율",
};
const TYPES: Record<string, MetricResult["type"]> = {
  push_ctr: "ratio", clicks_per_user: "mean", sends_per_user: "mean", app_open_au: "prop", revenue_per_user: "mean", revenue_per_user_w: "mean", opt_out_rate: "prop",
};
const RHO: Partial<Record<string, number>> = { push_ctr: PRE_RHO.clicks, clicks_per_user: PRE_RHO.clicks, sends_per_user: PRE_RHO.clicks, app_open_au: PRE_RHO.au };

/** 한 그룹의 D 주 합계 사용자 적률 (전체 또는 세그먼트 하나) */
function armMoments(eff: Effect, D: number, seg?: SegKey): Moments {
  const parts = SEGMENTS.filter((g) => !seg || g.key === seg).map((g) => {
    const p = segParams(eff, g.key);
    return { share: seg ? 1 : g.share, m: totalMoments(p.lam, p.c, D) };
  });
  return mixMoments(parts);
}

/** 1..k 주 합계 (사용자당): 전체 또는 세그먼트 하나 */
function sums(a: ArmData, k: number, seg?: SegKey) {
  let S = 0;
  let C = 0;
  for (const g of SEGMENTS) {
    if (seg && g.key !== seg) continue;
    const w = seg ? 1 : a.seg[g.key].n / a.n;
    for (let i = 0; i < k; i++) {
      S += w * a.seg[g.key].weeks[i].S;
      C += w * a.seg[g.key].weeks[i].C;
    }
  }
  return { S, C };
}

/** k 주차의 AU: 전체 또는 세그먼트 하나 */
function auAt(a: ArmData, k: number, seg?: SegKey): number {
  if (seg) return a.seg[seg].weeks[k - 1].au;
  return SEGMENTS.reduce((s, g) => s + (a.seg[g.key].n / a.n) * a.seg[g.key].weeks[k - 1].au, 0);
}

type Ctx = { cfg: Cfg; data: Data; truth: Data; naive: boolean };

/** 푸시 단위(순진한) SE 를 쓰는 CTR 분석인지 */
function ctrSe(ctx: Ctx, arm: ArmName, k: number, seg?: SegKey, forceDelta = false): number {
  const m = armMoments(ctx.data.eff[arm], k, seg);
  const n = seg ? ctx.truth[arm]!.seg[seg].n : ctx.truth[arm]!.n;
  const d = deltaRatio(m.meanC, m.meanS, m.varC, m.varS, m.cov, n);
  if (ctx.naive && !forceDelta) return Math.sqrt((d.ratio * (1 - d.ratio)) / (n * m.meanS));
  return d.se;
}

function estimate(ctx: Ctx, key: string, arm: ArmName, k: number, seg?: SegKey, forceDelta = false): Est {
  const a = ctx.data[arm]!;
  const t = ctx.truth[arm]!;
  const n = seg ? a.seg[seg].n : a.n;
  switch (key) {
    case "push_ctr": {
      const { S, C } = sums(a, k, seg);
      return { val: C / S, se: ctrSe(ctx, arm, k, seg, forceDelta), stat: { n, mean: C / S } };
    }
    case "clicks_per_user":
    case "sends_per_user": {
      const { S, C } = sums(a, k, seg);
      const m = armMoments(ctx.data.eff[arm], k, seg);
      const v = (key === "clicks_per_user" ? C : S) / k;
      const sd = Math.sqrt(key === "clicks_per_user" ? m.varC : m.varS) / k;
      return { val: v, se: sd / Math.sqrt(n), stat: { n, mean: v, sd } };
    }
    case "app_open_au": {
      const p = auAt(a, k, seg);
      const pt = auAt(t, k, seg);
      return { val: p, se: Math.sqrt((pt * (1 - pt)) / n), stat: { n, x: Math.round(p * n) } };
    }
    default:
      throw new Error(`estimate: ${key}`);
  }
}

type Cmp = { vA: number; vB: number; d: number; se: number; adj: boolean };

/** 처치군 − 대조군 차이. CUPED 면 노이즈(진짜 차이에서 벗어난 부분)를 sqrt(1−ρ²) 배로 줄인다. */
function diffOf(ctx: Ctx, key: string, v: ArmName, k: number, seg?: SegKey): Cmp & { dTrue: number } {
  const eA = estimate(ctx, key, "A", k, seg);
  const eV = estimate(ctx, key, v, k, seg);
  const tA = estimate({ ...ctx, data: ctx.truth }, key, "A", k, seg);
  const tV = estimate({ ...ctx, data: ctx.truth }, key, v, k, seg);
  const dTrue = tV.val - tA.val;
  const raw = eV.val - eA.val;
  const rho = RHO[key];
  const f = ctx.cfg.cuped && rho !== undefined ? Math.sqrt(1 - rho * rho) : 1;
  const d = ctx.cfg.cuped && f !== 1 ? dTrue + f * (raw - dTrue) : raw;
  return { vA: eA.val, vB: eA.val + d, d, se: Math.hypot(eA.se, eV.se) * f, adj: f !== 1, dTrue };
}

const fmtMethod = (key: string, c: Ctx) =>
  `${TYPES[key] === "prop" ? "비율 z 검정" : key === "push_ctr" ? (c.naive ? "푸시 단위 이항 검정" : "Delta Method(사용자 단위)") : "평균 z 검정"}${c.cfg.cuped && RHO[key] !== undefined ? " · CUPED" : ""}`;

// ───────────────────────── 메인 ─────────────────────────

export function simulateToss(input: unknown, opts: SimOptions = {}): Readout {
  const v = validateDesign(input);
  if (!v.ok) throw new SimulationRejected(v.message);
  const cfg = toCfg(v.design);
  const seed = opts.seed ?? SEED;
  const noise = opts.noise ?? true;
  const withTruth = opts.withTruth ?? true;

  const data = generate(cfg, noise, seed);
  const truth = noise ? generate(cfg, false, seed) : data;
  const ctx: Ctx = { cfg, data, truth, naive: cfg.unit === "push" };
  const treat = cfg.arms.filter((a) => a !== "A");
  const K = cfg.weeks;

  // ── 중간 확인 규칙: 매주 누적 검정(첫 변이안 vs 대조군, 메인 지표) ──
  let stop = K;
  if (cfg.stopping !== "fixed" && treat.length > 0) {
    for (let k = 1; k <= K; k++) {
      const c = diffOf(ctx, cfg.primary, treat[0], k);
      const z = c.d / c.se;
      const hit = cfg.stopping === "peek_stop" ? 2 * (1 - normCdf(Math.abs(z))) < ALPHA : Math.abs(z) >= obfBoundary(k, K, ALPHA);
      if (hit) { stop = k; break; }
    }
  }
  const bound = cfg.stopping === "sequential" ? obfBoundary(stop, K, ALPHA) : undefined;
  const isSig = (d: number, se: number) => (bound !== undefined ? Math.abs(d / se) >= bound : 2 * (1 - normCdf(Math.abs(d / se))) < ALPHA);

  // ── 지표 목록 (메인 > 가드레일 > 보조) ──
  const roles = new Map<string, "P" | "G" | "S">();
  roles.set(cfg.primary, "P");
  for (const g of cfg.guardrails) if (g !== "service_au" && !roles.has(g)) roles.set(g, "G");
  for (const s of cfg.secondary) if (!roles.has(s)) roles.set(s, "S");
  const keys: string[] = [];
  for (const k of roles.keys()) {
    keys.push(k);
    if (k === "revenue_per_user") keys.push("revenue_per_user_w");
  }
  const roleOf = (k: string) => roles.get(k === "revenue_per_user_w" ? "revenue_per_user" : k)!;

  const nonInf: Record<string, unknown>[] = [];
  const metrics: MetricResult[] = keys.map((key) => {
    const arms: MetricResult["arms"] = {};
    const comparisons: Comparison[] = [];
    if (key === "revenue_per_user" || key === "revenue_per_user_w") {
      const rev = revenueStats(cfg, noise, seed, stop);
      for (const a of cfg.arms) arms[OUT_ARM[a]] = key === "revenue_per_user" ? rev[a].raw : rev[a].win;
      for (const t of treat) {
        const sa = arms.A!;
        const sb = arms[OUT_ARM[t]]!;
        const se = Math.hypot(sa.sd! / Math.sqrt(sa.n), sb.sd! / Math.sqrt(sb.n));
        const r = compareDiff(sa.mean!, sb.mean!, se, ALPHA);
        comparisons.push({ vs: "A", arm: OUT_ARM[t], d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: isSig(r.d, se), method: "평균 z 검정" });
      }
    } else if (key === "opt_out_rate") {
      const rates = optOut(cfg, noise, seed, stop);
      for (const a of cfg.arms) arms[OUT_ARM[a]] = rates[a];
      for (const t of treat) {
        const sa = rates.A;
        const sb = rates[t];
        const pA = sa.x! / sa.n;
        const pB = sb.x! / sb.n;
        const se = Math.sqrt((pA * (1 - pA)) / sa.n + (pB * (1 - pB)) / sb.n);
        const r = compareDiff(pA, pB, se, ALPHA);
        comparisons.push({ vs: "A", arm: OUT_ARM[t], d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: isSig(r.d, se), method: "비율 z 검정" });
      }
    } else {
      for (const a of cfg.arms) arms[OUT_ARM[a]] = estimate(ctx, key, a, stop).stat;
      for (const t of treat) {
        const c = diffOf(ctx, key, t, stop);
        const r = compareDiff(c.vA, c.vB, c.se, ALPHA);
        comparisons.push({ vs: "A", arm: OUT_ARM[t], d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: isSig(r.d, c.se), method: fmtMethod(key, ctx) });
        if (cfg.htype[key as MetricKey] === "non_inferiority" && cfg.niMargin !== undefined && (key === "push_ctr" || key === "clicks_per_user" || key === "app_open_au")) {
          const margin = (cfg.niMargin / 100) * c.vA;
          const ni = nonInferiority(c.d, c.se, margin, ALPHA);
          nonInf.push({ metric: key, label: LABELS[key], arm: OUT_ARM[t], d: c.d, margin, marginPct: cfg.niMargin, lowerBound: ni.lowerBound, p: ni.p, passed: ni.passed, type: TYPES[key] });
        }
      }
    }
    return { key, label: LABELS[key], role: roleOf(key), type: TYPES[key], arms, comparisons };
  });

  // ── SRM ──
  const counts = cfg.arms.map((a) => data[a]!.n);
  const srmRes = srm(counts, cfg.arms.map(() => 1 / cfg.arms.length));

  // ── 주간 행 ──
  const periods: PeriodRow[] = Array.from({ length: stop }, (_, i) => {
    const w = i + 1;
    return {
      period: w,
      arms: Object.fromEntries(
        cfg.arms.map((a) => {
          const ad = data[a]!;
          let S = 0;
          let C = 0;
          for (const g of SEGMENTS) {
            S += (ad.seg[g.key].n / ad.n) * ad.seg[g.key].weeks[i].S;
            C += (ad.seg[g.key].n / ad.n) * ad.seg[g.key].weeks[i].C;
          }
          return [OUT_ARM[a], { users: ad.n, sends_per_user: S, clicks_per_user: C, ctr: C / S, au: auAt(ad, w), light_au: auAt(ad, w, "light") }];
        }),
      ),
    };
  });

  // ── 패널 ──
  const panels: Record<string, unknown> = {};
  const measured = new Set(keys);
  const clicksMeasured = measured.has("clicks_per_user");

  if (nonInf.length > 0) panels.non_inferiority = { rows: nonInf };
  else if (clicksMeasured) panels.non_inferiority = { rows: [], hint: "차이가 유의하지 않다는 것과 줄지 않았다는 것은 달라요. 줄지 않았다고 말하려면 허용하는 손실 마진을 정해 비열등성 검정을 해야 해요." };

  if (cfg.arms.includes("V1") && cfg.arms.includes("V2")) {
    const rows = (["push_ctr", "clicks_per_user", "app_open_au"] as const).map((key) => {
      const eA = estimate(ctx, key, "V1", stop);
      const eB = estimate(ctx, key, "V2", stop);
      const f = cfg.cuped && RHO[key] !== undefined ? Math.sqrt(1 - RHO[key]! ** 2) : 1;
      const tV1 = estimate({ ...ctx, data: truth }, key, "V1", stop).val;
      const tV2 = estimate({ ...ctx, data: truth }, key, "V2", stop).val;
      const raw = eB.val - eA.val;
      const d = cfg.cuped ? tV2 - tV1 + f * (raw - (tV2 - tV1)) : raw;
      const se = Math.hypot(eA.se, eB.se) * f;
      const r = compareDiff(eA.val, eA.val + d, se, ALPHA);
      return { metric: key, label: LABELS[key], type: TYPES[key], d: r.d, ci: r.ci, p: r.p, significant: isSig(r.d, se) };
    });
    panels.v1_vs_v2 = { rows, note: "V2 − V1 입니다." };
  }

  // 서비스별 AU 표 (가드레일에 service_au 가 있을 때)
  let serviceTests = 0;
  const serviceSigCount = { n: 0 };
  if (cfg.guardrails.includes("service_au")) {
    const f = cfg.cuped ? Math.sqrt(1 - PRE_RHO.au ** 2) : 1;
    const ns = ctx.naive ? ctrSe(ctx, "V1", stop) / ctrSe(ctx, "V1", stop, undefined, true) : 1; // 푸시 단위 SE 는 사용자 단위보다 이만큼 좁다
    const nA = data.A!.n;
    const svcAu = (a: ArmName, id: string, base: number, noisy: boolean) => {
      const ad = (noisy ? data : truth)[a]!;
      const rel = effectsOf(cfg)[a].erosionRel * rampFor(cfg, a, stop) * 0.25 * (isLowFreq(id) ? CALIB.lowFreqMult : 1);
      const p = Math.min(0.999, Math.max(0.001, base * (1 + rel)));
      if (!noisy) return p;
      const z = (period: number | string) => crnStream(seed, { case: "toss", phase: cfg.phase, period, segment: "*", arm: a, metric: `svc${SALT.svc}:${id}` })();
      return Math.min(1, Math.max(0, p + Math.sqrt((p * (1 - p)) / ad.n) * (Math.sqrt(1 - AU_PERSIST) * z(stop) + Math.sqrt(AU_PERSIST) * z("persist"))));
    };
    type Row = { id: string; lowFreq: boolean; A: { n: number; x: number }; arms: Record<string, { n: number; x: number; d: number; ci: [number, number]; p: number; significant: boolean }> };
    const rows: Row[] = SERVICES.map((s) => ({ id: s.id, lowFreq: isLowFreq(s.id), A: { n: nA, x: Math.round(svcAu("A", s.id, s.au, true) * nA) }, arms: {} }));
    const ps: number[] = [];
    const idx: { r: Row; t: ArmName; d: number; se: number }[] = [];
    SERVICES.forEach((s, i) => {
      const pA = svcAu("A", s.id, s.au, true);
      const pAt = svcAu("A", s.id, s.au, false);
      for (const t of treat) {
        const pV = svcAu(t, s.id, s.au, true);
        const pVt = svcAu(t, s.id, s.au, false);
        const dTrue = pVt - pAt;
        const d = cfg.cuped ? dTrue + f * (pV - pA - dTrue) : pV - pA;
        const se = Math.sqrt((pAt * (1 - pAt)) / nA + (pVt * (1 - pVt)) / data[t]!.n) * f * ns;
        ps.push(2 * (1 - normCdf(Math.abs(d / se))));
        idx.push({ r: rows[i], t, d, se });
        rows[i].arms[OUT_ARM[t]] = { n: data[t]!.n, x: Math.round(pV * data[t]!.n), d, ci: [d - 1.96 * se, d + 1.96 * se], p: ps[ps.length - 1], significant: false };
      }
    });
    serviceTests = ps.length;
    const sig = sigFlags(ps, ALPHA, cfg.correction);
    idx.forEach((x, i) => { rows.find((r) => r === x.r)!.arms[OUT_ARM[x.t]].significant = sig[i]; });
    serviceSigCount.n = sig.filter(Boolean).length;
    panels.services = { rows, tests: serviceTests, correction: cfg.correction, significant: serviceSigCount.n };
  }

  // 라이트 사용자 AU (마지막 주): 습관 침식이 가장 먼저 드러나는 곳. 확대 실험은 HTE 패널이 같은 걸 보여준다.
  if (cfg.phase === "p1") {
    const out: Record<string, unknown> = {};
    for (const t of treat) {
      const c = diffOf(ctx, "app_open_au", t, stop, "light");
      const r = compareDiff(c.vA, c.vB, c.se, ALPHA);
      out[OUT_ARM[t]] = { vA: c.vA, vB: c.vB, d: r.d, ci: r.ci, p: r.p, significant: isSig(r.d, c.se) };
    }
    panels.light_au = out;
  }

  // 구성 효과 분해 (인당 클릭을 함께 측정했을 때만)
  if (cfg.primary === "push_ctr" || measured.has("push_ctr")) {
    if (!clicksMeasured) {
      panels.composition = { active: false, hint: "CTR 이 오른 이유를 나누려면 인당 클릭 수 데이터가 필요해요." };
    } else {
      const rows = treat.map((t) => {
        const rule = cfg.variants[t as "V1" | "V2"];
        const rp = replay(rule);
        const ctrA = estimate(ctx, "push_ctr", "A", stop).val;
        const ctrV = estimate(ctx, "push_ctr", t, stop).val;
        const sendsA = estimate(ctx, "sends_per_user", "A", stop).val;
        const sendsV = estimate(ctx, "sends_per_user", t, stop).val;
        const clA = estimate(ctx, "clicks_per_user", "A", stop).val;
        const clV = estimate(ctx, "clicks_per_user", t, stop).val;
        const sObs = 1 - sendsV / sendsA;
        // 구성 효과: 억제된 푸시의 과거 클릭만큼 빼고 남은 푸시 반응은 그대로라고 볼 때의 CTR 변화
        const composition = (ctrA * (1 - rp.clickLossOffline)) / (1 - sObs) - ctrA;
        return {
          arm: OUT_ARM[t], name: t, ctrA, ctrV, ctrChange: ctrV - ctrA, composition, behavior: ctrV - ctrA - composition,
          sendsChangeRel: sendsV / sendsA - 1, clicksChangeRel: clV / clA - 1,
        };
      });
      panels.composition = { active: true, rows };
      panels.replay_gap = {
        rows: rows.map((r) => ({ arm: r.arm, name: r.name, offlineClickLossRel: -replay(cfg.variants[r.name as "V1" | "V2"]).clickLossOffline, onlineClicksRel: r.clicksChangeRel })),
      };
    }
  }

  // 이질적 처치 효과 (확대 실험)
  if (cfg.phase === "p2") {
    const segRows = SEGMENTS.map((g) => ({
      seg: g.key, label: g.label,
      arms: Object.fromEntries(
        treat.map((t) => {
          const out: Record<string, unknown> = {};
          for (const key of ["push_ctr", "clicks_per_user", "app_open_au"] as const) {
            const c = diffOf(ctx, key, t, stop, g.key);
            const r = compareDiff(c.vA, c.vB, c.se, ALPHA);
            out[key] = { vA: c.vA, vB: c.vB, d: r.d, ci: r.ci, p: r.p, significant: isSig(r.d, c.se), type: TYPES[key] };
          }
          return [OUT_ARM[t], out];
        }),
      ),
    }));
    panels.hte = { rows: segRows };
    if (!cfg.stakeholderAlignment) {
      panels.event = {
        title: "서비스 담당자 반발",
        text: "저빈도 서비스(S10~S12) 담당자 두 분이 푸시 도달이 줄어든다는 이유로 실험 중단을 요청했어요. 제출한 대응안과 함께 결과를 읽어보세요.",
        response: cfg.response ?? "",
      };
    }
  }

  // ── 진짜 효과 · 계획 · 달성 검정력 (강사 전용) ──
  let planned: Readout["planned"];
  let achievedPower: number | undefined;
  if (withTruth) {
    planned = { nPerArm: cfg.nArm, days: K * 7 };
    if (treat.length > 0 && !cfg.aa) {
      const c = diffOf(ctx, cfg.primary, treat[0], stop);
      const z = Math.abs(c.dTrue) / c.se;
      achievedPower = normCdf(z - 1.96) + normCdf(-z - 1.96);
    }
    panels._truth = {
      note: "기댓값 경로(노이즈 없음)의 진짜 효과. 조 화면에 보내지 않는다.",
      variants: Object.fromEntries(
        (["V1", "V2"] as const).map((vn) => {
          const e = trueEffect(cfg.variants[vn]);
          const rp = replay(cfg.variants[vn]);
          return [vn, { sendReduction: e.s, deltaClicksRel: e.deltaC, ctr: (POOLED_CTR * (1 + e.deltaC)) / (1 - e.s), lightAuRel: e.erosionRel, optOutRel: e.optOutRel, offlineClickLossRel: -rp.clickLossOffline, ctrSuppressed: ctrSuppressed(cfg.variants[vn].N) }];
        }),
      ),
    };
  }

  // ── 플래그 (조 화면에는 내려보내지 않는다) ──
  const flags: Flag[] = [];
  // A/A 는 진짜 효과가 없어서 습관 침식도 없다 → 짧게 끝내도 SHORT_DURATION 이 아니다
  const maxS = cfg.aa ? 0 : Math.max(0, ...treat.map((vn) => trueEffect(cfg.variants[vn as "V1" | "V2"]).s));
  if (srmRes.p < 0.001) flags.push("SRM");
  if (cfg.primary === "push_ctr" && !clicksMeasured) flags.push("RATIO_COMPOSITION");
  if (cfg.unit === "push") flags.push("NAIVE_SE");
  if (stop < 6 && maxS >= 0.2) flags.push("SHORT_DURATION");
  if (cfg.stopping === "peek_stop") flags.push("PEEKED");
  if (achievedPower !== undefined && achievedPower < 0.5) flags.push("UNDERPOWERED");
  if (cfg.guardrails.includes("service_au") && cfg.correction === "none" && serviceTests >= 10) flags.push("MULTIPLE_TESTING");
  if (cfg.phase === "p2" && !cfg.stakeholderAlignment) flags.push("STAKEHOLDER_EVENT");

  return {
    caseKey: "toss",
    phase: cfg.phase,
    designHash: designHash("toss", cfg.phase, v.design),
    periods,
    stoppedAt: stop,
    srm: { counts, ratios: cfg.arms.map(() => 1 / cfg.arms.length), p: srmRes.p },
    metrics,
    planned,
    achievedPower,
    panels,
    flags,
  };
}

// ───────────────────────── 꼬리 지표와 수신 거부 ─────────────────────────

function revenueStats(cfg: Cfg, noise: boolean, seed: number, k: number) {
  const mix = { zeroMass: REVENUE.zeroMass, mu: REVENUE.mu, sigma: REVENUE.sigma };
  const cap = mixtureQuantile(mix, 0.99);
  const out = {} as Record<ArmName, { raw: Stat; win: Stat }>;
  for (const a of cfg.arms) {
    const nObs = cfg.nArm * k; // 사용자-주 관측 수
    const key = (metric: string) => ({ case: "toss", phase: cfg.phase, period: k, segment: "*", arm: a, metric });
    const z = noise ? crnStream(seed, key("rev"))() : 0;
    const rng = mulberry32(hashSeed(seed, "toss", cfg.phase, k, a, "whales"));
    const raw = heavyTailGroup({ ...mix, whaleRate: noise ? REVENUE.whaleRate : 0, whaleValue: REVENUE.whaleValue }, nObs, z, rng);
    const w = winsorize(lognormalMixtureMoments(mix), cap, nObs);
    // 사용자 한 명의 k 주 평균의 SD = 사용자-주 SD / √k (주별 매출은 서로 독립이라고 봄)
    out[a] = { raw: { n: cfg.nArm, mean: raw.mean, sd: raw.sd / Math.sqrt(k) }, win: { n: cfg.nArm, mean: w.mean + w.se * z, sd: w.sd / Math.sqrt(k) } };
  }
  return out;
}

function optOut(cfg: Cfg, noise: boolean, seed: number, k: number) {
  const out = {} as Record<ArmName, Stat>;
  const eff = effectsOf(cfg);
  for (const a of cfg.arms) {
    const p = OPT_OUT_MONTHLY * (k / 4) * (1 + eff[a].optOutRel);
    const z = noise ? crnStream(seed, { case: "toss", phase: cfg.phase, period: k, segment: "*", arm: a, metric: "optout" })() : 0;
    const n = cfg.nArm;
    out[a] = { n, x: Math.max(0, Math.min(n, Math.round(n * p + Math.sqrt(n * p * (1 - p)) * z))) };
  }
  return out;
}
