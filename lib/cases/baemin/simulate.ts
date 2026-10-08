/**
 * 배민 시뮬레이션 엔진 (docs/cases/baemin.md §3~§4).
 * 같은 (설계, 시드)면 항상 같은 Readout. 노이즈는 공통 난수(CRN)라서 설계가 달라도 같은 날·세그먼트·그룹의 노이즈는 공유된다.
 */
import { SimulationRejected } from "../types";
import {
  binomialCount, combineStrata, crnZ, designHash, groupMean, meanTest, obfBoundary, powerMean, powerProp, propTest, sigFlags, srm,
  ssMean, ssProp,
  type Arm, type Comparison, type Flag, type MetricResult, type PeriodRow, type Readout,
} from "@/lib/sim/core";
import { CALIB, ZERO_EFFECT, scaleEffect, trueEffect, type Effect } from "./effects";
import {
  ABANDON, AOV, AOV_SD, CART_ADD, CRASH, DAILY_INFLOW, GMV_SD, HEAVY_ABANDON, INFLOW_NOISE, NEAR_MIN, PROMO, REPURCHASE7, SEED,
  SEGMENTS, SURFACE_STORE_HOME_MULT, TRIGGER, TYPE_KEYS, VIRTUAL, WEEKDAY_MULT, WEEKEND_ABANDON, WEEKEND_CART, isPromo, isWeekend,
} from "./population";
import { designUnion, type Design, type MetricKey, type SimPhase } from "./schema";

export type SimOptions = {
  seed?: number;
  /** false 면 모든 노이즈를 0 으로 둔 기댓값 경로(검정력·진짜 효과 계산용) */
  noise?: boolean;
  /** false 면 진짜 효과·계획 표본·달성 검정력 계산을 건너뛴다(A/A 반복처럼 빠르게 돌릴 때) */
  withTruth?: boolean;
  /** simpson_demo: 주문전환율 진짜 효과 -0.4%p 로 두는 함정 연구소/검증용 모드 */
  mode?: "normal" | "simpson_demo";
};

// ───────────────────────── 집계 ─────────────────────────

type Agg = {
  users: number; planned: number; cart: number; orders: number; abandoned: number; amount: number;
  near: number; crash: number; repurchase: number; cs: number; minReach: number; load: number; bar: number;
};
const AGG_KEYS = ["users", "planned", "cart", "orders", "abandoned", "amount", "near", "crash", "repurchase", "cs", "minReach", "load", "bar"] as const;
const emptyAgg = (): Agg => ({ users: 0, planned: 0, cart: 0, orders: 0, abandoned: 0, amount: 0, near: 0, crash: 0, repurchase: 0, cs: 0, minReach: 0, load: 0, bar: 0 });
const addInto = (t: Agg, s: Agg) => { for (const k of AGG_KEYS) t[k] += s[k]; };

type Stat = { n: number; x?: number; mean?: number; sd?: number };

const METRICS: Record<MetricKey, { label: string; type: "prop" | "mean"; stat: (a: Agg) => Stat }> = {
  abandon: { label: "장바구니 이탈률", type: "prop", stat: (a) => ({ n: a.cart, x: a.abandoned }) },
  conv: { label: "커머스 주문전환율", type: "prop", stat: (a) => ({ n: a.users, x: a.orders }) },
  aov: { label: "평균주문금액(원)", type: "mean", stat: (a) => ({ n: a.orders, mean: a.orders ? a.amount / a.orders : 0, sd: AOV_SD }) },
  gmv: { label: "인당 거래액(원)", type: "mean", stat: (a) => ({ n: a.users, mean: a.users ? a.amount / a.users : 0, sd: GMV_SD }) },
  near_min_share: { label: "최소주문금액 +2천 원 이내 주문 비중", type: "prop", stat: (a) => ({ n: a.orders, x: a.near }) },
  bar_click: { label: "바 클릭률(장바구니 사용자 중)", type: "prop", stat: (a) => ({ n: a.cart, x: a.bar }) },
  crash: { label: "앱 크래시율", type: "prop", stat: (a) => ({ n: a.users, x: a.crash }) },
  load_time: { label: "로딩 시간(ms)", type: "mean", stat: (a) => ({ n: a.users, mean: a.users ? a.load / a.users : 0, sd: VIRTUAL.loadSdMs }) },
  repurchase7: { label: "7일 재구매율(주문자 중)", type: "prop", stat: (a) => ({ n: a.orders, x: a.repurchase }) },
  cs_rate: { label: "고객 문의율(주문 대비)", type: "prop", stat: (a) => ({ n: a.orders, x: a.cs }) },
  min_reach: { label: "최소주문금액 도달률(장바구니 사용자 중)", type: "prop", stat: (a) => ({ n: a.cart, x: a.minReach }) },
};

