/** 당근 사례 고정 모집단 (docs/cases/daangn.md §1). 모든 수치는 교육용 가상 데이터. 스펙에 값이 없는 것은 "가상"으로 표시한다. */

export const SEED = 20220321;

// ── 거래후기 (p1·p2) ──
/** 후기 수신 사용자(트리거 모집단): 일 약 330,000명. 푸시 열람 0.62 → 후기 화면 진입자 일 약 205,000명 */
export const RECIPIENTS_PER_DAY = 330_000;
export const ENTRY_RATE = 0.62;
export const ENTRANTS_PER_DAY = Math.round(RECIPIENTS_PER_DAY * ENTRY_RATE);
/** "설치 시 전원 배정"의 일별 배정 코호트(가상). 이 중 후기 화면까지 가는 사람은 일부뿐이라 효과가 크게 희석된다. */
export const ALL_ASSIGNED_PER_DAY = 400_000;
/** 설치 시 전원 배정 코호트 중 후기 화면 진입자 비율(가상): 204,600 / 6,000,000 ≈ 3.4% */
export const ALL_ASSIGNED_ENTRY = ENTRANTS_PER_DAY / 6_000_000;

export const NEW_SHARE = 0.09;
/** 신규 사용자 중 설치 후 24시간 이내 비중(가상). 신규 설치 버그가 트리거 모집단의 약 3%를 대조군으로 강제해서, 이 코호트는 대부분(약 90%) 대조군에 있게 된다. */
export const NEW_FIRST_DAY_SHARE = 0.4;

/** 후기 화면 진입자 기준 답례 후기 작성률(72시간 내 제출) */
export const RATE = {
  submitted_72h: { existing: 0.38, new: 0.24 },
  /** 기한 없이 제출(가상): 72시간 기준보다 조금 높다 */
  submitted: { existing: 0.4, new: 0.26 },
  /** 작성 "시작"(가상): 버튼만 눌러도 잡힌다 */
  started: { existing: 0.62, new: 0.46 },
} as const;
export type MetricDef = keyof typeof RATE;

/** 앱 SDK: 안드로이드 사용자 50%(가상) 중 구버전 SDK 25% → 전체의 12.5% */
export const SDK_CELLS = [
  { key: "android_old", label: "안드로이드 구버전 SDK", share: 0.125 },
  { key: "android_new", label: "안드로이드 최신 SDK", share: 0.375 },
  { key: "ios", label: "iOS", share: 0.5 },
] as const;
export type SdkKey = (typeof SDK_CELLS)[number]["key"];

/** 품질·안전 가드레일의 기본값 */
export const SHORT_REVIEW_BASE = 0.22;
/** 사용자당 72시간 내 앱 삭제율, 신고율(가상) */
export const UNINSTALL_BASE = 0.004;
export const REPORT_BASE = 0.0012;

/** 사용자당 앱 인스턴스 ID 수: 2개 이상 14% */
export const INSTANCE_MULTI_SHARE = 0.14;
/** 기기 ID 로 배정할 때 다중 기기 사용자 6% */
export const DEVICE_MULTI_SHARE = 0.06;

// ── 거래완료 게시글 검색 노출 (p3) ──
export const SEARCH_USERS_PER_DAY = 400_000; // 일별 신규 검색 코호트(가상)
export const LISTINGS_PER_DAY = 60_000; // 일 신규 게시글(가상)
/** 동네 수. 동네를 하나씩 만들지 않고 평균 크기와 ICC 로 디자인 효과만 계산한다(listing.ts). */
export const NEIGHBORHOODS = 6_500;
export const BASE = { create: 0.061, chat: 0.142, retry: 0.18, sell: 0.48 } as const;
/** 동네 내 상관(ICC), 지표별 0.01~0.04 */
export const ICC = { create: 0.02, chat: 0.01, retry: 0.01, sell: 0.04 } as const;

/**
 * 노이즈 스트림 라벨(보정용). 검증 시나리오가 고정 시드의 우연한 경우(예: #10, #11 의 관측 효과 범위)를 요구해서,
 * 효과 크기는 스펙 그대로 두고 라벨만 골랐다. CALIBRATION.md 참고.
 */
export const SALT = { listing: 14, review: 0 };
