/**
 * s5 결선 A/B 엔진 (docs/cases/netflix.md §2, §3-4). 그룹: A = R0(현행), B·C·D = 결선 후보(최대 3개).
 * 시청 시간 효과 = 정상 상태 효과 + 신규성(처음 7일 지수 감쇠). 리텐션은 습관 형성 때문에 경과 주 / 10 만큼만 보인다.
 * 노이즈는 (그룹, 주) 마다 독립인 표준정규를 CRN 으로 뽑고, 기간 창의 평균 오차는 그 합을 √(주 수)로 나눠 쓴다
 * → 중간 확인(peek)·순차 검정에서 창이 늘어도 같은 노이즈가 이어진다.
 */
import { SimulationRejected } from "../types";
import {
  compareDiff, crnZ, designHash, obfBoundary, powerMean, powerProp, propTest, sigFlags, srm, ssMean, ssProp,
  type Arm, type Comparison, type Flag, type MetricResult, type PeriodRow, type Readout,
} from "@/lib/sim/core";
import { asLogComparison, HOURS_MEAN_EXACT, hoursStat, RAW_WEEK_SD, whaleShare, WINSOR_CAP, type HoursTreatment, type SimOptions } from "./common";
import { noveltyAvg, retentionObserved, surrogateEffect, TRUTH, type RankerId } from "./effects";
import { MEMBERS, PLAN_ALPHA, PLAN_POWER, RETENTION, SALT, SEED, SURROGATE } from "./population";
import type { DesignP2 } from "./schema";

const ALPHA = PLAN_ALPHA;
const LETTERS: Arm[] = ["B", "C", "D"];
type Cand = Exclude<RankerId, "R0">;

/** 2분 내 이탈 비율(재생 중) 기저와 후보별 효과 (스펙: R2 는 재생 시작↑·2분 내 이탈↑. 나머지는 가상 가정) */
const EARLY_BASE = 0.27;
const EARLY_EFFECT: Record<Cand, number> = { R1: 0, R2: 0.035, R3: -0.003, R4: -0.002, R5: 0, R6: 0.004, R7: -0.001, R8: 0 };
const PLAYS_PER_MEMBER_WEEK = 0.38 * 7;

/** 비교 결과의 z (d / SE). CI 폭에서 SE 를 되돌린다. */
const zOf = (c: Comparison) => c.d / ((c.ci[1] - c.ci[0]) / (2 * 1.959964));

type Est = { id: Cand; c: Comparison; mA: number; mT: number; sd: number; n: number };