type Data = {
  days: number;
  arms: Arm[];
  /** 키: `${arm}|all`, `${arm}|type:*`, `${arm}|os:*`, p3 는 `${arm}|trig`, `${arm}|non`. 값은 일차 순서 배열 */
  daily: Record<string, Agg[]>;
  /** 일별 계획 사용자 수(버그 반영 전)와 계획 배정비 */
  plannedTotal: number[];
  shares: Record<string, number>[];
};

// ───────────────────────── 설계 → 규칙 ─────────────────────────

const UNIT_EFFECT_SCALE = { user: 1, session: 0.55, pageview: 0.3 } as const;
const UNIT_SE_SCALE = { user: 1, session: 1 / 1.5, pageview: 1 / 2 } as const;

function armsOf(d: Design): Arm[] {
  if (d.phase === "p4") return (["A", "B", "C"] as const).filter((a) => d.arms.includes(a));
  return ["A", "B"];
}

/** 일자별 계획 배정비. 10_week1_50_week2 는 B 가 1~7일 10%, 8일~ 50% (나머지는 A) */
function armShares(d: Design, arms: Arm[], day: number): Record<string, number> {
  if (d.ramp === "10_week1_50_week2" && arms.length === 2) {
    const b = day <= 7 ? 0.1 : 0.5;
    return { A: 1 - b, B: b };
  }
  return Object.fromEntries(arms.map((a) => [a, 1 / arms.length]));
}

/** 10_50_100: B 에 배정된 사용자 중 실제로 바를 보는 비율(나머지는 대조군처럼 행동) */
const exposure = (d: Design, day: number) => (d.ramp === "10_50_100" ? (day === 1 ? 0.1 : day === 2 ? 0.5 : 1) : 1);

const sameShares = (a: Record<string, number>, b: Record<string, number>) =>
  Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => k in b && Math.abs(a[k] - b[k]) < 1e-9);

/** 계획 배정비가 같은 연속 일차끼리 묶는다(층). 층화 분석과 SIMPSON_RISK 판단에 쓴다. */
export function strataOf(shares: Record<string, number>[], days: number[]): number[][] {
  const out: number[][] = [];
  let prev: Record<string, number> | null = null;
  for (const day of days) {
    const cur = shares[day - 1];
    if (prev && sameShares(prev, cur)) out[out.length - 1].push(day);
    else out.push([day]);
    prev = cur;
  }
  return out;
}

export function validateDesign(input: unknown): { ok: true; design: Design } | { ok: false; message: string } {
  const parsed = designUnion.safeParse(input);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0]?.message ?? "설계 입력을 확인해 주세요." };
  const d = parsed.data;
  if (d.metrics.primary === "bar_click" && (d.phase === "p1" || d.phase === "p2")) {
    return { ok: false, message: "대조군에는 바가 없어 비교할 수 없어요" };
  }
  return { ok: true, design: d };
}

// ───────────────────────── 데이터 생성 ─────────────────────────

