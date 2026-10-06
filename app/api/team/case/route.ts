import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { normalizeClassCode } from "@/lib/class-code";
import { pickCaseBody } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/server";
import { savePick } from "@/lib/team-case-server";

// 사례 선택: 수업이 허용한 사례이고, 사례당 조 수 제한 안일 때만 저장. s0_pick 이 열려 있어야 한다.
export async function POST(req: Request) {
  const body = await parseBody(req, pickCaseBody);
  if ("error" in body) return body.error;
  const { teamId, caseKey } = body.data;

  const db = supabaseAdmin();
  const { data: cls } = await db
    .from("classes")
    .select("id, allowed_cases, max_teams_per_case")
    .eq("code", normalizeClassCode(body.data.code))
    .maybeSingle();
  if (!cls) return fail("수업 코드를 찾을 수 없어요.", 404);

  const { data: team } = await db.from("teams").select("id, case_key").eq("id", teamId).eq("class_id", cls.id).maybeSingle();
  if (!team) return fail("이 수업에 속한 조가 아니에요.", 404);

  const { data: step } = await db
    .from("step_states").select("status").eq("class_id", cls.id).eq("step", "s0_pick").maybeSingle();
  if (step?.status !== "open") return fail("지금은 사례를 고를 수 없어요. 강사님이 열어주면 선택할 수 있어요.", 409);

  const result = await savePick(db, {
    classId: cls.id, teamId, caseKey, prevCase: team.case_key ?? null,
    allowedCases: cls.allowed_cases, maxTeamsPerCase: cls.max_teams_per_case,
  });
  if (!result.ok) return fail(result.message, result.reason === "error" ? 500 : 409);
  return NextResponse.json({ ok: true, caseKey });
}
