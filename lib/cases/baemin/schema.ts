import { z } from "zod";

export const METRIC_KEYS = [
  "abandon", "conv", "aov", "gmv", "near_min_share", "bar_click", "crash", "load_time", "repurchase7", "cs_rate", "min_reach",
] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];
const metricKey = z.enum(METRIC_KEYS);

const hypothesis = z.object({
  action: z.string().trim().min(1, "대상과 Treatment 를 적어주세요"),
  behavior: z.string().trim().min(1, "이유(사용자 행동 변화)를 적어주세요"),
  impact: z.string().trim().min(1, "Metric·방향·변화 크기를 적어주세요"),
});

const common = {
  hypothesis,
  scope: z.object({ os: z.enum(["android", "all"]), surface: z.enum(["store_home", "all"]) }),
  unit: z.enum(["user", "session", "pageview"]),
  metrics: z.object({ primary: metricKey, guardrails: z.array(metricKey), secondary: z.array(metricKey) }),
  alpha: z.union([z.literal(0.01), z.literal(0.05), z.literal(0.1)]),
  power: z.union([z.literal(0.7), z.literal(0.8), z.literal(0.9)]),
  /** 메인 지표 기준 절대 %p (금액 지표면 상대 %) */
  mde_pp: z.number().positive(),
  duration_days: z.number().int().min(7, "7일 미만은 입력할 수 없어요").max(28),
  /** 범위 트래픽 중 실험에 투입하는 비율 */
  allocation: z.number().min(0.05).max(1),
  ramp: z.enum(["none", "10_50_100", "10_week1_50_week2"]),
  /** pooled: 기간을 합쳐서 분석 / stratified: 배정 비율이 같은 기간(층)별로 비교한 뒤 합쳐서 분석 */
  analysis_mode: z.enum(["pooled", "stratified"]).default("pooled"),
  stopping: z.enum(["fixed", "peek_stop", "sequential"]),
  count_basis: z.enum(["assignment", "exposure"]),
  /** A/A 모드: 진짜 효과를 0 으로 둔다(s3 의 A/A 실행) */
  aa: z.boolean().optional(),
};

export const p1Schema = z.object({ phase: z.literal("p1"), ...common });
export const p2Schema = z.object({ phase: z.literal("p2"), ...common });
export const p3Schema = z.object({
  phase: z.literal("p3"),
  ...common,
  trigger_logging: z.boolean(),
  coupon_ops: z.enum(["low", "high"]),
});
export const p4Schema = z.object({
  phase: z.literal("p4"),
  ...common,
  arms: z.array(z.enum(["A", "B", "C"])).min(2).max(3).refine((a) => a.includes("A"), "대조군 A 가 있어야 해요"),
  correction: z.enum(["none", "bonferroni", "bh"]),
});

export const diagnoseSchema = z.object({
  causal_claim: z.enum(["yes", "no", "unsure"]),
  rationale: z.string().trim().min(1, "근거를 적어주세요"),
});

export type DesignP1 = z.infer<typeof p1Schema>;
export type DesignP2 = z.infer<typeof p2Schema>;
export type DesignP3 = z.infer<typeof p3Schema>;
export type DesignP4 = z.infer<typeof p4Schema>;
export type Design = DesignP1 | DesignP2 | DesignP3 | DesignP4;
export type SimPhase = Design["phase"];

export const designUnion = z.discriminatedUnion("phase", [p1Schema, p2Schema, p3Schema, p4Schema]);
