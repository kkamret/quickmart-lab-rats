/**
 * 폼 초기값. 성패를 가르는 선택(메인 지표, 단위, 중간 확인 규칙)은 비워 두어 조가 직접 고르게 한다.
 * 앞 Phase 에서 제출한 설계가 있으면 이어받는다.
 */
type Obj = Record<string, unknown>;

const blankP1 = (): Obj => ({
  phase: "p1",
  hypothesis: { action: "", behavior: "", impact: "" },
  scope: { os: "all", surface: "all" },
  metrics: { guardrails: [], secondary: [] },
  alpha: 0.05,
  power: 0.8,
  mde_pp: 1,
  duration_days: 7,
  allocation: 1,
  ramp: "none",
  analysis_mode: "pooled",
  count_basis: "assignment",
});

export function defaultDesign(phase: string, prev?: Obj): Obj {
  const sim = phase.slice(0, 2);
  if (phase === "diagnose") return { rationale: "" };
  if (sim === "p1") return { ...blankP1(), ...(prev && prev.phase === "p1" ? prev : {}) };
  const base = { ...blankP1(), ...(prev ?? {}) };
  if (sim === "p2") return { ...base, phase: "p2", scope: { os: "all", surface: "all" }, count_basis: "exposure" };
  if (sim === "p3") {
    return {
      ...base, phase: "p3", trigger_logging: false, coupon_ops: "low",
      metrics: { ...(base.metrics as Obj), primary: "conv" },
    };
  }
  return { ...base, phase: "p4", arms: ["A", "B"], correction: "none", metrics: { ...(base.metrics as Obj), primary: "conv" } };
}
