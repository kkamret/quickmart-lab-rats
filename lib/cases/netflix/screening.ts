/**
 * s2~s4 스크리닝 엔진 (docs/cases/netflix.md §2-1, §3-2): 인터리빙 vs 전부 A/B/n.
 * 후보마다 메트릭 하나씩 만든다(arms: A = 현행 R0, B = 후보). 인터리빙에서는 A.x = R0 몫이 선택된 횟수, B.x = 후보 몫이 선택된 횟수.
 */
import { SimulationRejected } from "../types";
import {
  compareDiff, crnZ, designHash, meanTest, normCdf, normInv, powerMean, powerProp, propTest, sigFlags, srm, ssMean, ssProp,
  type Comparison, type Flag, type MetricResult, type Readout,
} from "@/lib/sim/core";
import { HOURS_MEAN_EXACT, RAW_WEEK_SD, windowFactor, type SimOptions } from "./common";
import { CALIB, noveltyAvg, retentionObserved, TRUTH, type RankerId } from "./effects";
import { HOURS_MEAN, MEMBERS, PLAN_ALPHA, PLAN_POWER, RETENTION, SALT, SEED } from "./population";
import type { DesignP1 } from "./schema";

const ALPHA = PLAN_ALPHA;
const unique = <T,>(xs: readonly T[]) => [...new Set(xs)];
const uniqueCands = (d: DesignP1) => unique(d.candidates) as Exclude<RankerId, "R0">[];

/** 보정을 고려한 계획용 유의수준 */
const alphaEff = (correction: DesignP1["correction"], m: number) => (correction === "bonferroni" ? ALPHA / Math.max(1, m) : ALPHA);

/**
 * 인터리빙은 쌍마다 "후보 몫이 선택될 비율 vs 0.5" 를 한 표본 z 검정으로 본다(ilCompare). 계획 표본·달성 검정력도 같은 검정 기준이다.
 * 귀무 SE 는 √(0.25/n), 대립 SE 는 √(p(1−p)/n).
 */
function ssPrefOneSample(p: number, alpha: number, power: number): number {
  const za = normInv(1 - alpha / 2);
  const zb = normInv(power);
  return Math.ceil(Math.pow(za * 0.5 + zb * Math.sqrt(p * (1 - p)), 2) / Math.pow(p - 0.5, 2));
}
function powerPrefOneSample(p: number, n: number, alpha: number): number {
  const za = normInv(1 - alpha / 2);
  return normCdf((Math.abs(p - 0.5) - za * Math.sqrt(0.25 / n)) / Math.sqrt((p * (1 - p)) / n));
}

type IlRun = { id: Exclude<RankerId, "R0">; n: number; x: number; daily: number[]; dailyN: number[] };

function ilRun(d: DesignP1, credit: "play_start" | "qualified_play_10min", seed: number, noise: boolean): IlRun[] {
  const cands = uniqueCands(d);
  const n = d.il_members_per_pair!;
  const days = d.il_days!;
  const bias = d.il_scheme === "balanced_fixed_first" ? CALIB.positionBias : 0;
  return cands.map((id) => {
    const t = TRUTH[id];
    const pi = (credit === "play_start" ? t.ilStart : t.ilQualified) + bias;
    const daily: number[] = [];
    const dailyN: number[] = [];
    for (let day = 1; day <= days; day++) {
      const nd = Math.round((n * day) / days) - Math.round((n * (day - 1)) / days);
      const z = noise ? crnZ(seed, { case: "netflix", phase: "p1", period: day, segment: `il_${credit}`, arm: id, metric: `pref${SALT.il}` }) : 0;
      const x = Math.min(nd, Math.max(0, Math.round(nd * pi + Math.sqrt(nd * pi * (1 - pi)) * z)));
      daily.push(x);
      dailyN.push(nd);
    }
    return { id, n: dailyN.reduce((s, v) => s + v, 0), x: daily.reduce((s, v) => s + v, 0), daily, dailyN };
  });
}

function ilCompare(run: IlRun): Comparison {
  const p = run.x / run.n;
  const se = Math.sqrt((p * (1 - p)) / run.n);
  const se0 = Math.sqrt(0.25 / run.n);
  const r = compareDiff(0.5, p, se, ALPHA, se0);
  return { vs: "A", arm: "B", d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: r.p < ALPHA, method: "선호도 − 0.5 (이항 z 검정)" };
}

