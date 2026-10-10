/**
 * 폼 초기값. 성패를 가르는 선택(메인 지표, 단위, 중간 확인 규칙)은 비워 두어 조가 직접 고르게 한다.
 * 앞 Phase 에서 제출한 설계가 있으면 이어받는다.
 */
type Obj = Record<string, unknown>;

const blankP1 = (): Obj => ({
  phase: "p1",
  hypothesis: { action: "", behavior: "", impact: "" },
  scope: { os: "android", surface: "store_home" },
  metrics: { guardrails: [], secondary: [] },
  alpha: 0.05,
  power: 0.8,
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
  // 가설은 단계마다 새로 쓴다: P2 는 P1 과 같은 Treatment 를 넓히는 단계라 이어받고, P3·P4 는 다른 Treatment 라 비워 둔다.
  const base: Obj = { ...blankP1(), ...(prev ?? {}), ...(sim === "p3" || sim === "p4" ? { hypothesis: blankP1().hypothesis } : {}) };
  if (sim === "p2") return { ...base, phase: "p2", scope: { os: "all", surface: "all" }, count_basis: "exposure" };
  if (sim === "p3") {
    return {
      ...base, phase: "p3", trigger_logging: false, coupon_ops: "low",
      metrics: { ...(base.metrics as Obj), primary: "conv" },
    };
  }
  // P4 는 B(항상 노출)와 C(부족 금액 8천 원 이하만)를 한 실험에서 비교하는 단계다(docs §0, Phase 안내 문장). C 를 빼고 시작하면
  // C 의 평균주문금액 하락이라는 이 단계의 핵심 발견이 나올 수 없으므로 세 그룹으로 시작한다(조가 그룹을 뺄 수는 있다).
  return { ...base, phase: "p4", arms: ["A", "B", "C"], correction: "none", metrics: { ...(base.metrics as Obj), primary: "conv" } };
}
