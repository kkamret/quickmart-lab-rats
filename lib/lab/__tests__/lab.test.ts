import { describe, expect, it, vi } from "vitest";
import { baeminClient } from "@/lib/cases/baemin/ui";
import { getPath, setPath } from "../path";
import { decisionSchema, formatIssues, latestOf, simPhaseOf, stepPhases, submissionKindOf, type Submission } from "../phase";

vi.mock("server-only", () => ({}));

describe("path", () => {
  it("중첩 값을 읽고 불변으로 쓴다", () => {
    const o = { metrics: { primary: "abandon" }, a: 1 };
    expect(getPath(o, "metrics.primary")).toBe("abandon");
    expect(getPath(o, "metrics.nope.x")).toBeUndefined();
    const n = setPath(o, "metrics.guardrails", ["conv"]);
    expect(n).toEqual({ metrics: { primary: "abandon", guardrails: ["conv"] }, a: 1 });
    expect(o).toEqual({ metrics: { primary: "abandon" }, a: 1 });
    expect(setPath({}, "a.b.c", 1)).toEqual({ a: { b: { c: 1 } } });
  });
});

describe("phase 헬퍼", () => {
  it("simPhaseOf", () => {
    expect(simPhaseOf("p1_run")).toBe("p1");
    expect(simPhaseOf("p3_readout")).toBe("p3");
    expect(simPhaseOf("diagnose")).toBe("diagnose");
  });
  it("submissionKindOf: 폼으로 제출하는 Phase 만 kind 가 있다", () => {
    expect(submissionKindOf("design")).toBe("design");
    expect(submissionKindOf("diagnose")).toBe("diagnosis");
    expect(submissionKindOf("decide")).toBe("decision");
    expect(submissionKindOf("run")).toBeNull();
    expect(submissionKindOf("readout")).toBeNull();
  });
  it("스텝별 Phase: s5 는 P2 와 P3 를 순서대로 담는다", () => {
    expect(stepPhases(baeminClient, "s5_deep").map((p) => p.key)).toEqual(["p2", "p2_readout", "p2_decide", "p3", "p3_readout", "p3_decide"]);
    expect(stepPhases(baeminClient, "s3_run").map((p) => p.key)).toEqual(["p1_run"]);
    expect(stepPhases(baeminClient, "s7_lab")).toEqual([]);
  });
  it("latestOf 는 같은 (phase, kind)의 최신 버전", () => {
    const subs: Submission[] = [
      { step: "s2_design", phase: "p1", kind: "design", payload: { v: 1 }, version: 1 },
      { step: "s2_design", phase: "p1", kind: "design", payload: { v: 2 }, version: 2 },
      { step: "s2_design", phase: "p1", kind: "decision", payload: { v: 9 }, version: 5 },
    ];
    expect(latestOf(subs, "p1", "design")!.payload.v).toBe(2);
    expect(latestOf(subs, "p2", "design")).toBeUndefined();
  });
  it("decisionSchema", () => {
    const s = decisionSchema(["a", "b"]);
    expect(s.safeParse({ option: "a", rationale: "이유" }).success).toBe(true);
    expect(s.safeParse({ option: "z", rationale: "이유" }).success).toBe(false);
    expect(s.safeParse({ option: "a", rationale: " " }).success).toBe(false);
  });
});

