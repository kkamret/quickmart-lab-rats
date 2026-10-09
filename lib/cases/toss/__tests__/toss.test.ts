/**
 * 토스 사례 검증 시나리오 (docs/cases/toss.md §6). 기대값은 문서가 진실의 원천이다.
 * 스펙에 설계 칸이 비어 있는 시나리오는 아래 팩토리의 기본값으로 채웠다. 서비스 AU 관련(#5, #6)은 가드레일에 service_au 를 넣었다.
 */
import { describe, expect, it } from "vitest";
import { SimulationRejected } from "../../types";
import { toTeamView, type Readout } from "@/lib/sim/core";
import { tossPlugin, simulateToss, validateDesign } from "../index";
import { POOLED_SLOPE_PP, STRATIFIED_SLOPE_PP } from "../diagnose";
import { replay, sendReduction } from "../replay";

const hyp = { action: "무반응 푸시를 쉬게 해요", behavior: "관심 없는 푸시가 줄어 남은 푸시를 더 봐요", impact: "CTR 이 오르고 클릭은 유지돼요" };
const REF1 = { N: 3, W: 14, C: 14, G: "same_service" };
const REF2 = { N: 4, W: 30, C: 14, G: "same_service" };

type D = Record<string, unknown>;
const p1 = (over: D = {}): D => ({
  phase: "p1", hypothesis: hyp, variants: { V1: REF1, V2: REF2 }, sample_fraction: 0.06, duration_weeks: 8, primary: "push_ctr",
  hypothesis_type: { clicks_per_user: "non_inferiority" }, ni_margin_pct: -1, guardrails: ["app_open_au"], secondary: ["clicks_per_user", "sends_per_user"],
  ctr_analysis_unit: "user_delta", cuped: false, correction: "none", stopping: "fixed", stakeholder_alignment: true, ...over,
});
const p2 = (over: D = {}): D => ({ ...p1(), phase: "p2", arms: ["A", "V1", "V2"], fraction_total: 0.3, duration_weeks: 6, cuped: false, correction: "none", ...over });

const metric = (r: Readout, key: string) => r.metrics.find((m) => m.key === key)!;
const cmp = (r: Readout, key: string, arm = "B") => metric(r, key).comparisons.find((c) => c.arm === arm)!;
type P = Record<string, { d: number; p: number; significant?: boolean }>;
const lightAu = (r: Readout) => r.panels.light_au as P;
const hteLight = (r: Readout) =>
  Object.fromEntries(
    Object.entries((r.panels.hte as { rows: { seg: string; arms: Record<string, { app_open_au: { d: number; p: number } }> }[] }).rows.find((x) => x.seg === "light")!.arms).map(([a, v]) => [a, v.app_open_au]),
  );
const truthOf = (r: Readout) => (r.panels._truth as { variants: Record<string, { sendReduction: number; lightAuRel: number }> }).variants;

