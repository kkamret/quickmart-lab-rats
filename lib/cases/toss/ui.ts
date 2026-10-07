/** 클라이언트로 보내도 되는 토스 사례 정의 (시뮬 엔진·루브릭·정답 해설·진짜 효과는 포함하지 않는다) */
import type { TheoryKey } from "../../theory";
import type { ClientCase, PhaseDef } from "../types";
import { decisions } from "./decisions";
import { defaultDesign } from "./defaults";
import { formMeta } from "./formMeta";
import { diagnoseSchema, p1Schema, p2Schema } from "./schema";

export const phases: PhaseDef[] = [
  { key: "diagnose", step: "s1_diagnose", title: "관찰 데이터 분석 (EDA)", kind: "diagnose" },
  { key: "p1", step: "s2_design", title: "디타게팅 규칙과 ABC 실험 설계", kind: "design" },
  { key: "p1_run", step: "s3_run", title: "주간 대시보드 (A/A → 본 실험)", kind: "run" },
  { key: "p1_readout", step: "s4_readout", title: "1차 결과", kind: "readout" },
  { key: "p1_decide", step: "s4_readout", title: "1차 결정", kind: "decide" },
  { key: "p2", step: "s5_deep", title: "30% 확대 설계", kind: "design" },
  { key: "p2_readout", step: "s5_deep", title: "확대 실험 결과", kind: "readout" },
  { key: "p3_decide", step: "s6_final", title: "최종 배포안", kind: "decide" },
];

export const tossMeta = {
  title: "푸시 디타게팅 ABC 테스트",
  company: "토스",
  sourceUrl: "https://toss.tech/article/data-analyst-ab-test",
  sourceTitle: "진짜 A/B 테스트: 토스의 푸시 생태계를 데이터로 재설계한 방법",
  difficulty: 3 as const,
  concepts: [
    "관찰 데이터의 교란", "오프라인 시뮬레이션 vs 온라인 실험", "A/B/n(ABC)", "처치가 분모를 바꾸는 비율 지표", "Delta Method",
    "비열등성 검정", "CUPED", "장기 효과(습관 침식)", "다중검정", "Ramp-up", "이질적 처치 효과(HTE)", "리스크 기반 배포안 선택", "이해관계자 합의",
  ],
  theory: ["hypothesis", "non_inferiority", "metric_layers", "analysis_unit", "cuped", "multiple_testing", "novelty", "predefine", "ratio_metric", "alpha_power", "mde", "ramp_up", "north_star", "driver", "ethics"] as TheoryKey[],
};

export const tossClient: ClientCase = {
  key: "toss",
  meta: tossMeta,
  phases,
  designSchema: { diagnose: diagnoseSchema, p1: p1Schema, p2: p2Schema },
  formMeta,
  decisions,
  defaultDesign,
};
