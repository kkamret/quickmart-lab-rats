/**
 * 결정 판정 (설계 문서 A). 분류 로직은 손으로 만든 최소 Readout 으로 검증하고,
 * 실제 시뮬레이터 결과로는 사례 문서의 교육 시나리오가 의도한 정답이 나오는지 확인한다.
 */
import { describe, expect, it } from "vitest";
import type { Comparison, Readout } from "@/lib/sim/core";
import { baeminPlugin, simulateBaemin } from "../index";
import { judgeBaemin } from "../judge";

const hyp = { action: "가게홈에서 최소금액 달성 여부를 안내해요", behavior: "장바구니를 오가지 않고 바로 주문해요", impact: "장바구니 이탈률이 줄어요" };
type D = Record<string, unknown>;

const base = (over: D = {}): D => ({
  phase: "p1", hypothesis: hyp, scope: { os: "android", surface: "store_home" }, unit: "user",
  metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov"] },
  alpha: 0.05, power: 0.8, duration_days: 14, allocation: 1, ramp: "none", analysis_mode: "pooled",
  stopping: "fixed", count_basis: "assignment", ...over,
});
const p2 = (over: D = {}) => base({ phase: "p2", scope: { os: "all", surface: "all" }, metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov", "gmv", "near_min_share"] }, ...over });
const p3 = (over: D = {}) => base({ phase: "p3", trigger_logging: true, coupon_ops: "low", scope: { os: "all", surface: "all" }, metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: ["aov"] }, ...over });
const p4 = (over: D = {}) => base({ phase: "p4", arms: ["A", "B"], correction: "none", scope: { os: "all", surface: "all" }, metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: ["aov"] }, ...over });

// ── 손으로 만든 Readout ──
const cmpOf = (arm: string, d: number, ci: [number, number], significant: boolean): Comparison =>
  ({ vs: "A", arm, d, ci, rel: d, relCi: ci, p: significant ? 0.001 : 0.5, win: 0.5, significant, method: "test" }) as Comparison;
type M = { key: string; role: "P" | "G" | "S"; type: "prop" | "mean"; label: string; cmps: Comparison[] };
const prop = (key: string, label: string, role: M["role"], cmps: Comparison[]): M => ({ key, label, role, type: "prop", cmps });
const readout = (metrics: M[], over: Partial<Readout> = {}): Readout =>
  ({
    caseKey: "baemin", phase: "p1", designHash: "h", periods: [], stoppedAt: 14,
    srm: { counts: [1000, 1000], ratios: [0.5, 0.5], p: 0.9 },
    metrics: metrics.map((m) => ({ key: m.key, label: m.label, role: m.role, type: m.type, arms: {}, comparisons: m.cmps })),
    panels: {}, flags: [], ...over,
  }) as unknown as Readout;
const judge = (design: D, result: Readout, option: string) => {
  const phase = design.phase as string;
  return judgeBaemin(phase, option, { design, result })!;
};
const verdicts = (design: D, result: Readout, options: string[]) => Object.fromEntries(options.map((o) => [o, judge(design, result, o).verdict]));
const P1_OPTS = ["deploy", "no_deploy", "extend_rerun"];