const clamp01 = (x: number) => Math.min(0.999, Math.max(0.001, x));

/** 노이즈가 있으면 정규근사 이항 카운트, 없으면(기댓값 경로) 반올림 없는 n·p */
type Counter = (n: number, p: number, z: number) => number;

type CellIn = {
  n: number; planned: number; cartP: number; abP: number; aov: number; nearP: number; crashP: number; barP: number;
  z: (metric: string) => number;
  count: Counter;
};

function genCell(c: CellIn): Agg {
  const binomialCount = c.count;
  const cart = binomialCount(c.n, c.cartP, c.z("cart"));
  const abandoned = binomialCount(cart, c.abP, c.z("abandon"));
  const orders = cart - abandoned;
  const aovMean = groupMean(c.aov, AOV_SD, Math.max(orders, 1), c.z("aov"));
  return {
    users: c.n,
    planned: c.planned,
    cart,
    orders,
    abandoned,
    amount: orders * aovMean,
    near: binomialCount(orders, c.nearP, c.z("near")),
    crash: binomialCount(c.n, c.crashP, c.z("crash")),
    repurchase: binomialCount(orders, REPURCHASE7, c.z("repurchase")),
    cs: binomialCount(orders, VIRTUAL.csRate, c.z("cs")),
    minReach: binomialCount(cart, VIRTUAL.minReach, c.z("minReach")),
    load: c.n * groupMean(VIRTUAL.loadMeanMs, VIRTUAL.loadSdMs, Math.max(c.n, 1), c.z("load")),
    bar: binomialCount(cart, c.barP, c.z("bar")),
  };
}

