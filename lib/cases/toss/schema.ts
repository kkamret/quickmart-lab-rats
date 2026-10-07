import { z } from "zod";
import { C_VALUES, G_VALUES, N_VALUES, W_VALUES } from "./replay";

export const METRIC_KEYS = ["push_ctr", "clicks_per_user", "sends_per_user", "app_open_au", "service_au", "revenue_per_user", "opt_out_rate"] as const;
export type MetricKey = (typeof METRIC_KEYS)[number];

const oneOf = <T extends number>(vals: readonly T[], msg: string) => z.number().refine((v) => (vals as readonly number[]).includes(v), msg);

const rule = z.object({
  N: oneOf(N_VALUES, "N(연속 무반응 횟수)을 골라주세요"),
  W: oneOf(W_VALUES, "W(관찰 창)를 골라주세요"),
  C: oneOf(C_VALUES, "C(쿨다운)를 골라주세요"),
  G: z.enum(G_VALUES, "G(유사 목적 범위)를 골라주세요"),
});
export const variantsSchema = z.object({ V1: rule, V2: rule });

const hypothesis = z.object({
  action: z.string().trim().min(1, "대상과 Treatment 를 적어주세요"),
  behavior: z.string().trim().min(1, "이유(사용자 행동 변화)를 적어주세요"),
  impact: z.string().trim().min(1, "Metric·방향·변화 크기를 적어주세요"),
});

const hypothesisType = z.enum(["superiority", "non_inferiority"]);
const primary = z.enum(["push_ctr", "clicks_per_user", "app_open_au", "sends_per_user"]);
const guardrail = z.enum(["app_open_au", "service_au", "revenue_per_user", "opt_out_rate"]);
const secondaryKey = z.enum(["push_ctr", "clicks_per_user", "sends_per_user", "app_open_au", "revenue_per_user", "opt_out_rate"]);
const correction = z.enum(["none", "bonferroni", "bh"]);

const shared = {
  hypothesis,
  primary,
  hypothesis_type: z.object({ push_ctr: hypothesisType.optional(), clicks_per_user: hypothesisType.optional(), app_open_au: hypothesisType.optional() }),
  ni_margin_pct: z.number().min(-10, "마진은 −10% 보다 작게 두기 어려워요").max(0, "비열등성 마진은 0 이하(허용하는 손실)로 적어주세요").optional(),
  guardrails: z.array(guardrail),
  secondary: z.array(secondaryKey),
  ctr_analysis_unit: z.enum(["push", "user_delta"]),
  stakeholder_alignment: z.boolean(),
  aa: z.boolean().optional(),
};

const needsMargin = (d: { hypothesis_type: Record<string, string | undefined>; ni_margin_pct?: number }) =>
  !Object.values(d.hypothesis_type).includes("non_inferiority") || d.ni_margin_pct !== undefined;
const marginMsg = { message: "비열등성 검정을 쓰려면 마진(허용하는 손실 %)을 적어주세요", path: ["ni_margin_pct"] };

export const p1Schema = z
  .object({
    phase: z.literal("p1"),
    ...shared,
    variants: variantsSchema,
    sample_fraction: z.number().min(0.01, "표본 비율은 1% 이상이어야 해요").max(0.2, "표본 비율은 20% 이하로 해주세요"),
    duration_weeks: z.number().int().min(2, "2주 이상으로 해주세요").max(12, "12주 이하로 해주세요"),
    cuped: z.boolean(),
    correction,
    stopping: z.enum(["fixed", "peek_stop", "sequential"]),
  })
  .refine(needsMargin, marginMsg);

/** s5 확대 실험: 변이안과 지표 설정은 s2 에서 이어받는다(없으면 시뮬레이션이 안내하며 거부) */
export const p2Schema = z
  .object({
    phase: z.literal("p2"),
    ...shared,
    primary: primary.optional(),
    hypothesis: hypothesis.optional(),
    hypothesis_type: shared.hypothesis_type.optional(),
    guardrails: z.array(guardrail).optional(),
    secondary: z.array(secondaryKey).optional(),
    ctr_analysis_unit: shared.ctr_analysis_unit.optional(),
    stakeholder_alignment: z.boolean().optional(),
    variants: variantsSchema.optional(),
    arms: z.array(z.enum(["A", "V1", "V2"])).min(2, "대조군과 변이안을 함께 골라주세요").refine((a) => a.includes("A"), "대조군 A 가 있어야 해요"),
    fraction_total: z.number().min(0.06, "6% 이상으로 해주세요").max(0.3, "30% 이하로 해주세요"),
    duration_weeks: z.number().int().min(2, "2주 이상으로 해주세요").max(12, "12주 이하로 해주세요"),
    cuped: z.boolean(),
    correction,
    response_to_stakeholders: z.string().trim().optional(),
  });

export const diagnoseSchema = z.object({
  chosen_analysis: z.enum(["pooled", "stratified", "both"]),
  predicted_ctr_gain_pp: z.number().min(-20).max(40),
  causal_claim: z.enum(["yes", "no", "unsure"]),
  rationale: z.string().trim().min(1, "근거를 적어주세요"),
});

export type DesignP1 = z.infer<typeof p1Schema>;
export type DesignP2 = z.infer<typeof p2Schema>;
export type Design = DesignP1 | DesignP2;
export type SimPhase = Design["phase"];
export const designUnion = z.union([p1Schema, p2Schema]);
