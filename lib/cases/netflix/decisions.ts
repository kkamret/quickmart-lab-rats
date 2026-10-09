import type { DecisionDef } from "../types";

/** s4: 결선 후보 선택. 결선 설계(s5)에서 최종 확정하지만, 여기서 팀의 판단과 근거를 남긴다. */
export const decisions: Record<string, DecisionDef> = {
  p1: {
    options: [
      { id: "r3_r4", label: "R3, R4", desc: "스크리닝 선호 상위 두 후보를 올려요." },
      { id: "r3_r4_r7", label: "R3, R4, R7", desc: "R7까지 세 후보를 올려요." },
      { id: "r2_r3_r4", label: "R2, R3, R4", desc: "R2 가 눈에 띄어 함께 올려요." },
      { id: "r1_r3_r4", label: "R1, R3, R4", desc: "오프라인 1등 R1 도 확인해 봐요." },
      { id: "r2_r3", label: "R2, R3", desc: "R2 와 R3 두 후보만 올려요." },
    ],
  },
};
