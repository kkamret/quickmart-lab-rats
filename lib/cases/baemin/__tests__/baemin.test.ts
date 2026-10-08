/**
 * 배민 사례 검증 시나리오 (docs/cases/baemin.md §5). 기대값은 문서가 진실의 원천이다.
 * 설계 칸이 비어 있는 시나리오(예: #8 의 범위·기간)는 아래 팩토리의 기본값으로 채웠다.
 */
import { describe, expect, it } from "vitest";
import { SimulationRejected } from "../../types";
import { ALL_FLAGS, toTeamView, type Readout } from "@/lib/sim/core";
import { baeminPlugin, simulateBaemin, validateDesign } from "../index";
import { SEED } from "../population";

const hyp = { action: "가게홈에서 최소금액 달성 여부를 안내해요", behavior: "장바구니를 오가지 않고 바로 주문해요", impact: "장바구니 이탈률이 줄어요" };

type D = Record<string, unknown>;
const p1 = (over: D = {}): D => ({
  phase: "p1", hypothesis: hyp, scope: { os: "android", surface: "store_home" }, unit: "user",
  metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov"] },
  alpha: 0.05, power: 0.8, duration_days: 14, allocation: 1, ramp: "none", analysis_mode: "pooled",
  stopping: "fixed", count_basis: "assignment", ...over,
});
const p2 = (over: D = {}): D =>
  p1({
    phase: "p2", scope: { os: "all", surface: "all" },
    metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov", "gmv", "near_min_share"] }, ...over,
  });
const p3 = (over: D = {}): D =>
  p1({
    phase: "p3", trigger_logging: true, coupon_ops: "low", scope: { os: "all", surface: "all" },
    metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: ["aov"] }, ...over,
  });
const p4 = (over: D = {}): D =>
  p1({
    phase: "p4", arms: ["A", "B", "C"], correction: "none", scope: { os: "all", surface: "all" },
    metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: ["aov", "gmv", "repurchase7", "cs_rate", "near_min_share", "min_reach"] },
    ...over,
  });

const metric = (r: Readout, key: string) => r.metrics.find((m) => m.key === key)!;
const cmp = (r: Readout, key: string, arm = "B") => metric(r, key).comparisons.find((c) => c.arm === arm)!;

