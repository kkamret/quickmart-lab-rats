/**
 * 경고 플래그. 조 화면에는 보이지 않고(CLAUDE.md 절대 규칙 3) 강사 화면과 AI 리뷰 입력에만 쓴다.
 * 공통 15개(docs/sim-core.md §4) + 사례 전용.
 */
export const COMMON_FLAGS = [
  "SRM",
  "UNIT_MISMATCH",
  "SHORT_DURATION",
  "UNDERPOWERED",
  "PEEKED",
  "SIMPSON_RISK",
  "MULTIPLE_TESTING",
  "SELECTION_BIAS",
  "RATIO_COMPOSITION",
  "NAIVE_SE",
  "OFFLINE_ONLINE_GAP",
  "POSITION_BIAS",
  "CONTAMINATION",
  "INSTRUMENTATION",
  "NOVELTY",
] as const;

/** 사례 문서에서 따로 정의한 플래그: 당근 GOODHART(+넷플릭스 공용) · CARRYOVER */
export const CASE_FLAGS = ["GOODHART", "CARRYOVER", "STAKEHOLDER_EVENT"] as const;

export const ALL_FLAGS = [...COMMON_FLAGS, ...CASE_FLAGS] as const;
export type Flag = (typeof ALL_FLAGS)[number];

export const FLAG_LABELS: Record<Flag, string> = {
  SRM: "표본 비율 불일치",
  UNIT_MISMATCH: "배정 단위와 분석 단위 불일치",
  SHORT_DURATION: "기간이 짧음",
  UNDERPOWERED: "검정력 부족",
  PEEKED: "중간 확인으로 위양성 위험",
  SIMPSON_RISK: "심슨의 역설 위험",
  MULTIPLE_TESTING: "다중검정 보정 없음",
  SELECTION_BIAS: "선택 편향",
  RATIO_COMPOSITION: "비율 지표의 구성 효과",
  NAIVE_SE: "단위를 무시한 SE",
  OFFLINE_ONLINE_GAP: "오프라인-온라인 간극",
  POSITION_BIAS: "위치 편향",
  CONTAMINATION: "그룹 오염",
  INSTRUMENTATION: "계측 문제",
  NOVELTY: "신규성 효과",
  GOODHART: "지표 정의의 함정(굿하트)",
  CARRYOVER: "이전 실험의 이월 효과",
  STAKEHOLDER_EVENT: "서비스 담당자 사전 합의 누락(반발 이벤트)",
};

export const isFlag = (v: string): v is Flag => (ALL_FLAGS as readonly string[]).includes(v);
