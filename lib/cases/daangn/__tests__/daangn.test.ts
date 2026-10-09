/**
 * 당근 사례 검증 시나리오 (docs/cases/daangn.md §6). 기대값은 문서가 진실의 원천이다.
 * 스펙에 설계 칸이 비어 있는 시나리오는 팩토리 기본값으로 채웠다.
 */
import { describe, expect, it } from "vitest";
import { toTeamView, type Readout } from "@/lib/sim/core";
import { SimulationRejected } from "../../types";
import { daangnPlugin, simulateDaangn, validateDesign } from "../index";

type D = Record<string, unknown>;
const p1 = (over: D = {}): D => ({
  phase: "p1", assignment_timing: "review_screen_open", analysis_population: "review_screen_open", metric_definition: "submitted_72h",
  guardrails: ["short_review_rate"], alpha: 0.05, power: 0.8, mde_pp: 2, duration_days: 14, stopping: "fixed", data_source: "server_db", run_aa_first: true, ...over,
});
const p2 = (over: D = {}): D => ({
  phase: "p2", assignment_timing: "review_screen_open", analysis_population: "review_screen_open", metric_definition: "submitted_72h",
  guardrails: ["short_review_rate"], alpha: 0.05, power: 0.8, mde_pp: 2, duration_days: 14, stopping: "fixed",
  assignment_key: "user_id_hash", salt: "new_per_experiment", new_user_policy: "assign_on_first_launch", logging: "server_events", rerun_aa: true, ...over,
});
const p3 = (over: D = {}): D => ({
  phase: "p3", randomization_unit: "user", primary: "listing_creation_rate", guardrails: ["search_to_chat", "search_retry"], analysis_se: "naive",
  duration_days: 14, alpha: 0.05, power: 0.8, mde_pct: 3, qualitative_weight: "정성 의견은 보조로만 쓴다", ...over,
});

const metric = (r: Readout, key: string) => r.metrics.find((m) => m.key === key)!;
const cmp = (r: Readout, key: string) => metric(r, key).comparisons[0];
const rate = (r: Readout, key: string, arm: "A" | "B") => {
  const a = metric(r, key).arms[arm] as { n: number; x: number };
  return a.x / a.n;
};
const dupShare = (r: Readout) => (r.panels.diagnostics as { bothGroups: { share: number } }).bothGroups.share;
const ciWidth = (r: Readout, key: string) => cmp(r, key).ci[1] - cmp(r, key).ci[0];