describe("배민 검증 시나리오", () => {
  it("#1 P1, 사용자 단위, 안드로이드+가게홈, 14일, fixed", () => {
    const r = simulateBaemin(p1());
    expect(r.srm!.p).toBeGreaterThan(0.001);
    expect(r.flags).not.toContain("SRM");
    const ab = cmp(r, "abandon");
    expect(ab.significant).toBe(true);
    expect(ab.d).toBeLessThan(-0.025);
    expect(ab.d).toBeGreaterThan(-0.03);
    expect(cmp(r, "conv").significant).toBe(true);
    expect(cmp(r, "conv").d).toBeGreaterThan(0);
    expect(cmp(r, "crash").significant).toBe(false);
  });

  it("#2 7일이면 신규성 때문에 효과가 더 크게 보이고 SHORT_DURATION", () => {
    const r14 = simulateBaemin(p1());
    const r7 = simulateBaemin(p1({ duration_days: 7 }));
    expect(Math.abs(cmp(r7, "abandon").d)).toBeGreaterThan(Math.abs(cmp(r14, "abandon").d));
    expect(r7.flags).toContain("SHORT_DURATION");
    expect(r14.flags).not.toContain("SHORT_DURATION");
  });

  it("#3 세션 단위면 관측 효과가 약 절반이고 UNIT_MISMATCH", () => {
    const user = simulateBaemin(p1());
    const session = simulateBaemin(p1({ unit: "session" }));
    const ratio = cmp(session, "abandon").d / cmp(user, "abandon").d;
    expect(ratio).toBeGreaterThan(0.4);
    expect(ratio).toBeLessThan(0.7);
    expect(session.flags).toContain("UNIT_MISMATCH");
    // 분석 단위가 달라 SE 가 과소: 같은 표본인데 p 가 더 작거나 CI 가 좁다
    const wUser = cmp(user, "abandon").ci[1] - cmp(user, "abandon").ci[0];
    const wSession = cmp(session, "abandon").ci[1] - cmp(session, "abandon").ci[0];
    expect(wSession).toBeLessThan(wUser);
  });

  // 스펙은 시드 400개를 말하지만 400개로는 비율 추정 오차가 ±2%p 라서 구간 경계 근처에서 우연히 벗어난다
  // (실측: 4,000개 x 2회에서 fixed 5.0%, peek_stop 22.6%). 같은 구간을 시드 2,000개로 검사한다.
  const RUNS = 2000;
  const falsePositiveRate = (stopping: string) => {
    let fp = 0;
    for (let i = 0; i < RUNS; i++) {
      const r = simulateBaemin(p1({ aa: true, stopping }), { seed: SEED + i, withTruth: false });
      if (cmp(r, "abandon").significant) fp++;
    }
    return fp / RUNS;
  };

  it("#4 A/A + peek_stop 14일: 위양성률 15~25%", () => {
    const rate = falsePositiveRate("peek_stop");
    expect(rate).toBeGreaterThanOrEqual(0.15);
    expect(rate).toBeLessThanOrEqual(0.25);
  }, 60000);

  it("#5 A/A + fixed 14일: 위양성률 3~7%", () => {
    const rate = falsePositiveRate("fixed");
    expect(rate).toBeGreaterThanOrEqual(0.03);
    expect(rate).toBeLessThanOrEqual(0.07);
  }, 60000);

  it("#6 P2 전체, 노출 기준, 램프업 없음: SRM, B 사용자 약 7천 명 부족", () => {
    const r = simulateBaemin(p2({ count_basis: "exposure" }));
    expect(r.srm!.p).toBeLessThan(0.001);
    expect(r.flags).toContain("SRM");
    const [a, b] = r.srm!.counts;
    expect(a - b).toBeGreaterThan(6000);
    expect(a - b).toBeLessThan(8500);
    // 데이터로 원인을 추적할 수 있다: 부족분은 ios_old 의 B 에 몰려 있다
    const byOs = r.panels.byOs as Record<string, Record<string, { users: number }>>;
    expect(byOs.ios_old.A.users - byOs.ios_old.B.users).toBeGreaterThan(6000);
    expect(Math.abs(byOs.android.A.users - byOs.android.B.users)).toBeLessThan(1500);
  });

  it("#7 P2 전체, 램프업으로 시작(버그 없음): SRM 없음, 이탈·전환 개선, aov 악화, gmv 차이 없음, first_order 이탈 악화", () => {
    const r = simulateBaemin(p2({ ramp: "10_50_100" }));
    expect(r.srm!.p).toBeGreaterThan(0.001);
    expect(cmp(r, "abandon").d).toBeLessThan(0);
    expect(cmp(r, "abandon").significant).toBe(true);
    expect(cmp(r, "conv").d).toBeGreaterThan(0);
    expect(cmp(r, "conv").significant).toBe(true);
    expect(cmp(r, "aov").d).toBeLessThan(0);
    expect(cmp(r, "aov").significant).toBe(true);
    expect(cmp(r, "gmv").significant).toBe(false);
    const seg = r.panels.segments as Record<string, Record<string, { d: number; significant: boolean }>>;
    expect(seg.first_order.abandon.d).toBeGreaterThan(0); // 스펙: "악화" (유의성까지 요구하지 않는다)
    expect(seg.general.abandon.d).toBeLessThan(0);
    expect(seg.member.abandon.d).toBeLessThan(0);
  });

  it("#8 P3 coupon_ops=low, 메인 conv: 차이 없음, 달성 검정력 0.15~0.35, UNDERPOWERED", () => {
    const r = simulateBaemin(p3());
    expect(cmp(r, "conv").significant).toBe(false);
    expect(r.achievedPower!).toBeGreaterThan(0.15);
    expect(r.achievedPower!).toBeLessThan(0.35);
    expect(r.flags).toContain("UNDERPOWERED");
  });

  it("#9 P3 trigger_logging=true: 트리거 counterfactual 비교에서 conv·aov 유의 개선", () => {
    const r = simulateBaemin(p3());
    const t = r.panels.trigger as { counterfactual: Record<string, { d: number; significant: boolean }> };
    expect(t.counterfactual.conv.d).toBeGreaterThan(0);
    expect(t.counterfactual.conv.significant).toBe(true);
    expect(t.counterfactual.aov.d).toBeGreaterThan(0);
    expect(t.counterfactual.aov.significant).toBe(true);
    expect(r.flags).not.toContain("SELECTION_BIAS");
  });

  it("#10 P3 trigger_logging=false: 편향 비교만, 차이 과대(30%p 이상), SELECTION_BIAS", () => {
    const r = simulateBaemin(p3({ trigger_logging: false }));
    const t = r.panels.trigger as { biased: { conv: { d: number } }; counterfactual?: unknown };
    expect(t.counterfactual).toBeUndefined();
    expect(t.biased.conv.d).toBeGreaterThan(0.3);
    expect(r.flags).toContain("SELECTION_BIAS");
  });

  it("#11 P4 보정 없음, 보조 지표 6개 이상: C 의 aov 유의 악화, 메인 차이 없음, MULTIPLE_TESTING", () => {
    const r = simulateBaemin(p4());
    expect(metric(r, "aov").comparisons.find((c) => c.arm === "C")!.d).toBeLessThan(0);
    expect(cmp(r, "aov", "C").significant).toBe(true);
    expect(cmp(r, "conv", "B").significant).toBe(false);
    expect(cmp(r, "conv", "C").significant).toBe(false);
    expect(r.flags).toContain("MULTIPLE_TESTING");
    // 보정하면 플래그가 사라지고, aov C 의 큰 효과는 보정 후에도 남는다
    const bh = simulateBaemin(p4({ correction: "bh" }));
    expect(bh.flags).not.toContain("MULTIPLE_TESTING");
    expect(cmp(bh, "aov", "C").significant).toBe(true);
  });

  it("#12 simpson_demo: 합산하면 B 우세, 주차별로 보면 B 열세", () => {
    const r = simulateBaemin(
      p1({ ramp: "10_week1_50_week2", analysis_mode: "pooled", metrics: { primary: "conv", guardrails: ["abandon"], secondary: [] } }),
      { mode: "simpson_demo" },
    );
    expect(cmp(r, "conv").d).toBeGreaterThan(0);
    expect(cmp(r, "conv").significant).toBe(true);
    const weekly = r.panels.weekly as { week: number; conv: { d: number } }[];
    expect(weekly).toHaveLength(2);
    for (const w of weekly) expect(w.conv.d).toBeLessThan(0);
    expect(r.flags).toContain("SIMPSON_RISK");
    // 계획 배정비(10% → 50%)를 반영하므로 SRM 은 아니다
    expect(r.flags).not.toContain("SRM");
  });

  it("#13 같은 설계를 두 번 돌리면 결과가 완전히 같다", () => {
    const a = JSON.stringify(simulateBaemin(p1()));
    const b = JSON.stringify(simulateBaemin(p1()));
    expect(a).toBe(b);
    expect(JSON.stringify(simulateBaemin(p2({ count_basis: "exposure" })))).toBe(
      JSON.stringify(simulateBaemin(p2({ count_basis: "exposure" }))),
    );
  });

  it("#14 duration 만 다른 두 설계: 겹치는 날짜의 일별 집계가 같다(공통 난수)", () => {
    const short = simulateBaemin(p1({ duration_days: 7 }));
    const long = simulateBaemin(p1({ duration_days: 21 }));
    for (let i = 0; i < 7; i++) {
      expect(short.periods[i].arms.A).toEqual(long.periods[i].arms.A);
      expect(short.periods[i].arms.B).toEqual(long.periods[i].arms.B);
    }
    expect(long.periods).toHaveLength(21);
  });
});

