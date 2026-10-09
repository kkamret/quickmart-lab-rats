/**
 * 숨긴 진짜 효과 (docs/cases/baemin.md §2). 조 화면 API 로 절대 내려보내지 않는다.
 * CALIB 는 스펙 기준값에서 ±50% 안에서만 조정하고, 조정한 값은 CALIBRATION.md 에 기록한다.
 */
import type { CustomerType, Os } from "./population";
import type { SimPhase } from "./schema";

export const CALIB = {
  p1: {
    steadyAbandon: -0.025,
    /** 신규성 추가분 진폭. 스펙 기준값 -0.036 */
    noveltyAmp: -0.036,
    noveltyTau: 2.2,
    aovRel: -0.002,
    crash: 0.0002,
  },
  p2: {
    abandon: { general: -0.024, first_order: 0.018, member: -0.036 } as Record<CustomerType, number>,
    nearMin: 0.066,
    aovRel: -0.049,
    crash: 0.0002,
    /** iOS 구버전 버그 (P2 에서 램프업 없이 시작했을 때만 본 실험에 들어간다) */
    bug: { crashShare: 0.24, survivorAbandon: -0.04 },
  },
  p3: { trigConv: 0.023, trigAovRel: 0.061 },
  p4: { cAovRel: -0.02 },
  /** simpson_demo 모드: 주문전환율 진짜 효과 */
  simpsonConv: -0.004,
};

export type Effect = {
  /** 장바구니 이탈률 변화(절대) */
  abandon: number;
  /** 평균주문금액 상대 변화 */
  aovRel: number;
  /** 최소주문금액 근처 주문 비중 변화(절대) */
  nearMin: number;
  /** 크래시율 변화(절대) */
  crash: number;
  /** P3 트리거 사용자 전용: 이탈률 변화(절대, 전환율 +x 와 같은 크기), 평균주문금액 상대 변화 */
  trigAbandon: number;
  trigAovRel: number;
};

export const ZERO_EFFECT: Effect = { abandon: 0, aovRel: 0, nearMin: 0, crash: 0, trigAbandon: 0, trigAovRel: 0 };

export type EffectCtx = { phase: SimPhase; arm: string; day: number; type: CustomerType; os: Os; cartRate: number; simpsonDemo: boolean };

/** 대조군(A)은 항상 0. 노출 비율·단위 배수는 호출하는 쪽에서 곱한다. */
export function trueEffect(ctx: EffectCtx): Effect {
  if (ctx.arm === "A") return ZERO_EFFECT;
  if (ctx.phase === "p1") {
    if (ctx.simpsonDemo) {
      // 주문전환율 = 장바구니 담기율 × (1 − 이탈률) 이므로, 전환율 -0.4%p 가 되도록 이탈률을 올린다
      return { ...ZERO_EFFECT, abandon: -CALIB.simpsonConv / ctx.cartRate };
    }
    const c = CALIB.p1;
    return {
      ...ZERO_EFFECT,
      abandon: c.steadyAbandon + c.noveltyAmp * Math.exp(-(ctx.day - 1) / c.noveltyTau),
      aovRel: c.aovRel,
      crash: c.crash,
    };
  }
  if (ctx.phase === "p2") {
    const c = CALIB.p2;
    return { ...ZERO_EFFECT, abandon: c.abandon[ctx.type], nearMin: c.nearMin, aovRel: c.aovRel, crash: c.crash };
  }
  if (ctx.phase === "p3") {
    return { ...ZERO_EFFECT, trigAbandon: -CALIB.p3.trigConv, trigAovRel: CALIB.p3.trigAovRel };
  }
  // p4: B, C 모두 전환율 효과 0, C 만 평균주문금액 하락
  return ctx.arm === "C" ? { ...ZERO_EFFECT, aovRel: CALIB.p4.cAovRel } : ZERO_EFFECT;
}

export function scaleEffect(e: Effect, k: number): Effect {
  return {
    abandon: e.abandon * k, aovRel: e.aovRel * k, nearMin: e.nearMin * k, crash: e.crash * k,
    trigAbandon: e.trigAbandon * k, trigAovRel: e.trigAovRel * k,
  };
}