export function simulateFinals(d: DesignP2, opts: SimOptions = {}): Readout {
  const seed = opts.seed ?? SEED;
  const noise = opts.noise ?? true;
  const withTruth = opts.withTruth ?? true;
  const ids = [...new Set(d.finalists)] as Cand[];
  if (ids.length < 2) throw new SimulationRejected("결선 후보는 서로 다른 2~3개를 골라주세요.");
  const W = d.weeks;
  const ex = d.exclude_first_week;
  if (ex && W < 2) throw new SimulationRejected("첫 주를 빼면 분석할 기간이 남지 않아요. 기간을 2주 이상으로 하거나 첫 주 제외를 끄세요.");
  if (d.primary === "retention" && W < 4) throw new SimulationRejected("28일 리텐션은 최소 4주는 지켜봐야 알 수 있어요. 기간을 4주 이상으로 늘려주세요.");
  const arms = ids.length + 1;
  const nArm = Math.floor((MEMBERS * d.fraction) / arms);
  const seN = (sd: number) => sd / Math.sqrt(nArm);

  const z = (seg: string, id: string, period: number | string) =>
    noise ? crnZ(seed, { case: "netflix", phase: "p2", period, segment: seg, arm: id, metric: `${seg}${SALT.ab}` }) : 0;
  const firstWeek = ex ? 2 : 1;
  const zbar = (seg: string, id: string, k: number) => {
    let s = 0;
    for (let w = firstWeek; w <= k; w++) s += z(seg, id, w);
    return s / Math.sqrt(k - firstWeek + 1);
  };
  const treatment = d.hours_treatment as HoursTreatment;

  /** 기간 k 주까지 본 메인 지표 비교 (결선 후보마다) */
  const estimate = (k: number, tr: HoursTreatment = treatment, cuped = d.cuped): Est[] => {
    const weeks = k - firstWeek + 1;
    return ids.map((id) => {
      if (d.primary === "hours") {
        const e = TRUTH[id].hours + noveltyAvg(id, ex ? 8 : 1, 7 * k);
        const st = hoursStat(tr, e, weeks, cuped);
        const se = seN(st.sd);
        const mA = st.mA + se * zbar("hours", "R0", k);
        const mT = st.mT + se * zbar("hours", id, k);
        const r = compareDiff(mA, mT, Math.SQRT2 * se, ALPHA);
        const c: Comparison = { vs: "A", arm: "B", d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: r.p < ALPHA, method: tr === "log" ? "" : "평균 차이" };
        return { id, c: tr === "log" ? asLogComparison(c) : { ...c, method: `평균 차이${tr === "winsorize_p99" ? " · 윈저라이징(p99)" : ""}${cuped ? " · CUPED" : ""}` }, mA, mT, sd: st.sd, n: nArm };
      }
      const base = d.primary === "retention" ? RETENTION : SURROGATE;
      const eff = d.primary === "retention" ? retentionObserved(id, k) : surrogateEffect(id);
      const sdp = Math.sqrt((base * (1 - base)) / nArm);
      const key = d.primary === "retention" ? "retention" : "surrogate";
      const pA = base + sdp * z(key, "R0", "end");
      const pT = base + eff + sdp * z(key, id, "end");
      const r = propTest({ x: Math.round(pA * nArm), n: nArm }, { x: Math.round(pT * nArm), n: nArm }, ALPHA);
      const c: Comparison = { vs: "A", arm: "B", d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: r.p < ALPHA, method: "비율 z 검정" };
      return { id, c, mA: pA, mT: pT, sd: Math.sqrt(base * (1 - base)), n: nArm };
    });
  };

  // ── 중간 확인 규칙 ──
  const lookFrom = d.primary === "retention" ? Math.max(4, firstWeek) : firstWeek;
  let stop = W;
  const nLooks = W - lookFrom + 1;
  if (d.stopping !== "fixed") {
    for (let k = lookFrom; k <= W; k++) {
      const hit = estimate(k).some((e) => (d.stopping === "peek_stop" ? e.c.p < ALPHA : Math.abs(zOf(e.c)) >= obfBoundary(k - lookFrom + 1, nLooks, ALPHA)));
      if (hit) { stop = k; break; }
    }
  }
  const est = estimate(stop);
  const bound = d.stopping === "sequential" ? obfBoundary(stop - lookFrom + 1, nLooks, ALPHA) : undefined;
  const sig = bound !== undefined
    ? est.map((e) => Math.abs(zOf(e.c)) >= bound)
    : sigFlags(est.map((e) => e.c.p), ALPHA, d.correction);
  est.forEach((e, i) => { e.c.significant = sig[i]; });

  // ── 메트릭 ──
  const metrics: MetricResult[] = [];
  const armsOf = (pick: (e: Est) => { n: number; x?: number; mean?: number; sd?: number }, ctl: { n: number; x?: number; mean?: number; sd?: number }) => {
    const out: MetricResult["arms"] = { A: ctl };
    est.forEach((e, i) => { out[LETTERS[i]] = pick(e); });
    return out;
  };
  const comparisons = est.map((e, i) => ({ ...e.c, arm: LETTERS[i] }));
  if (d.primary === "hours") {
    const label = treatment === "log" ? "주간 시청 시간 (ln(1+시간) 평균)" : treatment === "winsorize_p99" ? "주간 시청 시간 (윈저라이징 p99)" : "주간 시청 시간 (원시 평균)";
    metrics.push({ key: "hours", label, role: "P", type: "mean", arms: armsOf((e) => ({ n: e.n, mean: e.mT, sd: e.sd }), { n: nArm, mean: est[0].mA, sd: est[0].sd }), comparisons });
  } else {
    const key = d.primary === "retention" ? "retention" : "surrogate_2ep";
    const label = d.primary === "retention" ? "28일 리텐션" : "7일 내 시리즈 2화 이상 시청 비율 (대리 지표)";
    metrics.push({ key, label, role: "P", type: "prop", arms: armsOf((e) => ({ n: nArm, x: Math.round(e.mT * nArm) }), { n: nArm, x: Math.round(est[0].mA * nArm) }), comparisons });
  }
  // 가드레일: 재생 중 2분 내 이탈 비율
  {
    const plays = Math.round(nArm * PLAYS_PER_MEMBER_WEEK * stop);
    const sdp = Math.sqrt((EARLY_BASE * (1 - EARLY_BASE)) / plays);
    const pA = EARLY_BASE + sdp * z("early", "R0", "all");
    const rows = ids.map((id, i) => {
      const pT = EARLY_BASE + EARLY_EFFECT[id] + sdp * z("early", id, "all");
      const r = propTest({ x: Math.round(pA * plays), n: plays }, { x: Math.round(pT * plays), n: plays }, ALPHA);
      return { id, pT, c: { vs: "A", arm: LETTERS[i], d: r.d, ci: r.ci, rel: r.rel, relCi: r.relCi, p: r.p, win: r.win, significant: r.p < ALPHA, method: "비율 z 검정" } as Comparison };
    });
    const out: MetricResult["arms"] = { A: { n: plays, x: Math.round(pA * plays) } };
    rows.forEach((r, i) => { out[LETTERS[i]] = { n: plays, x: Math.round(r.pT * plays) }; });
    metrics.push({ key: "early_exit", label: "재생 중 2분 내 이탈 비율", role: "G", type: "prop", arms: out, comparisons: rows.map((r) => r.c) });
  }

  // ── 주별 시계열 (원시 평균 시청 시간) ──
  const periods: PeriodRow[] = Array.from({ length: stop }, (_, i) => {
    const w = i + 1;
    const row = (id: RankerId) => {
      const e = TRUTH[id].hours + noveltyAvg(id, 7 * (w - 1) + 1, 7 * w);
      return { users: nArm, hours: HOURS_MEAN_EXACT * (1 + e) + seN(RAW_WEEK_SD) * z("hours", id, w) };
    };
    const armsRow: PeriodRow["arms"] = { A: row("R0") };
    ids.forEach((id, j) => { armsRow[LETTERS[j]] = row(id); });
    return { period: w, arms: armsRow };
  });

  // ── 계획 · 달성 검정력 ──
  const m = ids.length;
  const aEff = d.correction === "bonferroni" ? ALPHA / m : ALPHA;
  const weeksWin = stop - firstWeek + 1;
  let planned: Readout["planned"];
  let achievedPower: number | undefined;
  {
    if (d.primary === "hours") {
      const st = hoursStat(treatment, 0.01, weeksWin, d.cuped);
      planned = { nPerArm: ssMean(st.sd, st.mT - st.mA, ALPHA, PLAN_POWER), days: W * 7 };
    } else if (d.primary === "retention") planned = { nPerArm: ssProp(RETENTION, RETENTION + 0.0015, ALPHA, PLAN_POWER), days: W * 7 };
    else planned = { nPerArm: ssProp(SURROGATE, SURROGATE + 0.009, ALPHA, PLAN_POWER), days: W * 7 };
  }
  if (withTruth) {
    const powers = ids.map((id) => {
      if (d.primary === "hours") {
        const e = TRUTH[id].hours + noveltyAvg(id, ex ? 8 : 1, 7 * stop);
        const st = hoursStat(treatment, e, weeksWin, d.cuped);
        const dd = st.mT - st.mA;
        return { dd, p: dd === 0 ? 0 : powerMean(st.sd, dd, nArm, aEff) };
      }
      if (d.primary === "retention") {
        const dd = retentionObserved(id, stop);
        return { dd, p: dd === 0 ? 0 : powerProp(RETENTION, dd, nArm, aEff) };
      }
      const dd = surrogateEffect(id);
      return { dd, p: dd === 0 ? 0 : powerProp(SURROGATE, dd, nArm, aEff) };
    });
    const best = powers.reduce((a, b) => (Math.abs(b.dd) > Math.abs(a.dd) ? b : a));
    if (best.dd !== 0) achievedPower = best.p;
  }

  // ── 패널 ──
  const panels: Record<string, unknown> = {
    meta: { primary: d.primary, hours_treatment: treatment, cuped: d.cuped, weeks: W, stoppedAt: stop, per_group: nArm, finalists: ids, exclude_first_week: ex, correction: d.correction },
  };
  if (d.primary === "hours") {
    const raw = estimate(stop, "raw", false);
    const win = estimate(stop, "winsorize_p99", false);
    panels.tail = {
      p99_hours: WINSOR_CAP, whale_share: whaleShare(),
      rows: ids.map((id, i) => ({ id, raw: { d: raw[i].c.d, rel: raw[i].c.rel, ciWidth: raw[i].c.ci[1] - raw[i].c.ci[0] }, winsor: { d: win[i].c.d, rel: win[i].c.rel, ciWidth: win[i].c.ci[1] - win[i].c.ci[0] } })),
      note: "같은 멤버·같은 기간에서 원시 평균과 윈저라이징(p99) 평균을 비교한 값이에요(CUPED 없이).",
    };
    if (treatment === "log") panels.interpretation = { text: "로그 변환(ln(1+시간))의 평균 차이는 기하평균의 변화율이에요. 평균 시청 시간(합계 기준)의 변화와는 달라요. 시청 시간이 긴 소수의 멤버보다 보통 멤버의 변화를 더 반영해요." };
  } else if (d.primary === "retention") {
    panels.retention_power = {
      perGroup: nArm, neededPerGroup: ssProp(RETENTION, RETENTION + 0.0015, ALPHA, PLAN_POWER), referenceEffect: "28일 리텐션 +0.15%p(정상 상태)",
      note: "리텐션은 습관 형성에 시간이 걸려서, 짧은 기간에는 정상 상태 효과의 일부만 보여요.",
    };
  } else {
    panels.interpretation = { text: "시리즈 2화 이상 시청 비율은 리텐션의 대리 지표(surrogate)예요. 리텐션과 멤버 단위 상관이 0.45 정도지만, 이 지표가 오르면 리텐션이 오른다는 인과 연결은 가정이에요. 앞으로 홀드아웃으로 확인해야 해요.", correlation: 0.45 };
  }
  if (withTruth) {
    panels._truth = {
      note: "후보별 진짜 효과와 신규성. 조 화면에 보내지 않는다.",
      finalists: Object.fromEntries(ids.map((id) => [id, {
        hoursSteady: TRUTH[id].hours, noveltyAvgInWindow: noveltyAvg(id, ex ? 8 : 1, 7 * stop), retentionSteadyPp: TRUTH[id].retention * 100,
        retentionObservedPp: retentionObserved(id, stop) * 100, earlyExit: EARLY_EFFECT[id],
      }])),
    };
  }

  // ── 플래그 ──
  const flags: Flag[] = [];
  // 신규성은 시청 시간에만 얹힌다(대리 지표·리텐션에는 없음, CALIBRATION #8)
  if (d.primary === "hours" && !ex && stop < 4) flags.push("NOVELTY");
  if (d.stopping === "peek_stop") flags.push("PEEKED");
  if (d.correction === "none" && m >= 3) flags.push("MULTIPLE_TESTING");
  if (achievedPower !== undefined && achievedPower < 0.5) flags.push("UNDERPOWERED");

  return {
    caseKey: "netflix", phase: "p2", designHash: designHash("netflix", "p2", d), periods, stoppedAt: stop,
    srm: { counts: Array(arms).fill(nArm), ratios: Array(arms).fill(1), p: srm(Array(arms).fill(nArm), Array(arms).fill(1)).p },
    metrics, planned, achievedPower, panels, flags,
  };
}