describe("설계 검증과 규칙", () => {
  it("메인 지표 bar_click 은 P1·P2 에서 시뮬을 거부한다", () => {
    const d = p1({ metrics: { primary: "bar_click", guardrails: [], secondary: [] } });
    const v = validateDesign(d);
    expect(v.ok).toBe(false);
    if (!v.ok) expect(v.message).toBe("대조군에는 바가 없어 비교할 수 없어요");
    expect(() => simulateBaemin(d)).toThrow(SimulationRejected);
    // P3 부터는 대조군에도 바가 있어 정의된다
    expect(() => simulateBaemin(p3({ metrics: { primary: "bar_click", guardrails: [], secondary: [] } }))).not.toThrow();
  });

  it("기간 7일 미만, 누락된 가설 필드는 거절", () => {
    expect(validateDesign(p1({ duration_days: 6 })).ok).toBe(false);
    expect(validateDesign(p1({ hypothesis: { action: "", behavior: "b", impact: "i" } })).ok).toBe(false);
    expect(validateDesign(p4({ arms: ["B", "C"] })).ok).toBe(false);
  });

  it("peek_stop 은 효과가 크면 일찍 멈추고 PEEKED, sequential 은 더 늦게 멈추거나 끝까지 간다", () => {
    const peek = simulateBaemin(p1({ stopping: "peek_stop" }));
    expect(peek.stoppedAt!).toBeLessThan(14);
    expect(peek.flags).toContain("PEEKED");
    expect(peek.flags).toContain("SHORT_DURATION");
    const seq = simulateBaemin(p1({ stopping: "sequential" }));
    expect(seq.stoppedAt!).toBeGreaterThanOrEqual(peek.stoppedAt!);
    expect(seq.flags).not.toContain("PEEKED");
  });

  it("A/A + sequential 은 peek_stop 보다 위양성률이 훨씬 낮다", () => {
    // 스펙의 경계식 z_k = z_{α/2}·sqrt(K/k) 는 마지막 확인에서 보정 없는 1.96 을 쓰므로 α(5%)보다 약간 높은 약 7.5% 가 나온다(실측).
    let fp = 0;
    for (let i = 0; i < 2000; i++) {
      const r = simulateBaemin(p1({ aa: true, stopping: "sequential" }), { seed: SEED + i, withTruth: false });
      if (cmp(r, "abandon").significant) fp++;
    }
    expect(fp / 2000).toBeLessThan(0.1);
    expect(fp / 2000).toBeGreaterThan(0.03);
  }, 60000);

  it("램프업 일차를 분석에서 빼는 옵션은 없다: 분석 방식과 상관없이 모든 일차를 쓴다", () => {
    const pooled = simulateBaemin(p1({ ramp: "10_50_100", analysis_mode: "pooled" }));
    const strat = simulateBaemin(p1({ ramp: "10_50_100", analysis_mode: "stratified" }));
    expect(pooled.srm!.counts).toEqual(strat.srm!.counts);
    expect(pooled.periods).toHaveLength(14);
    expect(pooled.stoppedAt).toBe(14);
  });

  it("P3 coupon_ops=high 에서만 쿠폰 비용이 보이고, 트리거가 늘어 검정력이 오른다", () => {
    const low = simulateBaemin(p3());
    const high = simulateBaemin(p3({ coupon_ops: "high" }));
    expect(low.costs).toBeUndefined();
    expect(high.costs!.coupon_cost_krw).toBeGreaterThan(0);
    expect(high.achievedPower!).toBeGreaterThan(low.achievedPower!);
  });

  it("진짜 효과가 0 인 설계(P4 메인 conv)는 MDE 기준 검정력이라 UNDERPOWERED 가 아니다", () => {
    const r = simulateBaemin(p4());
    expect(r.achievedPower!).toBeGreaterThan(0.8);
    expect(r.flags).not.toContain("UNDERPOWERED");
  });

  it("계획 표본과 기간이 계산된다", () => {
    const r = simulateBaemin(p1());
    expect(r.planned!.nPerArm).toBeGreaterThan(1000);
    expect(r.planned!.days).toBeGreaterThan(0);
    // 검정력을 낮추면 필요한 표본이 줄어든다 (MDE 는 Primary 지표별로 고정)
    expect(simulateBaemin(p1({ power: 0.7 })).planned!.nPerArm).toBeLessThan(r.planned!.nPerArm);
  });
});

