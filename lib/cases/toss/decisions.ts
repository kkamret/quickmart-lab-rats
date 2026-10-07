import type { DecisionDef } from "../types";

export const decisions: Record<string, DecisionDef> = {
  p1: {
    options: [
      { id: "expand", label: "30% 확대", desc: "표본을 넓히고 기간을 늘려 Guardrail과 장기 효과를 확인해요." },
      { id: "revise", label: "변이안 수정 후 재실험", desc: "규칙(N·W·C·G)을 고쳐서 6% 에서 다시 확인해요." },
      { id: "stop", label: "중단", desc: "이번 결과로는 더 진행하지 않아요." },
    ],
  },
  /** 최종 배포안 (s6). 설계 Phase 가 없어서 s2 의 설계를 이어받는다. */
  p3: {
    requires: "p1",
    options: [
      { id: "deploy_v1", label: "V1(진보안) 배포", desc: "CTR 을 조금 더 올리는 안을 배포해요." },
      { id: "deploy_v2", label: "V2(보수안) 배포", desc: "도달·습관 리스크가 작은 안을 배포해요." },
      { id: "none", label: "배포 안 함", desc: "지금은 배포하지 않아요." },
      { id: "dynamic_next", label: "V2 우선 배포 + 동적 N 후속 실험", desc: "보수안을 먼저 배포하고, 유저·서비스별로 N 을 조정하는 안을 다음 실험으로 이어가요." },
    ],
    fields: [
      { name: "stakeholder_notice", label: "서비스 담당자 공지 초안", help: "배포 목적, 지킨 Guardrail, 남은 리스크를 담당자 눈높이에서 적어요." },
      { name: "monitoring_plan", label: "배포 후 모니터링 계획", help: "배포 후 볼 지표와 홀드아웃 계획을 적어요." },
    ],
  },
};