function generate(d: Design, o: Required<Pick<SimOptions, "seed" | "noise" | "mode">>): Data {
  const arms = armsOf(d);
  const aa = d.aa === true;
  const demo = o.mode === "simpson_demo";
  const segs = SEGMENTS.filter((s) => d.scope.os === "all" || s.os === "android");
  const surface = d.scope.surface === "store_home" ? SURFACE_STORE_HOME_MULT : 1;
  const unitK = UNIT_EFFECT_SCALE[d.unit];
  const bug = d.phase === "p2" && !d.qa_old_ios && !aa;
  const trigShare = d.phase === "p3" ? TRIGGER.share[d.coupon_ops] : 0;

  const count: Counter = o.noise ? binomialCount : (n, p) => n * p;
  const zf = (day: number, segment: string, arm: string) => (metric: string) =>
    o.noise ? crnZ(o.seed, { case: "baemin", phase: d.phase, period: day, segment, arm, metric }) : 0;

  const daily: Record<string, Agg[]> = {};
  const push = (key: string, day: number, a: Agg) => {
    const arr = (daily[key] ??= Array.from({ length: d.duration_days }, emptyAgg));
    addInto(arr[day - 1], a);
  };
  for (const a of arms) for (const k of ["all", ...TYPE_KEYS.map((t) => `type:${t}`), "os:android", "os:ios_new", "os:ios_old", ...(d.phase === "p3" ? ["trig", "non"] : [])]) {
    daily[`${a}|${k}`] = Array.from({ length: d.duration_days }, emptyAgg);
  }

  const plannedTotal: number[] = [];
  const shares: Record<string, number>[] = [];

  for (let day = 1; day <= d.duration_days; day++) {
    const inflow = DAILY_INFLOW * WEEKDAY_MULT[(day - 1) % 7] * (1 + INFLOW_NOISE * zf(day, "*", "*")("users")) * surface * d.allocation;
    const sh = armShares(d, arms, day);
    shares.push(sh);
    let dayPlanned = 0;
    const f = exposure(d, day);
    const weekend = isWeekend(day);
    const promo = isPromo(day);

    for (const seg of segs) {
      const N = o.noise ? Math.round(inflow * seg.share) : inflow * seg.share;
      dayPlanned += N;

      // 그룹 분할(이항 노이즈). 마지막 그룹은 나머지.
      const counts: Record<string, number> = {};
      let remain = N;
      let remainShare = 1;
      arms.forEach((a, i) => {
        if (i === arms.length - 1) counts[a] = remain;
        else {
          const take = count(remain, sh[a] / remainShare, zf(day, seg.key, a)("split"));
          counts[a] = take;
          remain -= take;
          remainShare -= sh[a];
        }
      });

      const cartBase = CART_ADD[seg.type] + (weekend ? WEEKEND_CART : 0) + (promo ? PROMO.cart : 0);
      const abBase = ABANDON[seg.type] + (weekend ? WEEKEND_ABANDON : 0) + (seg.act === "heavy" ? HEAVY_ABANDON : 0) + (promo ? PROMO.abandon : 0);

      for (const arm of arms) {
        const planned = counts[arm];
        let n = planned;
        const eff: Effect = aa
          ? ZERO_EFFECT
          : scaleEffect(trueEffect({ phase: d.phase, arm, day, type: seg.type, os: seg.os, cartRate: cartBase, simpsonDemo: demo }), (arm === "A" ? 1 : f) * unitK);

        let cartP = cartBase;
        let abP = abBase + eff.abandon;
        let crashP = CRASH[seg.os] + eff.crash;
        if (bug && arm !== "A" && seg.os === "ios_old") {
          if (d.count_basis === "exposure") {
            // 첫 화면 로그 전에 크래시한 사용자가 B 에서 사라진다(SRM). 남은 사용자는 생존자 편향.
            n = o.noise ? Math.round(planned * (1 - CALIB.p2.bug.crashShare)) : planned * (1 - CALIB.p2.bug.crashShare);
            abP += CALIB.p2.bug.survivorAbandon;
          } else {
            // 배정 기준: 사용자는 남지만 크래시한 사용자는 장바구니에 닿지 못하고 크래시로 집계된다.
            cartP *= 1 - CALIB.p2.bug.crashShare;
            crashP = 1 - (1 - crashP) * (1 - CALIB.p2.bug.crashShare);
          }
        }

        const base = {
          nearP: clamp01(NEAR_MIN[seg.type] + eff.nearMin),
          crashP: clamp01(crashP),
          barP: VIRTUAL.barClick[seg.type],
        };
        const cells: { agg: Agg; tag?: "trig" | "non" }[] = [];
        if (d.phase === "p3") {
          // 트리거 사용자: 장바구니에 담은 상태, 담은 뒤 주문 비율 0.50 (B 는 +0.023), 평균주문금액 29,400 (B 는 +6.1%)
          const nt = count(n, trigShare, zf(day, seg.key, arm)("trigger"));
          const pl = planned * (n ? nt / n : 0);
          cells.push({
            tag: "trig",
            agg: genCell({
              n: nt, planned: pl, cartP: TRIGGER.cartRate, abP: clamp01(1 - TRIGGER.baseConv + eff.trigAbandon),
              aov: TRIGGER.baseAov * (1 + eff.trigAovRel), ...base, z: zf(day, `${seg.key}#t`, arm), count,
            }),
          });
          cells.push({
            tag: "non",
            agg: genCell({
              n: n - nt, planned: planned - pl, cartP: clamp01(cartP), abP: clamp01(abP), aov: AOV[seg.type] * (1 + eff.aovRel), ...base,
              z: zf(day, `${seg.key}#n`, arm), count,
            }),
          });
        } else {
          cells.push({
            agg: genCell({
              n, planned, cartP: clamp01(cartP), abP: clamp01(abP), aov: AOV[seg.type] * (1 + eff.aovRel), ...base, z: zf(day, seg.key, arm), count,
            }),
          });
        }
        for (const { agg, tag } of cells) {
          push(`${arm}|all`, day, agg);
          push(`${arm}|type:${seg.type}`, day, agg);
          push(`${arm}|os:${seg.os}`, day, agg);
          if (tag) push(`${arm}|${tag}`, day, agg);
        }
      }
    }
    plannedTotal.push(dayPlanned);
  }
  return { days: d.duration_days, arms, daily, plannedTotal, shares };
}