describe("규칙 3: 숨긴 효과와 플래그는 조 화면으로 내려보내지 않는다", () => {
  it("원본 Readout 에는 진짜 효과가 있고, 조 화면용 변환에는 없다", () => {
    const r = simulateBaemin(p1({ unit: "session", stopping: "peek_stop" }));
    expect(r.flags.length).toBeGreaterThan(0);
    expect(Object.keys(r.panels)).toContain("_truth");
    const team = JSON.stringify(toTeamView(r));
    for (const f of r.flags) expect(team).not.toContain(f);
    expect(team).not.toContain("_truth");
    expect(team).not.toContain("noveltyAmp");
  });

  it("진짜 효과(_truth)는 방향이 맞다", () => {
    const r = simulateBaemin(p1());
    const eff = (r.panels._truth as { effects: Record<string, Record<string, number>> }).effects;
    expect(eff.abandon.B).toBeLessThan(-0.02);
    expect(eff.conv.B).toBeGreaterThan(0);
  });
});

describe("플러그인 인터페이스", () => {
  it("phases 는 모든 스텝(s1~s6)을 덮고 키가 유일하다", () => {
    const keys = baeminPlugin.phases.map((p) => p.key);
    expect(new Set(keys).size).toBe(keys.length);
    const steps = new Set(baeminPlugin.phases.map((p) => p.step));
    for (const s of ["s1_diagnose", "s2_design", "s3_run", "s4_readout", "s5_deep", "s6_final"]) expect(steps.has(s as never)).toBe(true);
  });

  it("설계 phase 마다 스키마·폼 메타가, 결정 phase 마다 결정 옵션과 해설이 있다", () => {
    for (const key of ["diagnose", "p1", "p2", "p3", "p4"]) {
      expect(baeminPlugin.designSchema[key]).toBeDefined();
      expect(baeminPlugin.formMeta[key].length).toBeGreaterThan(0);
      expect(baeminPlugin.rubric[key]).toBeTruthy();
    }
    for (const key of ["p1", "p2", "p3", "p4"]) {
      expect(baeminPlugin.decisions[key].options.length).toBe(3);
      expect(baeminPlugin.reveal[key]).toBeTruthy();
    }
  });

  it("폼 메타의 입력란 이름이 스키마에 실제로 있다", () => {
    const sample = p4() as Record<string, unknown>;
    const has = (path: string) => path.split(".").reduce<unknown>((o, k) => (o && typeof o === "object" ? (o as Record<string, unknown>)[k] : undefined), sample) !== undefined;
    for (const f of baeminPlugin.formMeta.p4) expect(has(f.name), f.name).toBe(true);
  });

  it("plugin.simulate 는 p1_run 같은 키도 받고, 진단 단계는 거절한다", () => {
    const r = baeminPlugin.simulate("p1_run", p1() as never, { prior: {} });
    expect(r.phase).toBe("p1");
    expect(() => baeminPlugin.simulate("diagnose", p1() as never, { prior: {} })).toThrow(SimulationRejected);
  });
});