describe("기본 설계와 폼 검증 메시지", () => {
  it("기본값은 메인 지표·단위·중간 확인 규칙을 비워 둬서 그대로는 제출되지 않는다", () => {
    const d = baeminClient.defaultDesign("p1");
    const r = baeminClient.designSchema.p1.safeParse(d);
    expect(r.success).toBe(false);
    const msgs = formatIssues(r.error!.issues, baeminClient.formMeta.p1);
    expect(msgs.join("\n")).toContain("Primary 지표");
    expect(msgs.join("\n")).toContain("실험 단위");
    expect(msgs.join("\n")).toContain("중간 확인 규칙");
    expect(msgs.join("\n")).toContain("대상과 Treatment");
  });
  it("앞 Phase 설계를 이어받는다: P2 는 P1 의 메인 지표·가설을 유지하되 qa_old_ios=false 로 시작", () => {
    const p1 = { ...baeminClient.defaultDesign("p1"), metrics: { primary: "abandon", guardrails: ["conv"], secondary: [] }, unit: "user" };
    const p2 = baeminClient.defaultDesign("p2", p1) as Record<string, unknown>;
    expect(p2.phase).toBe("p2");
    expect((p2.metrics as { primary: string }).primary).toBe("abandon");
    expect(p2.qa_old_ios).toBe(false);
    expect(p2.unit).toBe("user");
  });
  it("모든 Phase 의 기본값이 폼 메타 이름과 어긋나지 않는다(스키마 키가 폼에 있다)", () => {
    for (const phase of ["p1", "p2", "p3", "p4"]) {
      const names = new Set(baeminClient.formMeta[phase].map((f) => f.name.split(".")[0]));
      const required = Object.keys((baeminClient.designSchema[phase] as unknown as { shape: Record<string, unknown> }).shape).filter((k) => k !== "phase" && k !== "aa");
      for (const k of required) expect(names.has(k), `${phase}.${k}`).toBe(true);
    }
  });
});

describe("서버 시뮬레이션 서비스(runSimulation)", () => {
  const complete = (over: Record<string, unknown> = {}) => ({
    ...baeminClient.defaultDesign("p1"),
    hypothesis: { action: "a", behavior: "b", impact: "c" },
    scope: { os: "android", surface: "store_home" },
    unit: "user", stopping: "fixed", duration_days: 14,
    metrics: { primary: "abandon", guardrails: ["conv"], secondary: [] },
    ...over,
  });

  it("조 화면용 사본에는 flags·achievedPower·'_' 패널이 없다", async () => {
    const { runSimulation } = await import("../sim-service");
    const { getPlugin } = await import("@/lib/cases/registry");
    const out = runSimulation(getPlugin("baemin")!, "p1_run", complete({ unit: "session", stopping: "peek_stop" }), "main");
    expect(out.ok).toBe(true);
    if (!out.ok) return;
    expect(out.readout.flags.length).toBeGreaterThan(0);
    expect(out.readout.achievedPower).toBeDefined();
    const json = JSON.stringify(out.team);
    for (const f of out.readout.flags) expect(json).not.toContain(f);
    expect(json).not.toContain("achievedPower");
    expect(json).not.toContain("_truth");
  });

  it("A/A 모드는 진짜 효과 없이 돌고 설계 해시가 본 실험과 다르다", async () => {
    const { runSimulation } = await import("../sim-service");
    const { getPlugin } = await import("@/lib/cases/registry");
    const plugin = getPlugin("baemin")!;
    const main = runSimulation(plugin, "p1_run", complete(), "main");
    const aa = runSimulation(plugin, "p1_run", complete(), "aa");
    expect(main.ok && aa.ok).toBe(true);
    if (!main.ok || !aa.ok) return;
    expect(aa.readout.designHash).not.toBe(main.readout.designHash);
    const ab = (r: typeof main) => r.team.metrics.find((m) => m.key === "abandon")!.comparisons[0];
    expect(Math.abs(ab(aa).d)).toBeLessThan(Math.abs(ab(main).d));
  });

  it("거부되는 설계는 조 화면에 보여줄 메시지로 돌려준다", async () => {
    const { runSimulation } = await import("../sim-service");
    const { getPlugin } = await import("@/lib/cases/registry");
    const out = runSimulation(getPlugin("baemin")!, "p1_run", complete({ metrics: { primary: "bar_click", guardrails: [], secondary: [] } }), "main");
    expect(out.ok).toBe(false);
    if (!out.ok) expect(out.message).toBe("대조군에는 바가 없어 비교할 수 없어요");
  });
});