describe("토스 검증 시나리오", () => {
  it("#1 REF_V1/V2, 6%, 8주, user_delta, CTR + 클릭 비열등성(−1%)", () => {
    const r = simulateToss(p1());
    expect(r.srm!.p).toBeGreaterThan(0.001);
    expect(cmp(r, "push_ctr", "B").d * 100).toBeGreaterThanOrEqual(3.9);
    expect(cmp(r, "push_ctr", "B").d * 100).toBeLessThanOrEqual(4.1);
    expect(cmp(r, "push_ctr", "C").d * 100).toBeGreaterThanOrEqual(3.4);
    expect(cmp(r, "push_ctr", "C").d * 100).toBeLessThanOrEqual(3.6);
    expect(cmp(r, "push_ctr", "B").significant).toBe(true);
    expect(cmp(r, "push_ctr", "C").significant).toBe(true);
    const ni = (r.panels.non_inferiority as { rows: { passed: boolean }[] }).rows;
    expect(ni).toHaveLength(2);
    expect(ni.every((x) => x.passed)).toBe(true);
    // 가드레일 AU 는 유의하게 나빠지지 않는다
    for (const arm of ["B", "C"]) expect(cmp(r, "app_open_au", arm).p > 0.05 || cmp(r, "app_open_au", arm).d > 0).toBe(true);
    expect(r.flags).toEqual([]);
    // CTR 상승은 대부분 구성 효과(발송 감소), 클릭 총량은 거의 그대로
    const row = (r.panels.composition as { rows: { composition: number; behavior: number; clicksChangeRel: number; sendsChangeRel: number }[] }).rows[0];
    expect(row.composition / (row.composition + row.behavior)).toBeGreaterThan(0.8);
    expect(Math.abs(row.clicksChangeRel)).toBeLessThan(0.02);
    expect(row.sendsChangeRel).toBeLessThan(-0.2);
  });

  it("#2 푸시 단위 분석: CTR SE 가 사용자 단위 대비 2.5~3.5배 좁고 NAIVE_SE", () => {
    const user = simulateToss(p1());
    const push = simulateToss(p1({ ctr_analysis_unit: "push" }));
    const width = (r: Readout) => cmp(r, "push_ctr").ci[1] - cmp(r, "push_ctr").ci[0];
    const ratio = width(user) / width(push);
    expect(ratio).toBeGreaterThanOrEqual(2.5);
    expect(ratio).toBeLessThanOrEqual(3.5);
    expect(push.flags).toContain("NAIVE_SE");
    expect(user.flags).not.toContain("NAIVE_SE");
    // 같은 데이터이므로 점추정은 같다
    expect(cmp(push, "push_ctr").d).toBeCloseTo(cmp(user, "push_ctr").d, 10);
    // 기간이 길수록 비율이 커지고, 6주 미만이면 2.5배 아래
    const ratioAt = (w: number) => width(simulateToss(p1({ duration_weeks: w }))) / width(simulateToss(p1({ duration_weeks: w, ctr_analysis_unit: "push" })));
    expect(ratioAt(4)).toBeLessThan(2.5);
    expect(ratioAt(12)).toBeGreaterThan(ratio);
  });

  it("#3 클릭 지표 제외: RATIO_COMPOSITION, 구성 효과 패널 비활성", () => {
    const r = simulateToss(p1({ secondary: [], hypothesis_type: {} }));
    expect(r.flags).toContain("RATIO_COMPOSITION");
    expect((r.panels.composition as { active: boolean }).active).toBe(false);
    expect(r.panels.replay_gap).toBeUndefined();
  });

  it("#4 4주: 습관 침식이 아직 안 나타나고 SHORT_DURATION", () => {
    const r = simulateToss(p1({ duration_weeks: 4 }));
    expect(r.flags).toContain("SHORT_DURATION");
    for (const a of ["B", "C"]) expect(lightAu(r)[a].p).toBeGreaterThan(0.05);
    // 진짜 효과: 4주차에는 침식 진행률 0
    const week4 = r.periods[3].arms;
    expect(Math.abs((week4.B!.light_au as number) - (week4.A!.light_au as number))).toBeLessThan(0.01);
  });

  it("#5 공격적 V1(N=2, W=30, C=30, same_purpose): s≥0.45, 라이트 AU 유의 악화, S10~S12 서비스 AU 악화", () => {
    const r = simulateToss(p1({ variants: { V1: { N: 2, W: 30, C: 30, G: "same_purpose" }, V2: REF2 }, guardrails: ["app_open_au", "service_au"], correction: "bh" }));
    expect(truthOf(r).V1.sendReduction).toBeGreaterThanOrEqual(0.45);
    expect(lightAu(r).B.d).toBeLessThan(0);
    expect(lightAu(r).B.p).toBeLessThan(0.05);
    expect(lightAu(r).C.p).toBeGreaterThan(0.05);
    const rows = (r.panels.services as { rows: { id: string; arms: Record<string, { d: number; significant: boolean }> }[] }).rows;
    for (const id of ["S10", "S11", "S12"]) {
      const row = rows.find((x) => x.id === id)!;
      expect(row.arms.B.d, id).toBeLessThan(0);
      expect(row.arms.B.significant, id).toBe(true);
    }
  });

  it("§3-3 공격적 규칙: s≈0.38(N=2, W=30, C=14, same_service)부터는 6%·8주에서 라이트 AU 악화가 유의", () => {
    const r = simulateToss(p1({ variants: { V1: { N: 2, W: 30, C: 14, G: "same_service" }, V2: REF2 } }));
    expect(truthOf(r).V1.sendReduction).toBeGreaterThan(0.37);
    expect(lightAu(r).B.d).toBeLessThan(0);
    expect(lightAu(r).B.p).toBeLessThan(0.05);
  });

  it("#6 서비스 AU 가드레일: 보정 없으면 24개 중 1~2개 우연 유의 + MULTIPLE_TESTING, BH 면 0개", () => {
    const none = simulateToss(p1({ guardrails: ["app_open_au", "service_au"] }));
    const sv = none.panels.services as { tests: number; significant: number };
    expect(sv.tests).toBe(24);
    expect(sv.significant).toBeGreaterThanOrEqual(1);
    expect(sv.significant).toBeLessThanOrEqual(2);
    expect(none.flags).toContain("MULTIPLE_TESTING");
    const bh = simulateToss(p1({ guardrails: ["app_open_au", "service_au"], correction: "bh" }));
    expect((bh.panels.services as { significant: number }).significant).toBe(0);
    expect(bh.flags).not.toContain("MULTIPLE_TESTING");
    // 푸시 단위 SE 로 보면 서비스 표의 상당수(24개 중 약 3분의 1)가 유의해진다
    const push = simulateToss(p1({ guardrails: ["app_open_au", "service_au"], ctr_analysis_unit: "push" }));
    expect((push.panels.services as { significant: number }).significant).toBeGreaterThan(6);
    expect((push.panels.services as { significant: number }).significant).toBeLessThan(13);
  });

  it("#7 s5: A+V1+V2, 30%, 6주, CUPED 끔: AU 유의 악화 없음 (원문 일치)", () => {
    const r = simulateToss(p2({ guardrails: ["app_open_au"] }));
    for (const a of ["B", "C"]) {
      const c = cmp(r, "app_open_au", a);
      expect(c.p > 0.05 || c.d > 0, `overall ${a}`).toBe(true);
      const l = hteLight(r)[a];
      expect(l.p > 0.05 || l.d > 0, `light ${a}`).toBe(true);
    }
  });

  it("#8 CUPED 켬: V1 라이트 AU 의 p 가 명확히 작아져 0.01~0.12, V2 는 p>0.3", () => {
    const off = hteLight(simulateToss(p2()));
    const on = hteLight(simulateToss(p2({ cuped: true })));
    expect(on.B.d).toBeLessThan(0);
    expect(on.B.p).toBeGreaterThanOrEqual(0.01);
    expect(on.B.p).toBeLessThanOrEqual(0.12);
    expect(on.B.p).toBeLessThan(off.B.p * 0.8);
    expect(on.C.p).toBeGreaterThan(0.3);
  });

  it("#9 peek_stop(메인 CTR): 1주차 종료, PEEKED + SHORT_DURATION", () => {
    const r = simulateToss(p1({ stopping: "peek_stop" }));
    expect(r.stoppedAt).toBe(1);
    expect(r.flags).toContain("PEEKED");
    expect(r.flags).toContain("SHORT_DURATION");
    expect(r.periods).toHaveLength(r.stoppedAt!);
  });

  it("#10 stakeholder_alignment=false: s5 이벤트 플래그, 대응안 없으면 거부", () => {
    const base = p2({ stakeholder_alignment: false });
    expect(() => simulateToss(base)).toThrow(SimulationRejected);
    const r = simulateToss({ ...base, response_to_stakeholders: "도달 영향을 숫자로 공유하고 가드레일을 함께 정해요" });
    expect(r.flags).toContain("STAKEHOLDER_EVENT");
    expect((r.panels.event as { text: string }).text).toContain("실험 중단을 요청");
    expect(simulateToss(p2()).flags).not.toContain("STAKEHOLDER_EVENT");
  });

  it("#11 s1 관찰 데이터: 풀링 기울기 / 층화 기울기 비 ≥ 4", () => {
    expect(POOLED_SLOPE_PP).toBeLessThan(0);
    expect(POOLED_SLOPE_PP / STRATIFIED_SLOPE_PP).toBeGreaterThanOrEqual(4);
  });

  it("#12 결정성·CRN: 같은 설계는 같은 출력, 대조군 주간 집계는 설계와 무관", () => {
    expect(JSON.stringify(simulateToss(p1()))).toBe(JSON.stringify(simulateToss(p1())));
    const a = simulateToss(p1());
    const b = simulateToss(p1({ variants: { V1: { N: 2, W: 7, C: 7, G: "same_purpose" }, V2: { N: 8, W: 30, C: 30, G: "same_service" } }, cuped: true, correction: "bh", guardrails: ["service_au"], primary: "app_open_au" }));
    expect(b.designHash).not.toBe(a.designHash);
    expect(b.periods.map((p) => p.arms.A)).toEqual(a.periods.map((p) => p.arms.A));
    // 기간이 달라도 같은 주차의 대조군 집계는 같다
    const c = simulateToss(p1({ duration_weeks: 5 }));
    expect(c.periods.map((p) => p.arms.A)).toEqual(a.periods.slice(0, 5).map((p) => p.arms.A));
  });
});