describe("페이지뷰 단위", () => {
  it("깜빡임(FLICKER) 장치는 없다: 페이지뷰는 UNIT_MISMATCH 만 붙는다", () => {
    expect(ALL_FLAGS as readonly string[]).not.toContain("FLICKER");
    const r = simulateBaemin(p1({ unit: "pageview" }));
    expect(r.flags).toContain("UNIT_MISMATCH");
    expect(r.flags as string[]).not.toContain("FLICKER");
  });

  it("페이지뷰 단위가 크래시율을 따로 올리지 않는다(이론 근거 없음)", () => {
    const user = simulateBaemin(p1({ unit: "user" }), { withTruth: false });
    const pv = simulateBaemin(p1({ unit: "pageview" }), { withTruth: false });
    const crashRate = (r: Readout) => {
      const m = metric(r, "crash");
      return (m.arms.B!.x ?? 0) / m.arms.B!.n;
    };
    // 단위가 효과를 줄이는 것(×0.3)과 별개로, 이전 구현의 +0.1%p 가산은 없어야 한다(차이 < 0.05%p)
    expect(crashRate(pv)).toBeCloseTo(crashRate(user), 3);
  });
});

describe("분석 방식(analysis_mode)", () => {
  const simpsonDesign = (mode: "pooled" | "stratified") =>
    p1({ ramp: "10_week1_50_week2", analysis_mode: mode, metrics: { primary: "conv", guardrails: ["abandon"], secondary: [] } });

  it("배정 비율이 바뀌는 램프: 합쳐서 분석하면 B 우세, 같은 비율끼리 나눠 합치면 주차별 방향(B 열세)과 같다", () => {
    const pooled = simulateBaemin(simpsonDesign("pooled"), { mode: "simpson_demo" });
    const strat = simulateBaemin(simpsonDesign("stratified"), { mode: "simpson_demo" });
    expect(cmp(pooled, "conv").d).toBeGreaterThan(0);
    expect(cmp(strat, "conv").d).toBeLessThan(0);
    expect(cmp(strat, "conv").method).toContain("층화");
    expect(cmp(pooled, "conv").method).not.toContain("층화");
  });

  it("SIMPSON_RISK 는 배정 비율이 달라진 기간을 합쳐서 분석했을 때만 붙는다", () => {
    const pooled = simulateBaemin(simpsonDesign("pooled"), { mode: "simpson_demo" });
    const strat = simulateBaemin(simpsonDesign("stratified"), { mode: "simpson_demo" });
    expect(pooled.flags).toContain("SIMPSON_RISK");
    expect(strat.flags).not.toContain("SIMPSON_RISK");
    // 7일이면 한 주(층 하나)뿐이라 합산 왜곡이 없다
    const week1 = simulateBaemin(p1({ ramp: "10_week1_50_week2", duration_days: 7, analysis_mode: "pooled" }), { mode: "simpson_demo" });
    expect(week1.flags).not.toContain("SIMPSON_RISK");
  });

  it("배정 비율이 일정한 램프(none, 10_50_100)에서는 두 방식의 결과가 같다", () => {
    for (const ramp of ["none", "10_50_100"]) {
      const a = simulateBaemin(p1({ ramp, analysis_mode: "pooled" }), { withTruth: false });
      const b = simulateBaemin(p1({ ramp, analysis_mode: "stratified" }), { withTruth: false });
      expect(JSON.stringify(b.metrics)).toBe(JSON.stringify(a.metrics));
      expect(b.flags).toEqual(a.flags);
    }
  });

  it("analysis_mode 를 생략하면 pooled 로 읽는다(이전 제출 호환)", () => {
    const d = p1();
    delete (d as Record<string, unknown>).analysis_mode;
    const v = validateDesign(d);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.design.analysis_mode).toBe("pooled");
  });
});

