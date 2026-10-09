/**
 * 이론 수업(덱, 위키 docs/ab-testing/*.md)과 실습을 잇는 개념 표. 덱은 팀원이 레이아웃을 따로 만들고 있어 슬라이드 번호는 두지 않고 챕터만 안내한다.
 * 클라이언트 번들에 들어가므로 숨긴 효과·플래그 이름·루브릭을 담지 않는다. 덱이 바뀌면 이 파일만 고친다.
 */
export type TheoryChapter = 1 | 2 | 3 | 4 | 5;
export type TheoryEntry = {
  title: string;
  chapter: TheoryChapter;
  /** 정답 공개 뒤 카드에만 보이는 짧은 풀이. docs/theory-coverage.md 패러프레이즈 은행 문장만 쓴다. */
  note?: string;
  /** 함정 개념: 정답 공개 전에는 이름·풀이를 팀 화면에 두지 않는다(챕터 배지만 허용). */
  revealOnly?: true;
};

const e = (title: string, chapter: TheoryChapter, extra: { note?: string; revealOnly?: true } = {}): TheoryEntry => ({ title, chapter, ...extra });

export const THEORY = {
  hypothesis: e("가설 문장 구조", 2),
  tails: e("단측·양측 검정", 2),
  non_inferiority: e("비열등성 검정", 2, { note: "비열등성은 허용할 손실(마진)을 먼저 정하고, 신뢰구간 하한이 마진보다 위인지 확인해요.", revealOnly: true }),
  metric_layers: e("지표 층", 2),
  goodhart: e("Goodhart의 법칙", 2, { note: "지표가 목표가 되면 숫자는 좋아져도, 그 숫자가 대변하던 가치는 나빠질 수 있어요.", revealOnly: true }),
  predefine: e("사전 정의", 2),
  unit: e("실험 단위", 2),
  trigger: e("트리거 분석", 2, { note: "트리거 분석은 조건을 충족한 사람만 비교해요. 대조군도 같은 기준으로 골라야 해서 조건을 기록해 둬요.", revealOnly: true }),
  error_power: e("1·2종 오류와 검정력", 2),
  randomization: e("무작위 배정 방식", 2),
  aa_test: e("A/A 테스트", 3),
  duration: e("실험 기간", 3),
  analysis_unit: e("배정 단위와 분석 단위", 3, { note: "같은 사용자의 관측은 서로 닮아서, 개수만큼 독립적인 정보가 있는 게 아니에요. 배정 단위와 분석 단위가 다르면 묶여 있다는 사실을 반영해 표준오차를 계산해요.", revealOnly: true }),
  inference: e("p-value·신뢰구간·효과 크기", 3),
  cuped: e("CUPED", 3),
  multiple_testing: e("다중검정", 3, { note: "효과가 없어도 지표를 많이 보면 하나쯤은 우연히 유의하게 나와요.", revealOnly: true }),
  peeking: e("Peeking", 3),
  novelty: e("Novelty·Primacy 효과", 3, { revealOnly: true }),
  repeat_exposure: e("반복 노출", 3, { note: "효과가 처음부터 끝까지 같다는 보장은 없어서, 시작 후 일차별 추이를 함께 봐요.", revealOnly: true }),
  sequential: e("Sequential Testing", 4),
  simpson: e("심슨의 역설", 4),
  srm: e("Sample Ratio Mismatch", 4),
  contamination: e("그 밖의 오염 신호", 4),
  alpha_power: e("α와 Power", 2),
  mde: e("MDE 정하기", 2),
  allocation: e("배정 비율", 2),
  north_star: e("노스스타와 OEC", 2),
  driver: e("Driver 지표", 2),
  session_unit: e("세션 단위", 2),
  ratio_metric: e("비율 지표", 2, { note: "처치가 비율 지표의 분모를 바꾸면, 분자가 그대로여도 비율이 오를 수 있어요.", revealOnly: true }),
  ramp_up: e("램프업", 3),
  interference: e("간섭", 4, { revealOnly: true }),
  interference_fix: e("간섭 줄이기", 4, { revealOnly: true }),
  ethics: e("윤리", 4),
  ab_n: e("A/B/n", 1, { note: "A/B/n은 대조군 하나에 실험군을 둘 이상 두고 비교하는 형태예요." }),
  decision: e("배포·접기·재실험 결정", 5, { note: "신뢰구간 전체가 0보다 위이고 크기도 의미 있으면 배포하되, 비용과 리스크를 확인하고 단계적으로 출시해요." }),
  data_informed: e("데이터 기반 의사결정", 5, { note: "데이터 기반 의사결정은 A/B 테스트뿐 아니라 조사, 유지보수 비용 추정 같은 여러 데이터로 판단한다는 뜻이에요." }),
  interleaving: e("인터리빙", 5, { note: "인터리빙은 두 랭킹 알고리즘의 결과를 한 목록에 섞어 어느 쪽이 클릭되는지 봐요." }),
  proxy_metric: e("대리 지표(proxy)", 2, { note: "측정하는 지표는 대부분 진짜 원하는 가치를 대신 재는 proxy예요." }),
  tail_metric: e("꼬리가 긴 지표", 3, { note: "평균을 비교하는 지표에서 꼬리가 길면 상한 처리나 로그 변환을 고려해요." }),
  twyman: e("트위먼의 법칙", 3, { note: "흥미롭거나 이상할 만큼 좋은 숫자는 대개 틀렸으니, 기뻐하기 전에 데이터부터 확인해요.", revealOnly: true }),
  hashing: e("해싱 배정", 2, { note: "ID를 해시해 버킷을 정하면 같은 사용자는 항상 같은 그룹에 들어가요.", revealOnly: true }),
  identifier: e("사용자 식별자", 2, { note: "식별자는 사람의 근사치일 뿐, 어떤 식별자도 사람을 완벽히 대표하지 못해요.", revealOnly: true }),
} as const satisfies Record<string, TheoryEntry>;