describe("당근 검증 시나리오", () => {
  it("#1 A/A: 신규 설치 버그로 SRM, 양쪽 중복 사용자 13~15%", () => {
    const r = simulateDaangn(p1({ aa: true }));
    expect(r.srm!.p).toBeLessThan(0.001);
    expect(dupShare(r)).toBeGreaterThanOrEqual(0.13);
    expect(dupShare(r)).toBeLessThanOrEqual(0.15);
    expect(r.flags).toContain("SRM");
  });

  it("#2 본 실험: SRM, 관측 효과 3.9~4.6%p (희석과 편향)", () => {
    const r = simulateDaangn(p1());
    expect(r.srm!.p).toBeLessThan(0.001);
    expect(cmp(r, "review_rate").d * 100).toBeGreaterThanOrEqual(3.9);
    expect(cmp(r, "review_rate").d * 100).toBeLessThanOrEqual(4.6);
  });

  it("#3 client_events: 실험군 작성률이 server_db 보다 0.6~1.0%p 높고 INSTRUMENTATION", () => {
    const server = simulateDaangn(p1());
    const client = simulateDaangn(p1({ data_source: "client_events" }));
    const diff = (rate(client, "review_rate", "B") - rate(server, "review_rate", "B")) * 100;
    expect(diff).toBeGreaterThanOrEqual(0.6);
    expect(diff).toBeLessThanOrEqual(1.0);
    expect(client.flags).toContain("INSTRUMENTATION");
    expect(server.flags).not.toContain("INSTRUMENTATION");
  });

  it("#4 install_all + all_assigned (mde_pp=2): 효과 약 0.15%p 로 통계적으로는 유의하지만 MDE 에 한참 못 미쳐 UNDERPOWERED", () => {
    const r = simulateDaangn(p1({ assignment_timing: "install_all", analysis_population: "all_assigned", mde_pp: 2 }));
    const c = cmp(r, "review_rate");
    expect(Math.abs(c.d) * 100).toBeLessThan(0.3);
    expect(c.d * 100).toBeGreaterThan(0.1);
    expect(c.significant).toBe(true);
    expect(r.flags).toContain("UNDERPOWERED");
    // MDE 를 0.6%p 이하로 잡으면 MDE 비교 규칙이 꺼져서 UNDERPOWERED 가 사라진다
    expect(simulateDaangn(p1({ assignment_timing: "install_all", analysis_population: "all_assigned", mde_pp: 0.6 })).flags).not.toContain("UNDERPOWERED");
  });

  it("§3-3 install_all 로 배정하고 화면 진입자로 좁혀 분석하면 정당한 트리거 분석: review_screen_open 배정과 같은 결과", () => {
    const trig = simulateDaangn(p1({ assignment_timing: "install_all", analysis_population: "review_screen_open" }));
    const base = simulateDaangn(p1());
    expect(trig.metrics).toEqual(base.metrics);
    expect(trig.flags).toEqual(base.flags);
  });

  it("#5 metric_definition=started: 효과 6~8%p, GOODHART", () => {
    const r = simulateDaangn(p1({ metric_definition: "started" }));
    expect(cmp(r, "review_rate").d * 100).toBeGreaterThanOrEqual(6);
    expect(cmp(r, "review_rate").d * 100).toBeLessThanOrEqual(8);
    expect(r.flags).toContain("GOODHART");
    // 클라이언트 이벤트로 세면 중복 이벤트까지 얹혀 약 9%p
    const client = cmp(simulateDaangn(p1({ metric_definition: "started", data_source: "client_events" })), "review_rate").d * 100;
    expect(client).toBeGreaterThan(8);
    expect(client).toBeLessThan(10);
  });

  it("#6 user_id_hash + 새 salt + 첫 실행 배정 + 서버: SRM 없음, 효과 3.8~4.2%p, 짧은 후기 +2.7~3.3%p", () => {
    const r = simulateDaangn(p2());
    expect(r.srm!.p).toBeGreaterThan(0.001);
    const d = cmp(r, "review_rate");
    expect(d.d * 100).toBeGreaterThanOrEqual(3.8);
    expect(d.d * 100).toBeLessThanOrEqual(4.2);
    expect(d.significant).toBe(true);
    const s = cmp(r, "short_review_rate");
    expect(s.d * 100).toBeGreaterThanOrEqual(2.7);
    expect(s.d * 100).toBeLessThanOrEqual(3.3);
    expect(s.significant).toBe(true);
    expect(r.flags).toEqual([]);
  });

  it("#7 salt=reuse_previous: 효과 4.6~5.2%p, CARRYOVER", () => {
    const r = simulateDaangn(p2({ salt: "reuse_previous" }));
    expect(cmp(r, "review_rate").d * 100).toBeGreaterThanOrEqual(4.6);
    expect(cmp(r, "review_rate").d * 100).toBeLessThanOrEqual(5.2);
    expect(r.flags).toContain("CARRYOVER");
  });

  it("#8 device_id: 중복 사용자 5~7%, 효과는 소폭 희석", () => {
    const base = simulateDaangn(p2());
    const r = simulateDaangn(p2({ assignment_key: "device_id" }));
    expect(dupShare(r)).toBeGreaterThanOrEqual(0.05);
    expect(dupShare(r)).toBeLessThanOrEqual(0.07);
    expect(cmp(r, "review_rate").d).toBeLessThan(cmp(base, "review_rate").d);
    expect(cmp(r, "review_rate").d).toBeGreaterThan(cmp(base, "review_rate").d * 0.9);
  });

  it("#9 user + listing_creation_rate, 14일: 상대 +2.6~3.4% 유의", () => {
    const r = simulateDaangn(p3());
    const c = cmp(r, "listing_creation_rate");
    expect(c.rel * 100).toBeGreaterThanOrEqual(2.6);
    expect(c.rel * 100).toBeLessThanOrEqual(3.4);
    expect(c.significant).toBe(true);
  });

  it("#10 user + sell_through_7d: 상대 +0.5~0.9%, CONTAMINATION. 7일부터 유의(검정력 7일 ≈0.59, 14일 ≈0.87)", () => {
    const r = simulateDaangn(p3({ primary: "sell_through_7d" }));
    const c = cmp(r, "sell_through_7d");
    expect(c.rel * 100).toBeGreaterThanOrEqual(0.5);
    expect(c.rel * 100).toBeLessThanOrEqual(0.9);
    expect(c.significant).toBe(true);
    expect(r.flags).toContain("CONTAMINATION");
    expect(r.achievedPower!).toBeCloseTo(0.87, 1);
    const w1 = simulateDaangn(p3({ primary: "sell_through_7d", duration_days: 7 }));
    expect(cmp(w1, "sell_through_7d").significant).toBe(true);
    expect(w1.achievedPower!).toBeCloseTo(0.59, 1);
  });

  it("#11 neighborhood + cluster_robust, 28일: 판매완료율 상대 +1.2~1.8%, CI 폭이 naive 의 2배 이상", () => {
    const robust = simulateDaangn(p3({ randomization_unit: "neighborhood", primary: "sell_through_7d", analysis_se: "cluster_robust", duration_days: 28 }));
    const naive = simulateDaangn(p3({ randomization_unit: "neighborhood", primary: "sell_through_7d", analysis_se: "naive", duration_days: 28 }));
    const c = cmp(robust, "sell_through_7d");
    expect(c.rel * 100).toBeGreaterThanOrEqual(1.2);
    expect(c.rel * 100).toBeLessThanOrEqual(1.8);
    expect(ciWidth(robust, "sell_through_7d")).toBeGreaterThanOrEqual(2 * ciWidth(naive, "sell_through_7d"));
    expect(robust.flags).not.toContain("NAIVE_SE");
    // 동네는 개별로 만들지 않고 평균 크기로만 다룬다: 28일이면 동네당 검색 사용자 약 1,723명
    expect((robust.panels.clusters as { meanUsersPerNeighborhood: number }).meanUsersPerNeighborhood).toBe(1723);
  });

  it("#12 neighborhood + naive: NAIVE_SE, A/A 400회 위양성률 15% 이상", () => {
    const design = p3({ randomization_unit: "neighborhood", primary: "sell_through_7d", analysis_se: "naive", aa: true });
    expect(simulateDaangn(design).flags).toContain("NAIVE_SE");
    let hit = 0;
    const runs = 400;
    for (let seed = 1; seed <= runs; seed++) {
      const r = simulateDaangn(design, { seed, withTruth: false });
      if (cmp(r, "sell_through_7d").p < 0.05) hit++;
    }
    expect(hit / runs).toBeGreaterThanOrEqual(0.15);
    // 올바른 SE 는 5% 근처
    const ok = p3({ randomization_unit: "neighborhood", primary: "sell_through_7d", analysis_se: "cluster_robust", aa: true });
    let okHit = 0;
    for (let seed = 1; seed <= runs; seed++) if (cmp(simulateDaangn(ok, { seed, withTruth: false }), "sell_through_7d").p < 0.05) okHit++;
    expect(okHit / runs).toBeLessThan(0.1);
  });

  it("#13 결정성·CRN: 동일 설계는 동일 출력, 조 화면에는 숨김 정보가 없다", () => {
    for (const d of [p1(), p2(), p3()]) expect(simulateDaangn(d)).toEqual(simulateDaangn(d));
    const r = simulateDaangn(p1({ data_source: "client_events", metric_definition: "started" }));
    const team = JSON.stringify(toTeamView(r));
    for (const leak of ["INSTRUMENTATION", "GOODHART", "achievedPower", "_truth", "flags"]) expect(team).not.toContain(leak);
  });
});

