// 사례 카탈로그 (docs/cases/README.md). 사례 플러그인은 마일스톤 3 이후에 lib/cases/<case>/ 에 추가된다.
export const CASE_KEYS = ["baemin", "toss", "daangn", "netflix"] as const;
export type CaseKey = (typeof CASE_KEYS)[number];

export type CaseMeta = {
  key: CaseKey;
  title: string;
  company: string;
  difficulty: 1 | 2 | 3 | 4;
  recommended: string;
  question: string;
};

export const CASES: Record<CaseKey, CaseMeta> = {
  baemin: {
    key: "baemin",
    title: "최소주문금액바",
    company: "배민",
    difficulty: 2,
    recommended: "실험 입문",
    question: "Primary가 안 움직인 실험은 실패인가?",
  },
  toss: {
    key: "toss",
    title: "푸시 디타게팅",
    company: "토스",
    difficulty: 3,
    recommended: "통계 탄탄",
    question: "CTR이 오른 건 더 눌러서인가, 덜 보내서인가?",
  },
  daangn: {
    key: "daangn",
    title: "거래후기·실험 플랫폼",
    company: "당근",
    difficulty: 2,
    recommended: "데이터 의심하기",
    question: "이 결과를 믿어도 되는가?",
  },
  netflix: {
    key: "netflix",
    title: "인터리빙",
    company: "Netflix",
    difficulty: 4,
    recommended: "ML·통계 배경",
    question: "사용자가 더 선호하는 추천이 사업에도 좋은가?",
  },
};