describe("judgeBaemin: 분류", () => {
  it("구간 전체가 0 바깥이고 효과가 MDE 이상(가드레일 이상 없음): 배포가 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "correct", no_deploy: "wrong", extend_rerun: "partial" });
    expect(judge(base(), r, "deploy").reason).toContain("MDE");
    expect(judge(base(), r, "deploy").reason).toMatch(/Ch\d · /);
  });

  it("유의하지만 효과가 MDE 보다 작음: 배포·접기는 부분, 재실험은 오답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.012, [-0.02, -0.004], true)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "partial", no_deploy: "partial", extend_rerun: "wrong" });
  });

  it("구간이 0 을 포함하고 ±MDE 안에 들어감: 접는 게 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.002, [-0.01, 0.006], false)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "wrong", no_deploy: "correct", extend_rerun: "partial" });
  });

  it("구간이 0 을 포함하고 MDE 보다 넓음: 재실험이 정답, 접는 건 성급", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.01, [-0.04, 0.02], false)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "wrong", no_deploy: "wrong", extend_rerun: "correct" });
  });

  it("Primary 가 유의하게 나빠짐: 배포 안 함이 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", 0.02, [0.01, 0.03], true)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "wrong", no_deploy: "correct", extend_rerun: "partial" });
  });

  it("분석 구간이 7일 이하이면 효과가 커도 기간을 늘린 재실험이 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])], { stoppedAt: 7 });
    expect(verdicts(base({ duration_days: 7 }), r, P1_OPTS)).toEqual({ deploy: "partial", no_deploy: "wrong", extend_rerun: "correct" });
    expect(judge(base({ duration_days: 7 }), r, "extend_rerun").reason).toContain("신기효과");
  });

  it("중간 확인 규칙으로 첫 주 안에 일찍 멈췄으면 판정은 같고, 근거에 멈춘 이유와 날짜가 들어간다", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.039, [-0.05, -0.028], true)])], { stoppedAt: 3 });
    const seq = base({ stopping: "sequential" });
    expect(verdicts(seq, r, P1_OPTS)).toEqual({ deploy: "partial", no_deploy: "wrong", extend_rerun: "correct" });
    expect(judge(seq, r, "deploy").reason).toContain("순차 검정 경계를 넘어 3일째에 일찍 멈췄어요");
    const peek = base({ stopping: "peek_stop" });
    expect(judge(peek, r, "deploy").reason).toContain("매일 확인하다 유의해져 3일째에 일찍 멈췄어요");
    // 계획한 기간(7일)을 다 채운 fixed 설계에는 조기 종료 문구가 없다
    const r7 = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])], { stoppedAt: 7 });
    expect(judge(base({ duration_days: 7 }), r7, "deploy").reason).not.toContain("일찍 멈췄어요");
  });

  it("시스템 가드레일(크래시)이 유의하게 나빠짐: 중단 후 원인을 고쳐 재실험", () => {
    const r = readout([
      prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)]),
      prop("crash", "앱 크래시율", "G", [cmpOf("B", 0.002, [0.001, 0.003], true)]),
    ]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "wrong", no_deploy: "partial", extend_rerun: "correct" });
  });

  it("SRM 이 있으면 효과가 좋아 보여도 중단. 재실험 선택지가 없는 P2 에서는 배포 안 함이 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])], { flags: ["SRM"] });
    expect(verdicts(p2(), r, ["full_deploy", "no_deploy", "deploy_followup"])).toEqual({ full_deploy: "wrong", no_deploy: "correct", deploy_followup: "wrong" });
    expect(judge(p2(), r, "no_deploy").reason).toContain("배정 비율");
  });

  it("Primary 는 좋아졌지만 비즈니스 가드레일(평균주문금액)이 유의하게 나빠짐: 배포하되 후속 실험", () => {
    const aov = { key: "aov", label: "평균주문금액(원)", role: "S" as const, type: "mean" as const, cmps: [cmpOf("B", -1100, [-1500, -700], true)] };
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)]), aov]);
    expect(verdicts(p2(), r, ["full_deploy", "no_deploy", "deploy_followup"])).toEqual({ full_deploy: "partial", no_deploy: "wrong", deploy_followup: "correct" });
    expect(judge(p2(), r, "deploy_followup").reason).toContain("평균주문금액");
  });

  it("고객 유형 하나에서 Primary 가 반대로 유의하게 나빠져도 같은 위험으로 본다 (P2)", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])], {
      panels: { segments: { first_order: { abandon: { d: 0.02, significant: true } }, general: { abandon: { d: -0.03, significant: true } } } },
    });
    expect(judge(p2(), r, "deploy_followup").verdict).toBe("correct");
    expect(judge(p2(), r, "deploy_followup").reason).toContain("첫 주문 혜택");
  });

  it("P3: 문구를 보는 트리거 사용자 비율로 효과를 환산해서 분류한다", () => {
    // 전체 conv 차이 +0.2%p, 구간 [-0.2, +0.6]%p: 그대로면 ±MDE(2%p) 안이지만, B 의 10%만 문구를 봤으므로 10배로 환산하면 MDE 보다 넓다.
    const r = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.002, [-0.002, 0.006], false)])], {
      srm: { counts: [1000, 1000], ratios: [0.5, 0.5], p: 0.9 },
      panels: { trigger: { biased: { exposed: { n: 100 } } } },
    });
    expect(verdicts(p3(), r, ["rollback", "deploy", "expand_rerun"])).toEqual({ rollback: "wrong", deploy: "wrong", expand_rerun: "correct" });
    expect(judge(p3(), r, "expand_rerun").reason).toContain("트리거 사용자 기준");
    // 트리거 정보가 없으면(환산 없음) 같은 숫자는 접는 쪽이 정답
    const plain = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.002, [-0.002, 0.006], false)])]);
    expect(judge(p3(), plain, "rollback").verdict).toBe("correct");
  });

  it("P4: 두 안 모두 효과가 확인되지 않으면 둘 다 배포 안 함이 정답, 한 안이 좋으면 그 안 배포가 정답", () => {
    const nothing = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.001, [-0.003, 0.005], false), cmpOf("C", 0.0, [-0.004, 0.004], false)])]);
    const d = p4({ arms: ["A", "B", "C"] });
    expect(verdicts(d, nothing, ["deploy_b", "deploy_c", "none_learn"])).toEqual({ deploy_b: "wrong", deploy_c: "wrong", none_learn: "correct" });
    const bWins = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.03, [0.02, 0.04], true), cmpOf("C", 0.0, [-0.004, 0.004], false)])]);
    expect(verdicts(d, bWins, ["deploy_b", "deploy_c", "none_learn"])).toEqual({ deploy_b: "correct", deploy_c: "wrong", none_learn: "wrong" });
  });

  it("실험에 넣지 않은 그룹(C)의 배포는 오답이다", () => {
    const r = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.001, [-0.003, 0.005], false)])]);
    const j = judge(p4(), r, "deploy_c");
    expect(j.verdict).toBe("wrong");
    expect(j.reason).toContain("C 그룹");
  });

  it("알 수 없는 Phase·옵션이거나 설계가 잘못되면 null", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])]);
    expect(judgeBaemin("p9", "deploy", { design: base(), result: r })).toBeNull();
    expect(judgeBaemin("p1", "nope", { design: base(), result: r })).toBeNull();
    expect(judgeBaemin("p1", "deploy", { design: { phase: "p1" }, result: r })).toBeNull();
  });
});