describe("토스 스펙 값과 확인 규칙", () => {
  it("발송 감소율: REF_V1 ≈ 25%, REF_V2 ≈ 22.4%, 가장 공격적인 조합도 상한 55% 이하", () => {
    expect(sendReduction(REF1 as never)).toBeCloseTo(0.25, 6);
    expect(sendReduction(REF2 as never)).toBeCloseTo(0.224, 6);
    expect(sendReduction({ N: 2, W: 30, C: 30, G: "same_purpose" })).toBeCloseTo(0.5255, 3);
    expect(sendReduction({ N: 2, W: 30, C: 30, G: "same_purpose" })).toBeLessThanOrEqual(0.55);
  });
  it("오프라인 리플레이는 클릭 손실을 온라인 진짜 값보다 크게 추정한다(약 5~8배)", () => {
    const r = simulateToss(p1(), { noise: false });
    const tv = (r.panels._truth as { variants: Record<string, { deltaClicksRel: number; offlineClickLossRel: number }> }).variants;
    const t = tv.V1;
    expect(t.deltaClicksRel).toBeCloseTo(-0.0053, 3);
    // REF_V1 ≈ 6.3배, REF_V2 ≈ 7.7배 (N=2 는 ≈ 5.2배)
    for (const vn of ["V1", "V2"]) {
      expect(tv[vn].offlineClickLossRel / tv[vn].deltaClicksRel, vn).toBeGreaterThan(5);
      expect(tv[vn].offlineClickLossRel / tv[vn].deltaClicksRel, vn).toBeLessThan(8);
    }
    expect(replay(REF1 as never).bySegment.find((x) => x.key === "light")!.s).toBeLessThan(0.25);
    const gap = (r.panels.replay_gap as { rows: { offlineClickLossRel: number; onlineClicksRel: number }[] }).rows;
    expect(gap[0].offlineClickLossRel).toBeLessThan(-0.03);
  });
  it("진짜 효과(_truth)·flags·달성 검정력은 조 화면용 사본에 없다", () => {
    const r = simulateToss(p1());
    expect(r.panels._truth).toBeDefined();
    const json = JSON.stringify(toTeamView(r));
    expect(json).not.toContain("_truth");
    expect(json).not.toContain("flags");
    expect(json).not.toContain("achievedPower");
    expect(json).not.toContain("sendReduction");
  });
  it("검증: 비열등성을 쓰려면 마진이 필요하고, 확대 실험은 s2 변이안이 필요해요", () => {
    expect(validateDesign(p1({ ni_margin_pct: undefined })).ok).toBe(false);
    expect(validateDesign(p1({ variants: { V1: { ...REF1, N: 7 }, V2: REF2 } })).ok).toBe(false);
    expect(validateDesign(p1({ sample_fraction: 0.5 })).ok).toBe(false);
    expect(() => simulateToss({ ...p2(), variants: undefined })).toThrow(/먼저 2번 스텝/);
  });
  it("플러그인: p1_run/p1_readout/p2_readout 은 시뮬레이션, 진단·최종 결정은 거부", () => {
    expect(tossPlugin.simulate("p1_run", p1() as never, { prior: {} }).phase).toBe("p1");
    expect(tossPlugin.simulate("p2_readout", p2() as never, { prior: {} }).phase).toBe("p2");
    expect(() => tossPlugin.simulate("p3_decide", p1() as never, { prior: {} })).toThrow(SimulationRejected);
  });
  it("A/A: 진짜 효과 없음(CTR 차이 0 근처, 플래그 없음)", () => {
    const r = simulateToss(p1({ aa: true, guardrails: ["app_open_au", "service_au"], correction: "bh" }));
    expect(Math.abs(cmp(r, "push_ctr").d)).toBeLessThan(0.001);
    expect(r.flags).toEqual([]);
  });
  it("A/A: 짧게 돌려도 진짜 효과가 없어서 SHORT_DURATION 은 뜨지 않는다", () => {
    for (const duration_weeks of [2, 4, 5]) {
      expect(simulateToss(p1({ aa: true, duration_weeks })).flags, `${duration_weeks}주`).not.toContain("SHORT_DURATION");
    }
    // A/A 가 아니면 같은 기간에 뜬다
    expect(simulateToss(p1({ duration_weeks: 4 })).flags).toContain("SHORT_DURATION");
  });
  it("중간 확인: CTR 메인이면 sequential 도 1주차에 멈추고, peek_stop 은 끝까지 가도 PEEKED", () => {
    const seq = simulateToss(p1({ stopping: "sequential" }));
    expect(seq.stoppedAt).toBe(1);
    expect(seq.flags).not.toContain("PEEKED");
    const peekClicks = simulateToss(p1({ stopping: "peek_stop", primary: "clicks_per_user" }));
    expect(peekClicks.stoppedAt).toBe(8);
    expect(peekClicks.flags).toContain("PEEKED");
  });
});