describe("P2 iOS 구버전 버그와 램프업", () => {
  it("램프업 없음(ramp none)이면 노출 기준에서 SRM, 배정 기준에서는 SRM 없이 크래시가 오른다", () => {
    const exposure = simulateBaemin(p2({ count_basis: "exposure" }));
    expect(exposure.flags).toContain("SRM");
    const assignment = simulateBaemin(p2({ count_basis: "assignment" }));
    expect(assignment.flags).not.toContain("SRM");
    expect(cmp(assignment, "crash").d).toBeGreaterThan(0.01);
    expect(cmp(assignment, "crash").significant).toBe(true);
  });

  it("램프업으로 시작하면 집계 기준이 exposure 여도 버그가 없다", () => {
    for (const ramp of ["10_50_100", "10_week1_50_week2"]) {
      const r = simulateBaemin(p2({ ramp, count_basis: "exposure" }));
      expect(r.flags, ramp).not.toContain("SRM");
      expect(cmp(r, "crash").significant, ramp).toBe(false);
    }
  });

  it("램프업을 쓴 P2 는 강사 전용 안내(_notes)가 붙고, 조 화면에는 보이지 않는다", () => {
    const r = simulateBaemin(p2({ ramp: "10_50_100" }));
    const notes = r.panels._notes as string[];
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("램프업");
    expect(toTeamView(r).panels._notes).toBeUndefined();
    expect(simulateBaemin(p2()).panels._notes).toBeUndefined();
    expect(simulateBaemin(p1({ ramp: "10_50_100" })).panels._notes).toBeUndefined();
  });

  it("p2 스키마에는 qa_old_ios 가 없다", () => {
    expect(baeminPlugin.formMeta.p2.map((f) => f.name)).not.toContain("qa_old_ios");
    const v = validateDesign(p2());
    expect(v.ok).toBe(true);
    if (v.ok) expect("qa_old_ios" in v.design).toBe(false);
  });
});

