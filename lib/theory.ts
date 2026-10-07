/**
 * 이론 수업(덱 docs/lecture/ab-testing-theory.pptx, 위키 docs/ab-testing/*.md)과 실습을 잇는 개념 표.
 * 클라이언트 번들에 들어가므로 숨긴 효과·플래그 이름·루브릭을 담지 않는다. 덱이 바뀌면 이 파일만 고친다.
 */
export type TheoryEntry = { title: string; chapter: 2 | 3 | 4; slides: string; wiki?: string };

const e = (title: string, chapter: 2 | 3 | 4, slides: string, wiki?: string): TheoryEntry => ({ title, chapter, slides, wiki });

export const THEORY = {
  hypothesis: e("가설 문장 구조", 2, "17", "02-hypothesis"),
  tails: e("단측·양측 검정", 2, "20", "02-hypothesis"),
  non_inferiority: e("비열등성 검정", 2, "21", "02-hypothesis"),
  metric_layers: e("지표 층", 2, "22~26", "03-metrics"),
  goodhart: e("Goodhart의 법칙", 2, "27", "03-metrics"),
  predefine: e("사전 정의", 2, "28", "03-metrics"),
  unit: e("실험 단위", 2, "30", "04-experimental-unit"),
  trigger: e("트리거 분석", 2, "32"),
  error_power: e("1·2종 오류와 검정력", 2, "33~34"),
  randomization: e("무작위 배정과 SUTVA", 2, "35~36", "01-why-ab-testing"),
  aa_test: e("A/A 테스트", 3, "39"),
  duration: e("실험 기간", 3, "40"),
  analysis_unit: e("배정 단위와 분석 단위", 3, "42", "04-experimental-unit"),
  inference: e("p-value·신뢰구간·효과 크기", 3, "43~45"),
  cuped: e("CUPED", 3, "46"),
  multiple_testing: e("다중검정", 3, "47"),
  peeking: e("Peeking", 3, "48"),
  novelty: e("Novelty·Primacy 효과", 3, "49"),
  repeat_exposure: e("반복 노출", 3, "51", "04-experimental-unit"),
  sequential: e("Sequential Testing", 4, "53"),
  simpson: e("심슨의 역설", 4, "54"),
  srm: e("Sample Ratio Mismatch", 4, "55"),
  contamination: e("그 밖의 오염 신호", 4, "56"),
} as const satisfies Record<string, TheoryEntry>;

export type TheoryKey = keyof typeof THEORY;

const WIKI_BASE = "https://github.com/kkamret/quickmart-lab-rats/blob/main/docs/ab-testing/";

/** 입력란·경고 옆 작은 배지. 개념 이름은 빼고 챕터·슬라이드만 보여 준다(정답 공개 전 함정 이름을 숨기는 규칙). */
export const theoryBadge = (k: TheoryKey) => `Ch${THEORY[k].chapter}·${THEORY[k].slides}`;

/** "Ch2 · 가설 문장 구조 (덱 17장)" */
export const theoryLabel = (k: TheoryKey) => `Ch${THEORY[k].chapter} · ${THEORY[k].title} (덱 ${THEORY[k].slides}장)`;

export const wikiHref = (k: TheoryKey): string | undefined => {
  const w = THEORY[k].wiki;
  return w ? `${WIKI_BASE}${w}.md` : undefined;
};

/** 폼 입력란 이름 → 개념. 사례마다 formMeta 를 고치지 않고 AutoForm 이 이 표로 배지를 붙인다. */
export const FIELD_THEORY: Record<string, TheoryKey> = {
  hypothesis: "hypothesis",
  "hypothesis.action": "hypothesis", "hypothesis.behavior": "hypothesis", "hypothesis.impact": "hypothesis",
  "hypothesis_type.push_ctr": "tails", "hypothesis_type.clicks_per_user": "non_inferiority", "hypothesis_type.app_open_au": "non_inferiority",
  ni_margin_pct: "non_inferiority",
  "metrics.primary": "metric_layers", "metrics.guardrails": "metric_layers", "metrics.secondary": "metric_layers",
  primary: "metric_layers", guardrails: "metric_layers", secondary: "metric_layers", abn_primary: "metric_layers",
  metric_definition: "metric_layers", primary_metric_definition: "metric_layers",
  unit: "unit", randomization_unit: "unit", assignment_key: "unit",
  ctr_analysis_unit: "analysis_unit", analysis_population: "trigger", assignment_timing: "trigger",
  alpha: "error_power", power: "error_power", mde_pp: "error_power", mde_pct: "error_power",
  duration_days: "duration", duration_weeks: "duration", il_days: "duration", abn_weeks: "duration",
  stopping: "peeking", ramp: "novelty", exclude_first_week: "novelty", include_ramp_days: "novelty",
  cuped: "cuped", correction: "multiple_testing",
  run_aa_first: "aa_test", rerun_aa: "aa_test", aa_days: "aa_test",
  count_basis: "trigger", data_source: "contamination",
};

/** 스텝 상단 "이론 복습" 줄. 함정 이름이 드러나지 않는 개념만 둔다(s7 은 처음부터 함정 학습이라 예외). */
export const STEP_THEORY: Partial<Record<string, TheoryKey[]>> = {
  s1_diagnose: ["hypothesis"],
  s2_design: ["hypothesis", "metric_layers", "unit", "error_power", "predefine"],
  s3_run: ["duration", "randomization"],
  s4_readout: ["inference", "analysis_unit"],
  s6_final: ["predefine", "inference"],
  s7_lab: ["peeking", "simpson", "srm"],
};