function simulateInterleaving(d: DesignP1, opts: SimOptions): Readout {
  const seed = opts.seed ?? SEED;
  const noise = opts.noise ?? true;
  const withTruth = opts.withTruth ?? true;
  const credit = d.il_credit!;
  const other = credit === "play_start" ? "qualified_play_10min" : "play_start";
  const run = ilRun(d, credit, seed, noise);
  const comps = run.map(ilCompare);
  const sig = sigFlags(comps.map((c) => c.p), ALPHA, d.correction);
  comps.forEach((c, i) => { c.significant = sig[i]; });

  const metrics: MetricResult[] = run.map((r, i) => ({
    key: `pref_${r.id}`, label: `${r.id} 선호도 (R0 대비)`, role: "P", type: "prop",
    arms: { A: { n: r.n, x: r.n - r.x }, B: { n: r.n, x: r.x } }, comparisons: [comps[i]],
  }));

  const altRun = ilRun(d, other, seed, noise);
  const altComps = altRun.map(ilCompare);
  const altSig = sigFlags(altComps.map((c) => c.p), ALPHA, d.correction);

  const days = d.il_days!;
  const cum = (r: IlRun) => {
    let x = 0, n = 0;
    return r.daily.map((v, i) => { x += v; n += r.dailyN[i]; return x / n; });
  };
  const m = run.length;
  const aEff = alphaEff(d.correction, m);
  const needed = ssPrefOneSample(0.52, aEff, PLAN_POWER);
  const achievedPower = withTruth ? powerPrefOneSample(0.52, run[0].n, aEff) : undefined;

  const flags: Flag[] = [];
  if (credit === "play_start") flags.push("GOODHART");
  if (d.il_scheme === "balanced_fixed_first") flags.push("POSITION_BIAS");
  if (d.correction === "none" && m >= 3) flags.push("MULTIPLE_TESTING");
  if (achievedPower !== undefined && achievedPower < 0.5) flags.push("UNDERPOWERED");

  const panels: Record<string, unknown> = {
    meta: { method: "interleaving", scheme: d.il_scheme, credit, members_per_pair: run[0].n, days, correction: d.correction, candidates: run.map((r) => r.id) },
    daily_pref: { days, rows: run.map((r) => ({ id: r.id, cum: cum(r), final: r.x / r.n })) },
    // 귀속을 바꿔서 본 같은 후보들의 선호. UI 에서는 "다른 기준으로 보기" 토글 뒤에 둔다(조가 직접 의심해야 발견).
    alt_credit: {
      credit: other,
      rows: altRun.map((r, i) => ({ id: r.id, pref: r.x / r.n, p: altComps[i].p, significant: altSig[i], ci: altComps[i].ci.map((v) => v + 0.5) })),
    },
    sample_note: { neededPerPair: needed, perPair: run[0].n, reference: "선호도 0.52 를 80% 검정력으로 잡는 데 필요한 쌍당 멤버 수(보정 유의수준 반영)" },
  };
  if (withTruth) {
    panels._truth = {
      note: "진짜 선호(귀속별)와 편향. 조 화면에 보내지 않는다.",
      pi: Object.fromEntries(run.map((r) => [r.id, { qualified: TRUTH[r.id].ilQualified, start: TRUTH[r.id].ilStart }])),
      positionBias: d.il_scheme === "balanced_fixed_first" ? CALIB.positionBias : 0,
    };
  }

  return {
    caseKey: "netflix", phase: "p1", designHash: designHash("netflix", "p1", d), periods: [],
    srm: { counts: [run[0].n, run[0].n], ratios: [1, 1], p: srm([run[0].n, run[0].n], [1, 1]).p },
    metrics, planned: { nPerArm: needed, days }, achievedPower, panels, flags,
  };
}

