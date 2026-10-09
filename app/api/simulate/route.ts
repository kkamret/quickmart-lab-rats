import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { normalizeClassCode } from "@/lib/class-code";
import { getPlugin } from "@/lib/cases/registry";
import { simPhaseOf } from "@/lib/lab/phase";
import { runSimulation } from "@/lib/lab/sim-service";
import { simulateBody } from "@/lib/schemas";
import { saveSimRun } from "@/lib/sim/store";
import { supabaseAdmin } from "@/lib/supabase/server";

// 시뮬레이션: 제출한 최신 설계로 plugin.simulate → sim_runs 에 저장 → flags·숨김 필드를 뺀 Readout 만 반환(규칙 3)
export async function POST(req: Request) {
  const body = await parseBody(req, simulateBody);
  if ("error" in body) return body.error;
  const { teamId, phase, mode } = body.data;

  const db = supabaseAdmin();
  const { data: cls } = await db.from("classes").select("id").eq("code", normalizeClassCode(body.data.code)).maybeSingle();
  if (!cls) return fail("수업 코드를 찾을 수 없어요.", 404);
  const { data: team } = await db.from("teams").select("id, case_key").eq("id", teamId).eq("class_id", cls.id).maybeSingle();
  if (!team) return fail("이 수업에 속한 조가 아니에요.", 404);
  const plugin = getPlugin(team.case_key);
  if (!plugin) return fail("먼저 사례를 골라주세요.", 409);

  const def = plugin.phases.find((p) => p.key === phase);
  if (!def || (def.kind !== "run" && def.kind !== "readout")) return fail("시뮬레이션을 돌릴 수 없는 단계예요.");
  if (def.kind === "readout" && mode === "aa") return fail("A/A 는 실행 단계에서만 돌릴 수 있어요.");

  const { data: st } = await db.from("step_states").select("status").eq("class_id", cls.id).eq("step", def.step).maybeSingle();
  if (!st || st.status === "locked") return fail("이 스텝은 아직 열리지 않았어요.", 409);

  const simPhase = simPhaseOf(phase);
  const { data: sub } = await db
    .from("submissions").select("payload").eq("team_id", teamId).eq("phase", simPhase).eq("kind", "design")
    .order("version", { ascending: false }).limit(1).maybeSingle();
  if (!sub) return fail("먼저 설계를 제출해 주세요.", 409);

  const out = runSimulation(plugin, phase, sub.payload as Record<string, unknown>, mode);
  if (!out.ok) return fail(out.message);

  // 같은 설계(design_hash)는 한 행만 두되, 다시 돌리면 그 행의 결과와 시각을 갱신한다 — 강사 화면의 결과 비교(M4)·정답 공개·AI 리뷰가
  // "가장 최근 실행"으로 이 테이블을 읽으므로, 옛 행을 그대로 두면 엔진을 고친 뒤에도 옛 결과를 가리킨다.
  await saveSimRun(db, {
    class_id: cls.id, team_id: teamId, case_key: plugin.key, phase: simPhase,
    design: mode === "aa" ? { ...(sub.payload as object), aa: true } : sub.payload,
    design_hash: out.readout.designHash, result: out.readout,
  });
  return NextResponse.json({ readout: out.team });
}
