import { z } from "zod";
import { CANDIDATE_IDS } from "./content-ids";

export const diagnoseSchema = z.object({
  ship_offline_best: z.enum(["yes", "no"], "출시 여부를 골라주세요"),
  reason: z.string().trim().min(1, "이유를 적어주세요"),
  offline_online_risks: z.array(z.enum(["training_bias", "feedback_loop", "metric_mismatch", "position_bias", "novelty", "none"])),
});

const candidate = z.enum(CANDIDATE_IDS);
const correction = z.enum(["none", "bonferroni", "bh"], "다중검정 보정을 골라주세요");

/** s2: 스크리닝. 방식에 따라 필요한 칸이 다르다(superRefine). 안 쓰는 칸은 무시한다. */
export const p1Schema = z
  .object({
    phase: z.literal("p1"),
    hypothesis: z.string().trim().optional(),
    method: z.enum(["abn_all", "interleaving"], "스크리닝 방식을 골라주세요"),
    abn_primary: z.enum(["hours", "retention"]).optional(),
    abn_fraction: z.number().min(0.01, "1% 이상으로 해주세요").max(0.2, "20% 이하로 해주세요").optional(),
    abn_weeks: z.number().int().min(1).max(8, "8주 이하로 해주세요").optional(),
    il_scheme: z.enum(["team_draft", "balanced_fixed_first"]).optional(),
    il_credit: z.enum(["play_start", "qualified_play_10min"]).optional(),
    il_members_per_pair: z.number().int().min(1000, "쌍당 1,000명 이상으로 해주세요").max(500000, "쌍당 50만 명 이하로 해주세요").optional(),
    il_days: z.number().int().min(1).max(28, "28일 이하로 해주세요").optional(),
    candidates: z.array(candidate).min(1, "후보를 1개 이상 골라주세요"),
    correction,
    advance_rule: z.string().trim().min(1, "결선 진출 기준을 적어주세요"),
  })
  .superRefine((d, ctx) => {
    const need = (ok: boolean, path: string, message: string) => {
      if (!ok) ctx.addIssue({ code: "custom", path: [path], message });
    };
    if (d.method === "abn_all") {
      need(d.abn_primary !== undefined, "abn_primary", "A/B/n 의 Primary 지표를 골라주세요");
      need(d.abn_fraction !== undefined, "abn_fraction", "실험에 쓸 멤버 비율을 적어주세요");
      need(d.abn_weeks !== undefined, "abn_weeks", "기간(주)을 적어주세요");
    } else {
      need(d.il_scheme !== undefined, "il_scheme", "인터리빙 방식을 골라주세요");
      need(d.il_credit !== undefined, "il_credit", "귀속 기준을 골라주세요");
      need(d.il_members_per_pair !== undefined, "il_members_per_pair", "쌍당 멤버 수를 적어주세요");
      need(d.il_days !== undefined, "il_days", "기간(일)을 적어주세요");
    }
  });

/** s5: 결선 A/B */
export const p2Schema = z.object({
  phase: z.literal("p2"),
  finalists: z.array(candidate).min(2, "결선 후보는 2~3개예요").max(3, "결선 후보는 2~3개예요"),
  fraction: z.number().min(0.01, "1% 이상으로 해주세요").max(0.2, "20% 이하로 해주세요"),
  weeks: z.number().int().min(1, "1주 이상으로 해주세요").max(8, "8주 이하로 해주세요"),
  primary: z.enum(["hours", "retention", "surrogate_2ep"], "Primary 지표를 골라주세요"),
  hours_treatment: z.enum(["raw", "winsorize_p99", "log"], "시청 시간 처리 방식을 골라주세요"),
  cuped: z.boolean("CUPED 사용 여부를 골라주세요"),
  correction,
  stopping: z.enum(["fixed", "peek_stop", "sequential"], "중간 확인 규칙을 골라주세요"),
  exclude_first_week: z.boolean("첫 주 제외 여부를 골라주세요"),
});

/** s6: 출시 결정과 장기 검증 계획 */
export const p3Schema = z
  .object({
    phase: z.literal("p3"),
    ship: z.enum(["R3", "R4", "R2", "none"], "출시할 랭커를 골라주세요"),
    long_term: z.enum(["holdout", "extend", "bandit", "none"], "장기 검증 방식을 골라주세요"),
    holdout_pct: z.number().min(0.5, "0.5% 이상으로 해주세요").max(20, "20% 이하로 해주세요").optional(),
    holdout_months: z.number().int().min(1).max(12, "12개월 이하로 해주세요").optional(),
    rationale: z.string().trim().min(1, "근거를 적어주세요"),
  })
  .superRefine((d, ctx) => {
    if (d.long_term === "holdout") {
      if (d.holdout_pct === undefined) ctx.addIssue({ code: "custom", path: ["holdout_pct"], message: "홀드아웃 비율을 적어주세요" });
      if (d.holdout_months === undefined) ctx.addIssue({ code: "custom", path: ["holdout_months"], message: "홀드아웃 기간(개월)을 적어주세요" });
    }
  });

export const designUnion = z.discriminatedUnion("phase", [p1Schema, p2Schema, p3Schema]);
export type DesignP1 = z.infer<typeof p1Schema>;
export type DesignP2 = z.infer<typeof p2Schema>;
export type DesignP3 = z.infer<typeof p3Schema>;
export type Design = DesignP1 | DesignP2 | DesignP3;
export type DiagnoseInput = z.infer<typeof diagnoseSchema>;
