/** 클라이언트로 보내도 되는 넷플릭스(가상 OTT '플릭스') 사례 정의 (시뮬 엔진·루브릭·정답 해설·진짜 효과는 포함하지 않는다) */
import type { TheoryKey } from "../../theory";
import type { ClientCase, PhaseDef } from "../types";
import { decisions } from "./decisions";
import { defaultDesign } from "./defaults";
import { formMeta } from "./formMeta";
import { diagnoseSchema, p1Schema, p2Schema, p3Schema } from "./schema";

export const phases: PhaseDef[] = [
  { key: "diagnose", step: "s1_diagnose", title: "오프라인 평가 결과 검토", kind: "diagnose" },
  { key: "p1", step: "s2_design", title: "스크리닝 방식 설계", kind: "design" },
  { key: "p1_run", step: "s3_run", title: "스크리닝 실행", kind: "readout" },
  { key: "p1_readout", step: "s4_readout", title: "스크리닝 결과", kind: "readout" },
  { key: "p1_decide", step: "s4_readout", title: "결선 후보 선택", kind: "decide" },
  { key: "p2", step: "s5_deep", title: "결선 A/B 설계", kind: "design" },
  { key: "p2_readout", step: "s5_deep", title: "결선 결과", kind: "readout" },
  { key: "p3", step: "s6_final", title: "출시 결정과 장기 검증 계획", kind: "design" },
  { key: "p3_readout", step: "s6_final", title: "장기 검증 시뮬레이션", kind: "readout" },
];

export const netflixMeta = {
  title: "추천 랭킹 인터리빙과 결선 A/B",
  company: "Netflix",
  sourceUrl: "https://netflixtechblog.com/using-interleaving-in-online-experiments-to-accelerate-algorithm-innovation-at-netflix-a04ee392ec55",
  sourceTitle: "Innovating Faster on Personalization Algorithms at Netflix Using Interleaving",
  difficulty: 4 as const,
  concepts: [
    "오프라인 지표와 온라인 성과의 간극", "실험 감도와 검정력", "인터리빙(Team Draft vs Balanced)", "위치 편향", "성과 귀속(Goodhart)", "다중검정",
    "2단계 실험 퍼널", "꼬리가 긴 지표(윈저라이징·로그)", "CUPED", "신규성 효과", "대리 지표", "장기 홀드아웃", "Multi-armed Bandit",
  ],
  theory: ["error_power", "goodhart", "cuped", "multiple_testing", "novelty", "peeking", "metric_layers", "alpha_power", "mde", "driver", "ramp_up", "repeat_exposure"] as TheoryKey[],
};

export const netflixClient: ClientCase = {
  key: "netflix",
  meta: netflixMeta,
  phases,
  designSchema: { diagnose: diagnoseSchema, p1: p1Schema, p2: p2Schema, p3: p3Schema },
  formMeta,
  decisions,
  defaultDesign,
};
