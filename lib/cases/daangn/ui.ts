/** 클라이언트로 보내도 되는 당근 사례 정의 (시뮬 엔진·루브릭·정답 해설·진짜 효과는 포함하지 않는다) */
import type { TheoryKey } from "../../theory";
import type { ClientCase, PhaseDef } from "../types";
import { decisions } from "./decisions";
import { defaultDesign } from "./defaults";
import { formMeta } from "./formMeta";
import { diagnoseSchema, p1Schema, p2Schema, p3Schema } from "./schema";

export const phases: PhaseDef[] = [
  { key: "diagnose", step: "s1_diagnose", title: "실험 문서 작성", kind: "diagnose" },
  { key: "p1", step: "s2_design", title: "거래후기 실험 설계 (외부 플랫폼 F)", kind: "design" },
  { key: "p1_run", step: "s3_run", title: "A/A 테스트 → 본 실험", kind: "run" },
  { key: "p1_readout", step: "s4_readout", title: "거래후기 1차 결과", kind: "readout" },
  { key: "p1_decide", step: "s4_readout", title: "1차 결정", kind: "decide" },
  { key: "p2", step: "s5_deep", title: "플랫폼 재설계", kind: "design" },
  { key: "p2_run", step: "s5_deep", title: "A/A 재검증 → 거래후기 재실험", kind: "run" },
  { key: "p2_decide", step: "s5_deep", title: "재실험 결정", kind: "decide" },
  { key: "p3", step: "s6_final", title: "거래완료 게시글 검색 노출 실험 설계", kind: "design" },
  { key: "p3_readout", step: "s6_final", title: "검색 노출 실험 결과", kind: "readout" },
  { key: "p3_decide", step: "s6_final", title: "최종 결정", kind: "decide" },
];

export const daangnMeta = {
  title: "거래후기 실험과 믿을 수 있는 실험 플랫폼",
  company: "당근",
  sourceUrl: "https://careers.daangn.com/blog/post/당근마켓-실험문화-데이터가치화팀/",
  sourceTitle: "1주 1개 실험하는 프로덕트 팀이 되는 여정",
  difficulty: 2 as const,
  concepts: [
    "실험 문서와 가설", "트리거 기반 배정", "ITT vs 트리거 분석", "A/A 테스트", "SRM", "배정 키 불일치로 인한 오염", "해싱과 salt",
    "계측 신뢰성과 데이터 소스", "신규 사용자와 외적 타당성", "지표 정의(Goodhart)", "품질 Guardrail", "양면 시장과 간섭", "클러스터 배정과 강건 SE", "Data-informed decision",
  ],
  theory: ["hypothesis", "trigger", "aa_test", "srm", "goodhart", "unit", "analysis_unit", "contamination", "interference", "interference_fix", "alpha_power", "mde", "driver", "hashing", "identifier", "data_informed"] as TheoryKey[],
  /** 덱·위키에 설명이 없는 개념 이름. 정답 공개 뒤에만 이름으로 보여 준다. */
  outsideTheory: ["신규 사용자 처리", "트위먼의 법칙"] as string[],
};

export const daangnClient: ClientCase = {
  key: "daangn",
  meta: daangnMeta,
  phases,
  designSchema: { diagnose: diagnoseSchema, p1: p1Schema, p2: p2Schema, p3: p3Schema },
  formMeta,
  decisions,
  defaultDesign,
};
