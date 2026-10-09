import type { MetricKey } from "./schema";

/**
 * Primary 지표별로 비즈니스가 사전에 협의한 MDE. 실험 설계 입력이 아니라 주어진 값이에요.
 * 블로그 사례에는 MDE 가 없어서 교육용 가상 값이에요.
 * 단위는 비율 지표는 절대 %p, 금액·시간(평균) 지표는 상대 %예요.
 * 근거: 덱 「MDE는 통계가 아니라 비즈니스가 정한다」.
 */
export const BUSINESS_MDE_PP: Record<MetricKey, number> = {
  abandon: 1.5, conv: 1.0, aov: 3, gmv: 3, near_min_share: 2, bar_click: 2,
  crash: 0.1, load_time: 5, repurchase7: 1, cs_rate: 1, min_reach: 2,
};

export const mdeOf = (primary: MetricKey): number => BUSINESS_MDE_PP[primary];
