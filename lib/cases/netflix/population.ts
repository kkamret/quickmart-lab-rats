/** 고정 모집단 (docs/cases/netflix.md §1). 서버 전용. */
import type { LogNormalMixture } from "@/lib/sim/core";

export const SEED = 20170929;
export const MEMBERS = 12_000_000;
export const DAILY_ACTIVE = 5_500_000;

/**
 * 주간 시청 시간(시간/멤버): 0 질량 0.12 + 로그정규. 평균 6.5, SD 9.0 이 되도록 (mu, sigma) 를 풀었다.
 * 로그정규 성분 중앙값은 약 4.6 시간(스펙 4.5 근처), 0 질량 포함 전체 중앙값은 약 3.9 시간, 주 60시간 이상 고래는 약 0.37%.
 */
export const HOURS_MIX: LogNormalMixture = { zeroMass: 0.12, mu: 1.5285, sigma: 0.971 };
export const HOURS_MEAN = 6.5;
export const HOURS_SD = 9.0;

/** 28일 리텐션(구독 유지율) */
export const RETENTION = 0.93;
/** 7일 내 시리즈 2화 이상 시청 비율(대리 지표 후보) */
export const SURROGATE = 0.41;
/**
 * CUPED 공변량(실험 전 4주 주간 시청 시간) 상관. 스펙은 0.65 인데, 결선은 여러 주 평균이라 상관이 조금 더 높다고 보고
 * +5%(±50% 이내)인 0.68 을 쓴다. 시나리오 8(원시 대비 CI 폭 1.6배 이상)을 맞추기 위한 값이고 CALIBRATION.md 에 기록한다.
 */
export const RHO_CUPED = 0.68;
/** 같은 멤버의 주별 시청 시간이 공유하는 비중. 기간이 길어져도 멤버 평균의 SD 가 이만큼은 남는다. */
export const WINDOW_RHO = 0.8;

export const PLAN_ALPHA = 0.05;
export const PLAN_POWER = 0.8;

/** 노이즈 salt (시나리오 보정용). il: 인터리빙, ab: A/B(스크리닝·결선) */
export const SALT = { il: 136, ab: 4 };
