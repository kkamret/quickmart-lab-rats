/** sim_runs 저장: 같은 (조, Phase, design_hash) 는 한 행만 두고, 다시 돌리면 그 행의 결과와 시각을 갱신한다. */
import type { SupabaseClient } from "@supabase/supabase-js";

export type SimRunInput = {
  class_id: string;
  team_id: string;
  case_key: string;
  phase: string;
  design: unknown;
  design_hash: string;
  result: unknown;
};

/**
 * 캐시에 같은 design_hash 가 있어도 옛 행을 그대로 두면, 엔진을 고친 뒤나 같은 설계를 다시 낸 뒤에도 "최신 실행"이
 * 옛 결과를 가리킨다(정답 공개·AI 리뷰·강사 보드가 모두 created_at 이 가장 늦은 행을 쓴다). 그래서 적중하면 결과와 시각을 갱신한다.
 */
export async function saveSimRun(db: SupabaseClient, row: SimRunInput, now = new Date()): Promise<"inserted" | "updated"> {
  const { data: cached } = await db
    .from("sim_runs").select("id").eq("team_id", row.team_id).eq("phase", row.phase).eq("design_hash", row.design_hash).limit(1).maybeSingle();
  if (cached) {
    await db.from("sim_runs").update({ design: row.design, result: row.result, created_at: now.toISOString() }).eq("id", cached.id);
    return "updated";
  }
  await db.from("sim_runs").insert(row);
  return "inserted";
}
