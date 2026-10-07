import type { DecisionOption } from "../types";

export const decisions: Record<string, { options: DecisionOption[] }> = {
  p1: {
    options: [
      { id: "deploy", label: "배포", desc: "작은 범위의 결과를 근거로 배포해요." },
      { id: "no_deploy", label: "배포 안 함", desc: "이번 결과로는 배포하지 않아요." },
      { id: "extend_rerun", label: "기간 연장 재실험", desc: "더 길게 다시 확인해요." },
    ],
  },
  p2: {
    options: [
      { id: "full_deploy", label: "전면 배포", desc: "모든 화면과 OS 에 배포해요." },
      { id: "no_deploy", label: "배포 안 함", desc: "배포하지 않아요." },
      { id: "deploy_followup", label: "배포 + Secondary·Driver 지표 발견으로 후속 실험", desc: "배포하고, Secondary·Driver 지표에서 찾은 가설을 다음 실험으로 이어가요." },
    ],
  },
  p3: {
    options: [
      { id: "rollback", label: "롤백", desc: "넛지 문구를 되돌려요." },
      { id: "deploy", label: "배포", desc: "그대로 배포해요." },
      { id: "expand_rerun", label: "노출 조건 확대 후 재실험", desc: "마케팅 협업으로 노출 대상을 늘려 다시 확인해요." },
    ],
  },
  p4: {
    options: [
      { id: "deploy_b", label: "B 배포", desc: "항상 노출하는 안을 배포해요." },
      { id: "deploy_c", label: "C 배포", desc: "부족 금액 8천 원 이하일 때만 노출하는 안을 배포해요." },
      { id: "none_learn", label: "둘 다 배포 안 함 + 학습 정리", desc: "배포하지 않고 이번 실험에서 배운 점을 정리해요." },
    ],
  },
};