describe("judgeBaemin: 실제 시뮬레이터 결과", () => {
  const run = (design: D) => ({ design, result: simulateBaemin(design) });
  const pick = (design: D, options: string[]) => {
    const rr = run(design);
    return Object.fromEntries(options.map((o) => [o, judgeBaemin(design.phase as string, o, rr)!.verdict]));
  };

  it("P1 14일: 배포가 정답, 7일: 기간 연장 재실험이 정답", () => {
    expect(pick(base(), P1_OPTS)).toEqual({ deploy: "correct", no_deploy: "wrong", extend_rerun: "partial" });
    expect(pick(base({ duration_days: 7 }), P1_OPTS)).toEqual({ deploy: "partial", no_deploy: "wrong", extend_rerun: "correct" });
  });

  it("P1 순차 검정: 표본이 커서 첫 주 안에 멈추므로 기간 연장 재실험이 정답이고, 근거에 조기 종료가 보인다", () => {
    const d = base({ stopping: "sequential" });
    expect(pick(d, P1_OPTS)).toEqual({ deploy: "partial", no_deploy: "wrong", extend_rerun: "correct" });
    const rr = run(d);
    expect(rr.result.stoppedAt!).toBeLessThanOrEqual(7);
    expect(judgeBaemin("p1", "deploy", rr)!.reason).toContain(`순차 검정 경계를 넘어 ${rr.result.stoppedAt}일째에 일찍 멈췄어요`);
  });

  it("P2 노출 기준·램프업 없음(SRM): 배포 안 함이 정답", () => {
    expect(pick(p2({ count_basis: "exposure" }), ["full_deploy", "no_deploy", "deploy_followup"])).toEqual({ full_deploy: "wrong", no_deploy: "correct", deploy_followup: "wrong" });
  });

  it("P2 램프업으로 시작: 평균주문금액 악화 때문에 후속 실험을 붙인 배포가 정답", () => {
    const opts = ["full_deploy", "no_deploy", "deploy_followup"];
    expect(pick(p2({ ramp: "10_50_100" }), opts)).toEqual({ full_deploy: "partial", no_deploy: "wrong", deploy_followup: "correct" });
  });

  it("P3 쿠폰 운영 low: 노출 조건을 넓혀 재실험이 정답, 롤백은 오답", () => {
    const v = pick(p3(), ["rollback", "deploy", "expand_rerun"]);
    expect(v.expand_rerun).toBe("correct");
    expect(v.rollback).toBe("wrong");
    expect(v.deploy).toBe("wrong");
  });

  it("P4 기본(A/B/C, 보정 없음): 둘 다 배포 안 함이 정답", () => {
    const d = p4({ arms: ["A", "B", "C"], metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: ["aov", "gmv", "repurchase7", "cs_rate", "near_min_share", "min_reach"] } });
    expect(pick(d, ["deploy_b", "deploy_c", "none_learn"])).toEqual({ deploy_b: "wrong", deploy_c: "wrong", none_learn: "correct" });
  });

  it("플러그인에 judge 가 연결돼 있다", () => {
    expect(typeof baeminPlugin.judge).toBe("function");
  });
});