describe("당근 입력 검증", () => {
  it("p2 는 s2 설계 없이 제출하면 안내와 함께 거부된다", () => {
    expect(() => simulateDaangn({ phase: "p2", assignment_key: "user_id_hash", salt: "new_per_experiment", new_user_policy: "exclude", logging: "server_events", rerun_aa: false })).toThrow(SimulationRejected);
  });
  it("A/A 를 설계에서 고르지 않았으면 A/A 실행은 거부된다", () => {
    expect(() => simulateDaangn(p1({ run_aa_first: false, aa: true }))).toThrow(SimulationRejected);
  });
  it("배정보다 넓은 분석 모집단은 거부된다 (all_assigned 는 '배정된 전원'이라 언제나 허용)", () => {
    expect(() => simulateDaangn(p1({ assignment_timing: "review_screen_open", analysis_population: "review_received" }))).toThrow(SimulationRejected);
    expect(() => simulateDaangn(p1({ assignment_timing: "review_screen_open", analysis_population: "all_assigned" }))).not.toThrow();
    expect(() => simulateDaangn(p1({ assignment_timing: "review_received", analysis_population: "all_assigned" }))).not.toThrow();
  });
  it("중간 확인: 표본이 커서 peek_stop·sequential 은 대부분 1일차에 멈추고, PEEKED 는 peek_stop 에만. A/A 는 항상 fixed", () => {
    for (const make of [p1, p2]) {
      const peek = simulateDaangn(make({ stopping: "peek_stop" }));
      expect(peek.stoppedAt).toBe(1);
      expect(peek.flags).toContain("PEEKED");
      const seq = simulateDaangn(make({ stopping: "sequential" }));
      expect(seq.stoppedAt).toBe(1);
      expect(seq.flags).not.toContain("PEEKED");
      const aa = simulateDaangn(make({ stopping: "peek_stop", aa: true, aa_days: 7 }));
      expect(aa.stoppedAt).toBe(7);
      expect(aa.flags).not.toContain("PEEKED");
    }
  });
  it("필수 칸이 비면 validateDesign 이 한국어 메시지를 돌려준다", () => {
    const v = validateDesign({ phase: "p3" });
    expect(v.ok).toBe(false);
  });
  it("플러그인이 phase 접두로 시뮬을 라우팅하고 진단 단계는 거부한다", () => {
    expect(daangnPlugin.simulate("p3", p3() as never, { prior: {} }).caseKey).toBe("daangn");
    expect(() => daangnPlugin.simulate("diagnose", {} as never, { prior: {} })).toThrow(SimulationRejected);
  });
});
