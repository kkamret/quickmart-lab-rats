import { describe, expect, it, vi } from "vitest";
import { simulateBaemin } from "@/lib/cases/baemin";
import { baeminPlugin } from "@/lib/cases/baemin";
import { runSimulation } from "@/lib/lab/sim-service";
import { buildBoard, type SimRunRow, type SubmissionRow, type TeamRow } from "../board";

vi.mock("server-only", () => ({}));

const hyp = { action: "안내해요", behavior: "바로 주문해요", impact: "이탈이 줄어요" };
const p1 = (over: Record<string, unknown> = {}) => ({
  phase: "p1", hypothesis: hyp, scope: { os: "android", surface: "store_home" }, unit: "user",
  metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov"] },
  alpha: 0.05, power: 0.8, mde_pp: 2, duration_days: 14, allocation: 1, ramp: "none", analysis_mode: "pooled",
  stopping: "fixed", count_basis: "assignment", ...over,
});

const teams: TeamRow[] = [
  { id: "t1", name: "1조", case_key: "baemin" },
  { id: "t2", name: "2조", case_key: "baemin" },
  { id: "t3", name: "3조", case_key: null },
];
const run = (team: string, design: Record<string, unknown>, at: string, createdDesign = design): SimRunRow => {
  const result = simulateBaemin(design as never);
  return { team_id: team, case_key: "baemin", phase: "p1", design: createdDesign, design_hash: result.designHash, result, created_at: at };
};

describe("buildBoard", () => {
  it("제출은 (step, phase, kind) 별 최신 버전만 남긴다", () => {
    const subs: SubmissionRow[] = [
      { team_id: "t1", step: "s2_design", phase: "p1", kind: "design", version: 1, payload: { v: 1 }, created_at: "2026-01-01T00:00:00Z" },
      { team_id: "t1", step: "s2_design", phase: "p1", kind: "design", version: 2, payload: { v: 2 }, created_at: "2026-01-01T00:01:00Z" },
      { team_id: "t2", step: "s2_design", phase: "p1", kind: "design", version: 1, payload: { v: 9 }, created_at: "2026-01-01T00:00:00Z" },
    ];
    const b = buildBoard(teams, subs, []);
    expect(b.teams.find((t) => t.id === "t1")!.submissions).toHaveLength(1);
    expect(b.teams.find((t) => t.id === "t1")!.submissions[0].payload).toEqual({ v: 2 });
    expect(b.teams.find((t) => t.id === "t3")!.submissions).toEqual([]);
  });

  it("같은 사례·Phase 의 조들을 한 비교표로 묶고, A/A 기록은 뺀다", () => {
    const runs = [
      run("t1", p1(), "2026-01-01T00:00:00Z"),
      run("t2", p1({ duration_days: 7, mde_pp: 1 }), "2026-01-01T00:00:00Z"),
      run("t2", p1({ aa: true }), "2026-01-01T00:05:00Z", { ...p1(), aa: true }),
    ];
    const b = buildBoard(teams, [], runs);
    expect(b.comparisons).toHaveLength(1);
    expect(b.comparisons[0].rows.map((r) => r.teamName)).toEqual(["1조", "2조"]);
    const r1 = b.comparisons[0].rows[0];
    expect(r1.primaryKey).toBe("abandon");
    expect(r1.primary[0].arm).toBe("B");
    expect(r1.achievedPower).not.toBeNull();
    // 조마다 설계가 다르면 설계 해시도 다르다
    expect(b.comparisons[0].rows[0].designHash).not.toBe(b.comparisons[0].rows[1].designHash);
  });

  it("같은 조가 여러 번 돌리면 가장 최근 본 실험만 쓴다", () => {
    const runs = [
      run("t1", p1({ duration_days: 7 }), "2026-01-01T00:00:00Z"),
      run("t1", p1({ duration_days: 14 }), "2026-01-01T00:10:00Z"),
    ];
    const rows = buildBoard(teams, [], runs).comparisons[0].rows;
    expect(rows).toHaveLength(1);
    expect(rows[0].design.duration_days).toBe(14);
  });

  it("개념 보드: 걸린 플래그별로 조를 모은다", () => {
    const short = run("t1", p1({ duration_days: 7 }), "2026-01-01T00:00:00Z");
    const b = buildBoard(teams, [], [short]);
    expect(short.result.flags).toContain("SHORT_DURATION");
    expect(b.flagBoard.find((x) => x.flag === "SHORT_DURATION")?.teams.map((t) => t.id)).toEqual(["t1"]);
  });
});

describe("규칙 3: 조 화면 응답에는 flags·진짜 효과 기반 값이 없다", () => {
  it("runSimulation().team 은 flags/achievedPower 가 없고 직렬화해도 나오지 않는다", () => {
    const out = runSimulation(baeminPlugin as never, "p1_run", p1(), "main");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.readout.flags.length + 1).toBeGreaterThan(0); // 원본에는 있다
    const team = out.team as Record<string, unknown>;
    expect("flags" in team).toBe(false);
    expect("achievedPower" in team).toBe(false);
    const json = JSON.stringify(team);
    expect(json).not.toContain('"flags"');
    expect(json).not.toContain("achievedPower");
  });
});
