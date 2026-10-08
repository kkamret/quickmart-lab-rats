import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { normalizeClassCode } from "@/lib/class-code";
import { getPlugin } from "@/lib/cases/registry";
import { buildReveal, latestDecisionPicks, type RunRow } from "@/lib/reveal";
import { teamScopedBody } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/server";

// 조 화면용 정답 공개: 강사가 공개를 켠 뒤에만 원문 비교 해설과 이 조의 시뮬레이션 함정 목록을 내려준다(규칙 3).
export async function POST(req: Request) {
  const body = await parseBody(req, teamScopedBody);
  if ("error" in body) return body.error;
  const db = supabaseAdmin();
  const { data: cls } = await db.from("classes").select("id, reveal_answers").eq("code", normalizeClassCode(body.data.code)).maybeSingle();
  if (!cls) return fail("수업 코드를 찾을 수 없어요.", 404);
  if (!cls.reveal_answers) return fail("아직 정답이 공개되지 않았어요.", 403);
  const { data: team } = await db.from("teams").select("id, case_key").eq("id", body.data.teamId).eq("class_id", cls.id).maybeSingle();
  if (!team) return fail("이 수업에 속한 조가 아니에요.", 404);
  const plugin = getPlugin(team.case_key);
  if (!plugin) return fail("먼저 사례를 골라주세요.", 409);
  const [{ data: runs }, { data: subs }] = await Promise.all([
    db.from("sim_runs").select("team_id, phase, design, result, created_at").eq("team_id", team.id),
    db.from("submissions").select("phase, version, payload").eq("team_id", team.id).eq("kind", "decision"),
  ]);
  const picks = latestDecisionPicks((subs ?? []) as { phase: string; version: number; payload: Record<string, unknown> }[]);
  return NextResponse.json(buildReveal(plugin, (runs ?? []) as RunRow[], team.id, picks));
}
