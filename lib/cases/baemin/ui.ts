/** 클라이언트로 보내도 되는 배민 사례 정의 (시뮬 엔진·루브릭·정답 해설은 포함하지 않는다) */
import type { TheoryKey } from "../../theory";
import type { ClientCase, PhaseDef } from "../types";
import { decisions } from "./decisions";
import { defaultDesign } from "./defaults";
import { formMeta } from "./formMeta";
import { diagnoseSchema, p1Schema, p2Schema, p3Schema, p4Schema } from "./schema";

export const phases: PhaseDef[] = [
  { key: "diagnose", step: "s1_diagnose", title: "이탈 퍼널 진단", kind: "diagnose" },
  { key: "p1", step: "s2_design", title: "P1 설계", kind: "design" },
  { key: "p1_run", step: "s3_run", title: "P1 실행 (A/A → 본 실험)", kind: "run" },
  { key: "p1_readout", step: "s4_readout", title: "P1 결과", kind: "readout" },
  { key: "p1_decide", step: "s4_readout", title: "P1 결정", kind: "decide" },
  { key: "p2", step: "s5_deep", title: "P2 확대 설계", kind: "design" },
  { key: "p2_readout", step: "s5_deep", title: "P2 결과", kind: "readout" },
  { key: "p2_decide", step: "s5_deep", title: "P2 결정", kind: "decide" },
  { key: "p3", step: "s5_deep", title: "P3 혜택 넛지 설계", kind: "design" },
  { key: "p3_readout", step: "s5_deep", title: "P3 결과", kind: "readout" },
  { key: "p3_decide", step: "s5_deep", title: "P3 결정", kind: "decide" },
  { key: "p4", step: "s6_final", title: "P4 부족 금액 추천 설계", kind: "design" },
  { key: "p4_readout", step: "s6_final", title: "P4 결과", kind: "readout" },
  { key: "p4_decide", step: "s6_final", title: "P4 결정", kind: "decide" },
];

export const baeminMeta = {
  title: "최소주문금액바 4번의 A/B 실험",
  company: "우아한형제들",
  sourceUrl: "https://techblog.woowahan.com/26379/",
  sourceTitle: "한 번 성공하니 다음도 쉬울 줄 알았다: 최소주문금액바 4번의 A/B실험",
  difficulty: 2 as const,
  concepts: [
    "가설(ABI)", "OEC·Guardrail·Secondary·Driver 지표", "실험 단위", "범위와 외적 타당성", "표본·MDE·기간", "신규성 효과", "Peeking", "Ramp-up",
    "SRM·생존 편향·계측 문제", "Underpowered NULL", "트리거 분석·선택 편향", "A/B/n·다중검정", "Secondary·Driver 지표에서 다음 가설 찾기",
  ],
  theory: ["hypothesis", "metric_layers", "unit", "error_power", "duration", "novelty", "peeking", "srm", "trigger", "multiple_testing", "alpha_power", "mde", "allocation", "ramp_up", "session_unit", "north_star", "driver", "ethics", "sequential", "ab_n", "decision"] as TheoryKey[],
  /** 덱·위키에 설명이 없는 개념 이름. 정답 공개 뒤에만 이름으로 보여 준다. */
  outsideTheory: ["이질적 처치 효과(HTE)"] as string[],
};

export const baeminClient: ClientCase = {
  key: "baemin",
  meta: baeminMeta,
  phases,
  designSchema: { diagnose: diagnoseSchema, p1: p1Schema, p2: p2Schema, p3: p3Schema, p4: p4Schema },
  formMeta,
  decisions,
  defaultDesign,
};
