import { z } from "zod";

const hypothesis = z.object({
  action: z.string().trim().min(1, "대상과 Treatment 를 적어주세요"),
  behavior: z.string().trim().min(1, "이유(사용자 행동 변화)를 적어주세요"),
  impact: z.string().trim().min(1, "Metric·방향·변화 크기를 적어주세요"),
});

const metricDef = z.enum(["started", "submitted", "submitted_72h"], "지표 정의를 골라주세요");
const alpha = z.union([z.literal(0.01), z.literal(0.05), z.literal(0.1)]);
const power = z.union([z.literal(0.7), z.literal(0.8), z.literal(0.9)]);
const stopping = z.enum(["fixed", "peek_stop", "sequential"], "중간 확인 규칙을 골라주세요");

export const diagnoseSchema = z.object({
  background: z.string().trim().min(1, "배경을 적어주세요"),
  problem: z.string().trim().min(1, "문제를 적어주세요"),
  hypothesis,
  primary_metric_definition: metricDef,
  success_criteria: z.string().trim().min(1, "성공 기준을 적어주세요"),
  risks: z.string().trim().min(1, "리스크를 적어주세요"),
  owner: z.string().trim().min(1, "담당자를 적어주세요"),
});

const guardrail = z.enum(["short_review_rate", "uninstall_rate", "report_rate"]);

const reviewShared = {
  assignment_timing: z.enum(["install_all", "review_received", "review_screen_open"], "배정 시점을 골라주세요"),
  analysis_population: z.enum(["all_assigned", "review_received", "review_screen_open"], "분석 모집단을 골라주세요"),
  metric_definition: metricDef,
  guardrails: z.array(guardrail),
  alpha,
  power,
  mde_pp: z.number().positive("MDE 를 적어주세요"),
  duration_days: z.number().int().min(7, "7일 미만은 입력할 수 없어요").max(28, "28일 이하로 해주세요"),
  stopping,
  aa_days: z.number().int().min(1).max(14).optional(),
  /** A/A 모드(s3 의 A/A 실행): 진짜 효과를 0 으로 둔다 */
  aa: z.boolean().optional(),
};

/** s2: 외부 플랫폼 F 위의 거래후기 실험 */
export const p1Schema = z.object({
  phase: z.literal("p1"),
  ...reviewShared,
  data_source: z.enum(["client_events", "server_db"], "데이터 소스를 골라주세요"),
  run_aa_first: z.boolean("A/A 를 먼저 할지 골라주세요"),
});

/** s5: 자체 플랫폼으로 재설계한 재실험. 거래후기 설계 필드는 s2 에서 이어받는다(없으면 시뮬레이션이 안내하며 거부). */
export const p2Schema = z.object({
  phase: z.literal("p2"),
  assignment_key: z.enum(["user_id_hash", "device_id", "instance_id"], "배정 키를 골라주세요"),
  salt: z.enum(["new_per_experiment", "reuse_previous"], "salt 를 골라주세요"),
  new_user_policy: z.enum(["assign_on_first_launch", "exclude"], "신규 사용자 처리를 골라주세요"),
  logging: z.enum(["server_events", "client_events"], "로깅 방식을 골라주세요"),
  rerun_aa: z.boolean("A/A 재검증 여부를 골라주세요"),
  assignment_timing: reviewShared.assignment_timing.optional(),
  analysis_population: reviewShared.analysis_population.optional(),
  metric_definition: metricDef.optional(),
  guardrails: reviewShared.guardrails.optional(),
  alpha: alpha.optional(),
  power: power.optional(),
  mde_pp: z.number().positive().optional(),
  duration_days: reviewShared.duration_days.optional(),
  stopping: stopping.optional(),
  aa_days: reviewShared.aa_days,
  aa: reviewShared.aa,
});

/** s6: 거래완료 게시글 검색 노출 */
export const p3Schema = z.object({
  phase: z.literal("p3"),
  randomization_unit: z.enum(["user", "neighborhood"], "배정 단위를 골라주세요"),
  primary: z.enum(["listing_creation_rate", "sell_through_7d"], "Primary 지표를 골라주세요"),
  guardrails: z.array(z.enum(["search_to_chat", "search_retry"])),
  analysis_se: z.enum(["naive", "cluster_robust"], "표준오차 계산 방식을 골라주세요"),
  duration_days: z.number().int().min(7, "7일 미만은 입력할 수 없어요").max(42, "42일 이하로 해주세요"),
  alpha,
  power,
  mde_pct: z.number().positive("MDE 를 적어주세요"),
  qualitative_weight: z.string().trim().min(1, "정성 의견을 어떻게 반영할지 적어주세요"),
  aa: z.boolean().optional(),
});

export const designUnion = z.discriminatedUnion("phase", [p1Schema, p2Schema, p3Schema]);
export type DesignP1 = z.infer<typeof p1Schema>;
export type DesignP2 = z.infer<typeof p2Schema>;
export type DesignP3 = z.infer<typeof p3Schema>;
export type Design = DesignP1 | DesignP2 | DesignP3;
export type SimPhase = Design["phase"];