describe("플래그 규칙(이론 근거)", () => {
  const why = (r: Readout) => (r.panels._why ?? {}) as Record<string, string>;

  it("SHORT_DURATION: 완전한 주(7의 배수)가 아니면 붙는다", () => {
    const r10 = simulateBaemin(p1({ duration_days: 10 }));
    expect(r10.flags).toContain("SHORT_DURATION");
    expect(why(r10).SHORT_DURATION).toContain("요일 주기");
    for (const days of [14, 21, 28]) expect(simulateBaemin(p1({ duration_days: days })).flags, `${days}일`).not.toContain("SHORT_DURATION");
  });

  it("SHORT_DURATION: 첫 주만 본 7일 설계에는 신기효과 문구가 붙는다", () => {
    const r7 = simulateBaemin(p1({ duration_days: 7 }));
    expect(r7.flags).toContain("SHORT_DURATION");
    expect(why(r7).SHORT_DURATION).toContain("첫 주");
  });

  it("SHORT_DURATION: 분석한 사용자 수가 필요 표본에 못 미치면 붙는다", () => {
    const r = simulateBaemin(p1({ duration_days: 14, allocation: 0.1 }));
    expect(r.flags).toContain("SHORT_DURATION");
    expect(why(r).SHORT_DURATION).toContain("필요 표본");
    // 14일은 완전한 주이고 표본이 충분한 기본 설계에는 붙지 않는다
    expect(simulateBaemin(p1()).flags).not.toContain("SHORT_DURATION");
  });

  it("SHORT_DURATION: 중간 확인으로 일찍 멈춘 설계는 요일 주기 규칙 대상이 아니다", () => {
    const peek = simulateBaemin(p1({ stopping: "peek_stop", duration_days: 28 }));
    expect(peek.stoppedAt!).toBeLessThan(28);
    if (peek.stoppedAt! > 7) {
      // 8일 이후에 멈췄다면 요일 주기 문구는 없어야 한다
      expect(why(peek).SHORT_DURATION ?? "").not.toContain("요일 주기");
    }
  });

  it("UNDERPOWERED: 달성 검정력이 설계에서 정한 검정력보다 낮을 때 붙는다", () => {
    const a = simulateBaemin(p3({ coupon_ops: "high" })).achievedPower!;
    for (const power of [0.7, 0.8, 0.9]) {
      const r = simulateBaemin(p3({ coupon_ops: "high", power }));
      expect(r.achievedPower, `power ${power}`).toBeCloseTo(a, 10);
      expect(r.flags.includes("UNDERPOWERED"), `power ${power}`).toBe(a < power);
    }
    expect(why(simulateBaemin(p3())).UNDERPOWERED).toContain("검정력");
  });

  it("MULTIPLE_TESTING: 보정 없이 Primary 가 아닌 비교가 14개 이상(가족 오류율 > 0.5, α=0.05)일 때 붙는다", () => {
    const secondary14 = ["aov", "gmv", "repurchase7", "cs_rate", "near_min_share"]; // 가드레일 2 + 보조 5 = 7개 지표 × 처치군 2 = 14
    const r14 = simulateBaemin(p4({ metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: secondary14 } }));
    expect(r14.flags).toContain("MULTIPLE_TESTING");
    expect(why(r14).MULTIPLE_TESTING).toContain("다중검정");
    // 가드레일 2 + 보조 4 = 6개 지표 × 처치군 2 = 12개: 1-0.95^12 ≈ 0.46
    const r12 = simulateBaemin(p4({ metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: secondary14.slice(0, 4) } }));
    expect(r12.flags).not.toContain("MULTIPLE_TESTING");
    // 보정하면 14개여도 붙지 않는다
    const bh = simulateBaemin(p4({ correction: "bh", metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: secondary14 } }));
    expect(bh.flags).not.toContain("MULTIPLE_TESTING");
    // P1 기본 설계(비교 3개)에는 붙지 않는다
    expect(simulateBaemin(p1()).flags).not.toContain("MULTIPLE_TESTING");
  });

  it("SRM 과 SIMPSON_RISK 에도 근거 문장이 붙고, 조 화면에는 _why 가 보이지 않는다", () => {
    const srm = simulateBaemin(p2({ count_basis: "exposure" }));
    expect(why(srm).SRM).toContain("0.001");
    const simpson = simulateBaemin(p1({ ramp: "10_week1_50_week2", metrics: { primary: "conv", guardrails: ["abandon"], secondary: [] } }), { mode: "simpson_demo" });
    expect(why(simpson).SIMPSON_RISK).toContain("심슨");
    expect(toTeamView(srm).panels._why).toBeUndefined();
  });
});

describe("루브릭·정답 해설 문구", () => {
  const all = [...Object.values(baeminPlugin.rubric), ...Object.values(baeminPlugin.reveal)].join("\n");

  it("이론에 없는 개념과 절대 기준을 쓰지 않는다", () => {
    expect(all).not.toContain("홀드아웃");
    expect(all).not.toContain("14일 이상");
    expect(all).not.toContain("안드로이드 + 가게홈");
    expect(all).not.toContain("사전 QA");
  });

  it("Phase 별 루브릭은 결정의 정오를 decision_checks 에 맡긴다", () => {
    for (const phase of ["p1", "p2", "p3", "p4"]) expect(baeminPlugin.rubric[phase], phase).toContain("decision_checks");
  });

  it("P2 정답 해설은 iOS 구버전 에피소드를 램프업과 연결해 설명한다", () => {
    expect(baeminPlugin.reveal.p2).toContain("램프업");
  });
});
