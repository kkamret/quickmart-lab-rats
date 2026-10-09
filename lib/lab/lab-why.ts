/**
 * s7 함정 연구소·s8 직소 공유(공통 화면)의 "왜 이 선택지?" 한 줄.
 * 설계 문서(docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md) 3.8 L1~L10, 3.9 S1·S2 를 그대로 옮긴다.
 * s7 은 처음부터 함정을 이름으로 다루는 스텝이라 스포일러 검사에서 면제한다(작성 규칙은 같다).
 */
import type { Why } from "@/lib/cases/types";

const w = (text: string, src: Why["src"]): Why => ({ text, src });

/** L9 는 설계 표에서 "L8과 같아요"라서 L8 문장을 같이 쓴다 */
const SRM_COUNT_WHY = w("배정 단위(사용자)로 센 고유 사용자 수를 넣어요.", 4);

export const TRAP_LAB_WHY = {
  peekingDays: w("기간이 길수록 매일 확인하는 횟수가 늘어요. 확인 횟수에 따라 '유의'가 얼마나 자주 나오는지 비교해요.", 3),
  peekingDayOptions: {
    7: w("한 주 동안 7번 확인해요.", 3),
    14: w("이론 수업의 시뮬레이션과 같은 14일이에요.", 3),
    28: w("확인 횟수가 가장 많은 설정이에요.", 3),
  } as Record<7 | 14 | 28, Why>,
  peekingRun: w("효과가 전혀 없는 A/A를 여러 번 돌려야 '유의'가 얼마나 자주 나오는지 셀 수 있어요.", 3),
  simpsonPool: w("전체 결과예요. 기간별 결과와 방향이 같은지 비교하려고 둬요.", 4),
  simpsonSplit: w("배정 비율이 다른 기간을 나눠 봐요. 기간마다 두 그룹의 구성이 다르면, 합친 결과가 방향을 뒤집을 수 있어요.", 4),
  srmA: SRM_COUNT_WHY,
  srmB: SRM_COUNT_WHY,
  srmRatio: w("실험 전에 정한 배정 비율이 기대 비율이 돼요. 관측 비율이 이와 통계적으로 맞는지 봐요.", 4),
};

export const SHARE_WHY = {
  learned: w("결정마다 배운 점을 남기면 다음 실험의 재료가 돼요. 실험 기록이 쌓이면 조직의 기억이 돼요.", 5),
  lesson: w("같은 개념이 다른 회사 사례에서 어떻게 쓰였는지 서로 비교해요.", 5),
};
