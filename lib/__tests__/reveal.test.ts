import { describe, expect, it, vi } from "vitest";
import { baeminPlugin } from "@/lib/cases/baemin";
import { mockShareReview, scrubShareReview, leaksFlag } from "@/lib/review/prompts";
import { shareReviewSchema } from "@/lib/review/types";
import type { Readout } from "@/lib/sim/core";
import { simulateBaemin } from "@/lib/cases/baemin";
import { buildReveal, latestDecisionPicks, latestRunPerPhase, type RunRow } from "../reveal";

vi.mock("server-only", () => ({}));

const readout = (flags: Readout["flags"], power?: number) => ({ caseKey: "baemin", phase: "p1", designHash: "h", periods: [], metrics: [], panels: {}, flags, achievedPower: power }) as Readout;
const run = (phase: string, at: string, flags: Readout["flags"], aa = false, team = "t1"): RunRow => ({
  team_id: team, phase, design: aa ? { aa: true } : {}, result: readout(flags, 0.4), created_at: at,
});

describe("정답 공개", () => {
  it("조의 Phase 별 최신 본 실험만 고른다 (A/A, 다른 조 제외)", () => {
    const m = latestRunPerPhase([
      run("p1", "2026-01-01", ["SRM"]), run("p1", "2026-01-02", ["PEEKED"]), run("p1", "2026-01-03", ["NOVELTY"], true), run("p1", "2026-01-04", ["SRM"], false, "t2"),
    ], "t1");
    expect(m.get("p1")!.result.flags).toEqual(["PEEKED"]);
    expect(m.size).toBe(1);
  });

  it("시간대 표기가 섞여도 시각이 가장 늦은 실행을 고른다", () => {
    const m = latestRunPerPhase([run("p1", "2026-10-04T09:00:00+09:00", ["SRM"]), run("p1", "2026-10-04T01:00:00Z", ["PEEKED"])], "t1");
    expect(m.get("p1")!.result.flags).toEqual(["PEEKED"]);
  });

  it("원문 비교 해설은 Phase 가 속한 스텝에 붙고, 함정은 이름과 함께 나온다", () => {
    const out = buildReveal(baeminPlugin, [run("p1", "2026-01-02", ["SRM", "PEEKED"])], "t1");
    expect(out.items.length).toBeGreaterThan(0);
    for (const i of out.items) expect(baeminPlugin.phases.some((p) => p.step === i.step)).toBe(true);
    expect(out.flags).toHaveLength(1);
    expect(out.flags[0].flags.map((f) => f.code)).toEqual(["SRM", "PEEKED"]);
    expect(out.flags[0].flags[0].label).toBeTruthy();
    expect(out.flags[0].achievedPower).toBe(0.4);
  });
});

describe("정답 공개: 결정 판정과 플래그 설명", () => {
  const hyp = { action: "a", behavior: "b", impact: "i" };
  const design = {
    phase: "p1", hypothesis: hyp, scope: { os: "android", surface: "store_home" }, unit: "user",
    metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov"] },
    alpha: 0.05, power: 0.8, duration_days: 14, allocation: 1, ramp: "none", analysis_mode: "pooled", stopping: "fixed", count_basis: "assignment",
  };
  const realRun = (d: Record<string, unknown>, at = "2026-01-02"): RunRow => ({ team_id: "t1", phase: "p1", design: d, result: simulateBaemin(d), created_at: at });

  it("결정 제출 중 Phase 별 최신 버전의 옵션만 고른다", () => {
    const picks = latestDecisionPicks([
      { phase: "p1", version: 1, payload: { option: "no_deploy" } },
      { phase: "p1", version: 2, payload: { option: "deploy" } },
      { phase: "p2", version: 1, payload: { option: 3 } }, // 문자열이 아니면 무시
      { phase: "p3", version: 1, payload: {} },
    ]);
    expect(picks).toEqual({ p1: "deploy" });
  });

  it("조의 결정을 실제 결과로 판정해 결정 스텝에 붙인다", () => {
    const out = buildReveal(baeminPlugin, [realRun(design)], "t1", { p1: "deploy" });
    expect(out.decisions).toHaveLength(1);
    const dec = out.decisions[0];
    expect(dec.step).toBe("s4_readout");
    expect(dec.option).toBe("배포");
    expect(dec.verdict).toBe("correct");
    expect(dec.reason).toContain("MDE");
  });

  it("결정이 없거나 실행 결과가 없으면 판정을 만들지 않는다", () => {
    expect(buildReveal(baeminPlugin, [realRun(design)], "t1").decisions).toEqual([]);
    expect(buildReveal(baeminPlugin, [], "t1", { p1: "deploy" }).decisions).toEqual([]);
    expect(buildReveal(baeminPlugin, [realRun(design)], "t1", { p1: "nope" }).decisions).toEqual([]);
  });

  it("플래그에 설명(why)과 안내(notes)가 따라온다", () => {
    const short = buildReveal(baeminPlugin, [realRun({ ...design, duration_days: 10 })], "t1");
    const sd = short.flags[0].flags.find((f) => f.code === "SHORT_DURATION");
    expect(sd?.why).toContain("요일 주기");
    expect(short.flags[0].notes).toEqual([]);
  });
});

describe("직소 브리핑", () => {
  const input = {
    step: "s8_share",
    teams: [
      { team: "1조", case: "baemin", flags: ["SRM" as const], decisions: ["P1 결정: 배포 — 표본이 충분해요"], memo: { learned: "SRM 이 중요", lesson: "먼저 의심하자" } },
      { team: "2조", case: "toss", flags: [], decisions: [], memo: null },
    ],
  };

  it("mock 브리핑은 스키마를 지키고 조마다 하나씩 나온다", () => {
    const out = mockShareReview(input);
    expect(shareReviewSchema.safeParse(out).success).toBe(true);
    expect(out.briefs.map((b) => b.team)).toEqual(["1조", "2조"]);
    expect(out.briefs[0].traps_we_hit.length).toBe(1);
  });

  it("정답 공개 전에는 함정 이름이 든 문장을 뺀다", () => {
    const out = mockShareReview(input);
    expect(out.briefs[0].traps_we_hit.some(leaksFlag)).toBe(true);
    const scrubbed = scrubShareReview(out);
    expect(scrubbed.briefs[0].traps_we_hit).toEqual([]);
    expect(JSON.stringify(scrubbed)).not.toMatch(/SRM|표본 비율 불일치/);
    // 입력은 바뀌지 않는다
    expect(out.briefs[0].traps_we_hit.length).toBe(1);
  });
});