// ───────────────────────── 분석 ─────────────────────────

function sumDays(arr: Agg[] | undefined, days: number[]): Agg {
  const t = emptyAgg();
  if (arr) for (const day of days) addInto(t, arr[day - 1]);
  return t;
}

function compare(m: MetricKey, a: Stat, b: Stat, alpha: number, seScale: number) {
  return METRICS[m].type === "prop"
    ? propTest({ x: a.x ?? 0, n: a.n }, { x: b.x ?? 0, n: b.n }, alpha, seScale)
    : meanTest({ m: a.mean ?? 0, sd: a.sd ?? 0, n: a.n }, { m: b.mean ?? 0, sd: b.sd ?? 0, n: b.n }, alpha, seScale);
}

/** 대조군에 바가 없는 단계에서는 bar_click 을 A 에서 정의할 수 없다 */
const hasBar = (phase: SimPhase, arm: Arm) => phase === "p3" || phase === "p4" || arm !== "A";

export function simulateBaemin(input: unknown, opts: SimOptions = {}): Readout {
  const v = validateDesign(input);
  if (!v.ok) throw new SimulationRejected(v.message);
  const d = v.design;
  const o = { seed: opts.seed ?? SEED, noise: opts.noise ?? true, mode: opts.mode ?? "normal" } as const;
  const withTruth = opts.withTruth ?? true;

  const data = generate(d, o);
  const { arms } = data;
  const seScale = UNIT_SE_SCALE[d.unit];
  const alpha = d.alpha;
  const included = Array.from({ length: d.duration_days }, (_, i) => i + 1);
  const K = included.length;
  const primary = d.metrics.primary;
  const treat = arms.filter((a) => a !== "A");

  // ── 중간 확인 규칙: 포함된 일차마다 누적 검정(첫 처치군 vs 대조군) ──
  let stopIdx = K - 1;
  const cumA = emptyAgg();
  const cumT = emptyAgg();
  if (d.stopping !== "fixed") {
    for (let i = 0; i < K; i++) {
      addInto(cumA, data.daily["A|all"][included[i] - 1]);
      addInto(cumT, data.daily[`${treat[0]}|all`][included[i] - 1]);
      const sa = METRICS[primary].stat(cumA);
      const sb = METRICS[primary].stat(cumT);
      if (sa.n === 0 || sb.n === 0) continue;
      const r = compare(primary, sa, sb, alpha, seScale);
      const hit = d.stopping === "peek_stop" ? r.p < alpha : Math.abs(r.z) >= obfBoundary(i + 1, K, alpha);
      if (hit) { stopIdx = i; break; }
    }
  }
  const win = included.slice(0, stopIdx + 1);
  const stoppedDay = win[win.length - 1];
  const allDaysToStop = Array.from({ length: stoppedDay }, (_, i) => i + 1);

  const arr = (key: string) => data.daily[key];
  const armAgg = (arm: Arm, group = "all", days = win) => sumDays(arr(`${arm}|${group}`), days);
  const statOf = (m: MetricKey, a: Agg) => METRICS[m].stat(a);

  // ── 지표 목록(메인 > 가드레일 > 보조, 중복 제거) ──
  const roles = new Map<MetricKey, "P" | "G" | "S">();
  roles.set(primary, "P");
  for (const m of d.metrics.guardrails) if (!roles.has(m)) roles.set(m, "G");
  for (const m of d.metrics.secondary) if (!roles.has(m)) roles.set(m, "S");

  const metricList: { key: MetricKey; role: "P" | "G" | "S"; stats: Partial<Record<Arm, Stat>> }[] = [];
  for (const [key, role] of roles) {
    const stats: Partial<Record<Arm, Stat>> = {};
    for (const a of arms) if (key !== "bar_click" || hasBar(d.phase, a)) stats[a] = statOf(key, armAgg(a));
    metricList.push({ key, role, stats });
  }

  // 층: 계획 배정비가 같은 연속 일차. stratified 이고 층이 둘 이상일 때만 층별로 비교해 합친다.
  const strata = strataOf(data.shares, win);
  const useStrata = d.analysis_mode === "stratified" && strata.length > 1;
  const stratifiedCompare = (key: MetricKey, arm: Arm) => {
    const parts = strata.flatMap((days) => {
      const sa = statOf(key, armAgg("A", "all", days));
      const sb = statOf(key, armAgg(arm, "all", days));
      return sa.n === 0 || sb.n === 0 ? [] : [compare(key, sa, sb, alpha, seScale)];
    });
    return parts.length ? combineStrata(parts, alpha) : null;
  };

  // 비교(처치군 vs 대조군)와 다중검정 보정
  type Pending = { mi: number; arm: Arm; r: ReturnType<typeof compare> };
  const pending: Pending[] = [];
  metricList.forEach((m, mi) => {
    const sa = m.stats.A;
    for (const arm of treat) {
      const sb = m.stats[arm];
      if (!sa || !sb || sa.n === 0 || sb.n === 0) continue;
      const r = useStrata ? stratifiedCompare(m.key, arm) : compare(m.key, sa, sb, alpha, seScale);
      if (r) pending.push({ mi, arm, r });
    }
  });
  const correction = d.phase === "p4" ? d.correction : "none";
  let sig: boolean[];
  if (d.stopping === "sequential") {
    const bound = obfBoundary(stopIdx + 1, K, alpha);
    sig = pending.map((p) => Math.abs(p.r.z) >= bound);
  } else {
    sig = sigFlags(pending.map((p) => p.r.p), alpha, correction);
  }
  const method = (m: MetricKey) =>
    `${METRICS[m].type === "prop" ? "비율 z 검정" : "평균 t(z) 검정"}${d.stopping === "sequential" ? " · 순차(OBF)" : ""}${correction !== "none" ? ` · ${correction === "bh" ? "BH" : "Bonferroni"} 보정` : ""}${d.unit !== "user" ? ` · ${d.unit} 단위 SE` : ""}${useStrata ? " · 층화(배정 비율이 같은 기간별) 합산" : ""}`;

  const metrics: MetricResult[] = metricList.map((m, mi) => {
    const comparisons: Comparison[] = pending
      .map((p, pi) => ({ p, pi }))
      .filter(({ p }) => p.mi === mi)
      .map(({ p, pi }) => ({
        vs: "A" as Arm, arm: p.arm, d: p.r.d, ci: p.r.ci, rel: p.r.rel, relCi: p.r.relCi, p: p.r.p, win: p.r.win,
        significant: sig[pi], method: method(m.key),
      }));
    return {
      key: m.key, label: METRICS[m.key].label, role: m.role, type: "prop" === METRICS[m.key].type ? "prop" : "mean",
      arms: m.stats as MetricResult["arms"], comparisons,
    };
  });

  // ── SRM: 계획 배정비 대비 관측 사용자 수 ──
  const counts = arms.map((a) => armAgg(a).users);
  const expected = arms.map((a) => win.reduce((s, day) => s + data.plannedTotal[day - 1] * data.shares[day - 1][a], 0));
  const srmRes = srm(counts, expected);

  // ── 일별 행 ──
  const periods: PeriodRow[] = allDaysToStop.map((day) => ({
    period: day,
    arms: Object.fromEntries(
      arms.map((a) => {
        const g = data.daily[`${a}|all`][day - 1];
        return [a, { users: g.users, cart: g.cart, orders: g.orders, abandoned: g.abandoned }];
      }),
    ),
  }));

  // ── 패널(조 화면에 보이는 데이터) ──
  const cmpPanel = (m: MetricKey, a: Agg, b: Agg) => {
    const sa = statOf(m, a);
    const sb = statOf(m, b);
    if (sa.n === 0 || sb.n === 0) return { arms: { A: sa, B: sb } };
    const r = compare(m, sa, sb, alpha, seScale);
    return { arms: { A: sa, B: sb }, d: r.d, ci: r.ci, rel: r.rel, p: r.p, significant: r.p < alpha };
  };
  const panels: Record<string, unknown> = {};
  // 주차별(심슨의 역설 발견용)
  const weeks = Math.ceil(stoppedDay / 7);
  panels.weekly = Array.from({ length: weeks }, (_, w) => {
    const days = allDaysToStop.filter((day) => Math.ceil(day / 7) === w + 1);
    const bShare = days.length ? data.shares[days[0] - 1]["B"] : 0;
    return {
      week: w + 1,
      bShare,
      conv: cmpPanel("conv", armAgg("A", "all", days), armAgg("B", "all", days)),
      [primary]: cmpPanel(primary, armAgg("A", "all", days), armAgg("B", "all", days)),
    };
  });
  // 고객 유형별 세그먼트 표
  panels.segments = Object.fromEntries(
    TYPE_KEYS.map((t) => [
      t,
      Object.fromEntries((["abandon", "conv", "aov", "near_min_share"] as MetricKey[]).map((m) => [m, cmpPanel(m, armAgg("A", `type:${t}`), armAgg("B", `type:${t}`))])),
    ]),
  );
  // OS 별 사용자 수와 크래시 (SRM 원인 조사용 데이터)
  panels.byOs = Object.fromEntries(
    (["android", "ios_new", "ios_old"] as const).map((os) => [
      os,
      Object.fromEntries(arms.map((a) => { const g = armAgg(a, `os:${os}`); return [a, { users: g.users, crash: g.crash }]; })),
    ]),
  );
  if (d.phase === "p3") {
    const trig: Record<string, unknown> = {};
    const bT = armAgg("B", "trig");
    const bN = armAgg("B", "non");
    trig.biased = { exposed: statOf("conv", bT), unexposed: statOf("conv", bN), conv: cmpPanel("conv", bN, bT), aov: cmpPanel("aov", bN, bT) };
    if (d.trigger_logging) {
      const aT = armAgg("A", "trig");
      trig.counterfactual = { conv: cmpPanel("conv", aT, bT), aov: cmpPanel("aov", aT, bT), n: { A: aT.users, B: bT.users } };
    }
    panels.trigger = trig;
  }

  // ── 진짜 효과 · 계획 표본 · 달성 검정력 (기댓값 경로) ──
  let planned: Readout["planned"];
  let achievedPower: number | undefined;
  let truth: Record<string, unknown> | undefined;
  if (withTruth) {
    const t0 = generate(d, { ...o, noise: false });
    const tAgg = (arm: Arm, days: number[]) => sumDays(t0.daily[`${arm}|all`], days);
    const A = tAgg("A", win);
    const sA = statOf(primary, A);
    const dailyUsers = tAgg("A", included).users / included.length;
    // 계획 표본: 메인 지표 기준 (비율은 절대 %p, 금액·시간 지표는 상대 %)
    const fullA = statOf(primary, tAgg("A", included));
    const perUser = fullA.n / tAgg("A", included).users;
    let nDenom: number;
    let mdeAbs: number;
    if (METRICS[primary].type === "prop") {
      const p1 = (fullA.x ?? 0) / fullA.n;
      mdeAbs = d.mde_pp / 100;
      const p2 = p1 - mdeAbs > 0 ? p1 - mdeAbs : p1 + mdeAbs;
      nDenom = ssProp(p1, p2, alpha, d.power);
    } else {
      mdeAbs = (fullA.mean ?? 0) * (d.mde_pp / 100);
      nDenom = ssMean(fullA.sd ?? 1, mdeAbs, alpha, d.power);
    }
    const nUsers = Math.ceil(nDenom / perUser);
    // 일평균 그룹당 사용자 수 기준 일수
    const perArmPerDay = dailyUsers / arms.length;
    planned = { nPerArm: nUsers, days: Math.ceil(nUsers / perArmPerDay) };

    // 달성 검정력: 진짜 효과 기준. 진짜 효과가 0 이면 팀이 정한 MDE 기준.
    const sB = statOf(primary, tAgg(treat[0], win));
    let dTrue = METRICS[primary].type === "prop" ? (sB.x ?? 0) / sB.n - (sA.x ?? 0) / sA.n : (sB.mean ?? 0) - (sA.mean ?? 0);
    // 기댓값 경로도 정수 반올림 때문에 0 이 정확히 0 이 아니므로, 표준오차의 2% 미만이면 효과 없음으로 본다
    const seDiff = METRICS[primary].type === "prop"
      ? Math.sqrt((2 * ((sA.x ?? 0) / sA.n) * (1 - (sA.x ?? 0) / sA.n)) / sA.n)
      : Math.sqrt((2 * (sA.sd ?? 1) ** 2) / sA.n);
    if (Math.abs(dTrue) < 0.02 * seDiff) dTrue = mdeAbs;
    achievedPower = METRICS[primary].type === "prop" ? powerProp((sA.x ?? 0) / sA.n, dTrue, sA.n, alpha) : powerMean(sA.sd ?? 1, dTrue, sA.n, alpha);

    // 강사 전용: 진짜 효과 (패널 키 "_" 로 시작 → toTeamView 가 제거)
    truth = {
      note: "기댓값 경로(노이즈 없음)에서 계산한 B/C - A 의 진짜 차이. 조 화면에 보내지 않는다.",
      effects: Object.fromEntries(
        metricList.map((m) => [
          m.key,
          Object.fromEntries(
            treat.map((arm) => {
              const sa = statOf(m.key, A);
              const sb = statOf(m.key, tAgg(arm, win));
              return [arm, METRICS[m.key].type === "prop" ? (sb.x ?? 0) / sb.n - (sa.x ?? 0) / sa.n : (sb.mean ?? 0) - (sa.mean ?? 0)];
            }),
          ),
        ]),
      ),
    };
  }
  if (truth) panels._truth = truth;

  // ── 비용 ──
  const costs = d.phase === "p3" && d.coupon_ops === "high" ? { coupon_cost_krw: Math.round(armAgg("B", "trig").users * TRIGGER.couponCostKrw) } : undefined;

  // ── 플래그 (조 화면에는 내려보내지 않는다) ──
  const flags: Flag[] = [];
  if (srmRes.p < 0.001) flags.push("SRM");
  if (d.unit !== "user") flags.push("UNIT_MISMATCH");
  if (win.length < 14) flags.push("SHORT_DURATION");
  if (achievedPower !== undefined && achievedPower < 0.5) flags.push("UNDERPOWERED");
  if (d.stopping === "peek_stop") flags.push("PEEKED");
  if (d.ramp === "10_week1_50_week2" && d.analysis_mode === "pooled" && strata.length > 1) flags.push("SIMPSON_RISK");
  if (correction === "none" && pending.length >= 10) flags.push("MULTIPLE_TESTING");
  if (d.phase === "p3" && !d.trigger_logging) flags.push("SELECTION_BIAS");

  return {
    caseKey: "baemin",
    phase: d.phase,
    designHash: designHash("baemin", d.phase, d),
    periods,
    stoppedAt: stoppedDay,
    srm: { counts, ratios: expected.map((e) => e / expected.reduce((s, x) => s + x, 0)), p: srmRes.p },
    metrics,
    planned,
    achievedPower,
    panels,
    flags,
    costs,
  };
}