export type TheoryKey = keyof typeof THEORY;

/** 입력란·경고 옆 작은 배지. 개념 이름은 빼고 챕터만 보여 준다(정답 공개 전 함정 이름을 숨기는 규칙). */
export const theoryBadge = (k: TheoryKey) => `Ch${THEORY[k].chapter}`;

/** 정답 공개 전 배지 툴팁. 개념 이름을 담지 않는다. */
export const NEUTRAL_BADGE_TITLE = "이론 수업 챕터";

/** "Ch3" (개념 이름 없이 챕터만) */
export const theoryChapterOnly = (k: TheoryKey) => `Ch${THEORY[k].chapter}`;

/** 정답 공개 뒤 카드에 쓰는 짧은 풀이(없으면 undefined). */
export const theoryNote = (k: TheoryKey): string | undefined => (THEORY[k] as TheoryEntry).note;

/** "Ch2 · 가설 문장 구조" */
export const theoryLabel = (k: TheoryKey) => `Ch${THEORY[k].chapter} · ${THEORY[k].title}`;

/** 다리 문장의 개념 라벨: revealOnly 개념은 챕터만("Ch2"), 그 밖은 "Ch2 · 가설 문장 구조" */
export const introTheoryLabel = (k: TheoryKey) => ("revealOnly" in THEORY[k] ? theoryChapterOnly(k) : theoryLabel(k));

/** "왜 이 선택지?" 줄의 근거 배지: 챕터면 "Ch3", 사례 문서면 "사례". 개념 이름은 담지 않는다. */
export const whyBadge = (src: TheoryChapter | "case") => (src === "case" ? "사례" : `Ch${src}`);

/** 사례 근거 배지의 툴팁 */
export const CASE_BADGE_TITLE = "사례 문서";

/** 근거 배지 툴팁: 챕터는 NEUTRAL_BADGE_TITLE, 사례는 CASE_BADGE_TITLE (개념 이름 없음) */
export const whyBadgeTitle = (src: TheoryChapter | "case") => (src === "case" ? CASE_BADGE_TITLE : NEUTRAL_BADGE_TITLE);

/** 폼 입력란 이름 → 개념. 사례마다 formMeta 를 고치지 않고 AutoForm 이 이 표로 배지를 붙인다. */
export const FIELD_THEORY: Record<string, TheoryKey> = {
  hypothesis: "hypothesis",
  "hypothesis.action": "hypothesis", "hypothesis.behavior": "hypothesis", "hypothesis.impact": "hypothesis",
  "hypothesis_type.push_ctr": "tails", "hypothesis_type.clicks_per_user": "non_inferiority", "hypothesis_type.app_open_au": "non_inferiority",
  ni_margin_pct: "non_inferiority",
  "metrics.primary": "metric_layers", "metrics.guardrails": "metric_layers", "metrics.secondary": "driver",
  primary: "metric_layers", guardrails: "metric_layers", secondary: "driver", abn_primary: "metric_layers",
  metric_definition: "metric_layers", primary_metric_definition: "metric_layers",
  unit: "unit", randomization_unit: "unit", assignment_key: "unit",
  ctr_analysis_unit: "analysis_unit", analysis_population: "trigger", assignment_timing: "trigger",
  alpha: "alpha_power", power: "alpha_power", mde_pp: "mde", mde_pct: "mde",
  duration_days: "duration", duration_weeks: "duration", il_days: "duration", abn_weeks: "duration",
  stopping: "peeking", ramp: "ramp_up", exclude_first_week: "novelty", analysis_mode: "simpson",
  cuped: "cuped", correction: "multiple_testing",
  run_aa_first: "aa_test", rerun_aa: "aa_test", aa_days: "aa_test",
  trigger_logging: "trigger", il_credit: "goodhart", arms: "ab_n", qualitative_weight: "data_informed", hours_treatment: "tail_metric", salt: "hashing",
  count_basis: "trigger", data_source: "contamination", analysis_se: "interference_fix",
};

/** 스텝 상단 "이론 복습" 줄. 함정 이름이 드러나지 않는 개념만 둔다(s7 은 처음부터 함정 학습이라 예외). */
export const STEP_THEORY: Partial<Record<string, TheoryKey[]>> = {
  s1_diagnose: ["hypothesis"],
  s2_design: ["hypothesis", "metric_layers", "unit", "error_power", "predefine", "alpha_power", "mde", "allocation"],
  s3_run: ["duration", "randomization", "ramp_up"],
  s4_readout: ["inference"],
  s6_final: ["predefine", "inference", "decision", "ethics"],
  s7_lab: ["peeking", "simpson", "srm"],
};

/** 스텝 이론 복습 줄에 개념 이름을 보여 줘도 되는 스텝. 그 밖의 스텝은 챕터만 보여 준다. */
export const TITLED_STEPS: ReadonlySet<string> = new Set(["s1_diagnose", "s2_design", "s3_run", "s6_final", "s7_lab"]);