function simulateAbn(d: DesignP1, opts: SimOptions): Readout {
  const seed = opts.seed ?? SEED;
  const noise = opts.noise ?? true;
  const withTruth = opts.withTruth ?? true;
  const cands = uniqueCands(d);
  const m = cands.length;
  const arms = m + 1;
  const W = d.abn_weeks!;
  const primary = d.abn_primary!;
  if (primary === "retention" && W < 4) throw new SimulationRejected("28일 리텐션은 최소 4주는 지켜봐야 알 수 있어요. 기간을 4주 이상으로 늘려주세요.");
  const nArm = Math.floor((MEMBERS * d.abn_fraction!) / arms);
  const z = (id: string) => (noise ? crnZ(seed, { case: "netflix", phase: "p1", period: "abn", segment: primary, arm: id, metric: `${primary}${SALT.ab}` }) : 0);
  const zA = z("R0");

  const metrics: MetricResult[] = [];
  const comps: Comparison[] = [];
  if (primary === "hours") {
    const sd = RAW_WEEK_SD * windowFactor(W);
    const se1 = sd / Math.sqrt(nArm);
    for (const id of cands) {
      const eff = TRUTH[id].hours + noveltyAvg(id, 1, 7 * W);
      const mA = HOURS_MEAN_EXACT + se1 * zA;
      const mB = HOURS_MEAN_EXACT * (1 + eff) + se1 * z(id);
      const r = meanTest({ m: mA, sd, n: nArm }, { m: mB, sd, n: nArm }, ALPHA);
      comps.push({ vs: "A", arm: "B", d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: r.p < ALPHA, method: "평균 차이 · Welch" });
      metrics.push({ key: `hours_${id}`, label: `${id} 주간 시청 시간 (R0 대비)`, role: "P", type: "mean", arms: { A: { n: nArm, mean: mA, sd }, B: { n: nArm, mean: mB, sd } }, comparisons: [comps[comps.length - 1]] });
    }
  } else {
    const sdp = Math.sqrt(RETENTION * (1 - RETENTION) / nArm);
    for (const id of cands) {
      const pA = RETENTION + sdp * zA;
      const pB = RETENTION + retentionObserved(id, W) + sdp * z(id);
      const r = propTest({ x: Math.round(pA * nArm), n: nArm }, { x: Math.round(pB * nArm), n: nArm }, ALPHA);
      comps.push({ vs: "A", arm: "B", d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: r.p < ALPHA, method: "비율 z 검정" });
      metrics.push({
        key: `retention_${id}`, label: `${id} 28일 리텐션 (R0 대비)`, role: "P", type: "prop",
        arms: { A: { n: nArm, x: Math.round(pA * nArm) }, B: { n: nArm, x: Math.round(pB * nArm) } }, comparisons: [comps[comps.length - 1]],
      });
    }
  }
  const sig = sigFlags(comps.map((c) => c.p), ALPHA, d.correction);
  comps.forEach((c, i) => { c.significant = sig[i]; });

  // 계획: 1% 시청 시간 효과(또는 +0.15%p 리텐션 효과)를 잡는 데 필요한 그룹당 표본
  const aEff = alphaEff(d.correction, m);
  const sdW = RAW_WEEK_SD * windowFactor(W);
  const needed = primary === "hours" ? ssMean(sdW, 0.01 * HOURS_MEAN, aEff, PLAN_POWER) : ssProp(RETENTION, RETENTION + 0.0015, aEff, PLAN_POWER);
  const refPower = primary === "hours"
    ? powerMean(sdW, 0.01 * HOURS_MEAN, nArm, aEff)
    : powerProp(RETENTION, 0.0015 * Math.min(1, W / CALIB.retentionRampWeeks), nArm, aEff);
  const achievedPower = withTruth ? refPower : undefined;

  const flags: Flag[] = [];
  if (achievedPower !== undefined && achievedPower < 0.5) flags.push("UNDERPOWERED");
  if (d.correction === "none" && m >= 3) flags.push("MULTIPLE_TESTING");

  const panels: Record<string, unknown> = {
    meta: { method: "abn_all", primary, groups: arms, per_group: nArm, weeks: W, fraction: d.abn_fraction, correction: d.correction, candidates: cands },
    power_note: {
      perGroup: nArm,
      neededPerGroup: needed,
      neededTotalMembers: needed * arms,
      referenceEffect: primary === "hours" ? "주간 시청 시간 +1%" : "28일 리텐션 +0.15%p",
      minWeeks: primary === "retention" ? 4 : 1,
    },
  };
  return {
    caseKey: "netflix", phase: "p1", designHash: designHash("netflix", "p1", d), periods: [],
    metrics, planned: { nPerArm: needed, days: W * 7 }, achievedPower, panels, flags,
  };
}

export function simulateScreening(d: DesignP1, opts: SimOptions = {}): Readout {
  return d.method === "interleaving" ? simulateInterleaving(d, opts) : simulateAbn(d, opts);
}
