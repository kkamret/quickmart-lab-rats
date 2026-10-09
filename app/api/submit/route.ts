import { NextResponse } from "next/server";
import { fail, parseBody } from "@/lib/api";
import { normalizeClassCode } from "@/lib/class-code";
import { getPlugin } from "@/lib/cases/registry";
import { decisionSchema, formatIssues, simPhaseOf, submissionKindOf } from "@/lib/lab/phase";
import { runSimulation } from "@/lib/lab/sim-service";
import { memoPayload, submitBody } from "@/lib/schemas";
import { supabaseAdmin } from "@/lib/supabase/server";

// 제출(진단·설계·결정): 사례 플러그인의 zod 로 검증하고, 스텝이 열려 있을 때만 저장한다. 재제출은 version 증가, 최신만 사용.
export async function POST(req: Request) {
  const body = await parseBody(req, submitBody);
  if ("error" in body) return body.error;
  const { teamId, step, phase, kind, payload } = body.data;

  const db = supabaseAdmin();
  const { data: cls } = await db.from("classes").select("id").eq("code", normalizeClassCode(body.data.code)).maybeSingle();
  if (!cls) return fail("수업 코드를 찾을 수 없어요.", 404);
  const { data: team } = await db.from("teams").select("id, case_key").eq("id", teamId).eq("class_id", cls.id).maybeSingle();
  if (!team) return fail("이 수업에 속한 조가 아니에요.", 404);
  const plugin = getPlugin(team.case_key);
  if (!plugin) return fail("먼저 사례를 골라주세요. (아직 준비되지 않은 사례일 수도 있어요.)", 409);

  // s8 결정 메모는 사례와 무관한 공통 제출이다. 그 밖에는 이 (step, phase, kind) 조합이 플러그인에 실제로 있어야 한다.
  const isMemo = step === "s8_share" && phase === "memo" && kind === "note";
  const def = isMemo || plugin.phases.find((p) => p.step === step && simPhaseOf(p.key) === phase && submissionKindOf(p.kind) === kind);
  if (!def) return fail("이 단계에서는 제출할 수 없는 항목이에요.");

  const { data: st } = await db.from("step_states").select("status").eq("class_id", cls.id).eq("step", step).maybeSingle();
  if (st?.status !== "open") return fail("이 스텝은 지금 열려 있지 않아요. 강사님이 열면 제출할 수 있어요.", 409);

  if (isMemo) {
    const parsed = memoPayload.safeParse(payload);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
  } else if (kind === "decision") {
    const dec = plugin.decisions[phase];
    // 설계를 한 번도 제출하지 않았다면 결정을 받지 않는다(UI 에서 막아도 API 로 직접 보낼 수 있다)
    const { data: design } = await db
      .from("submissions").select("version").eq("team_id", teamId).eq("phase", dec?.requires ?? phase).eq("kind", "design").limit(1).maybeSingle();
    if (!design) return fail("먼저 설계를 제출해 주세요. 설계 없이는 결정을 제출할 수 없어요.", 409);
    const parsed = decisionSchema((dec?.options ?? []).map((o) => o.id), dec?.fields).safeParse(payload);
    if (!parsed.success) return fail(parsed.error.issues[0].message);
  } else {
    const schema = plugin.designSchema[phase];
    const parsed = schema?.safeParse(payload);
    if (!parsed || !parsed.success) {
      const msgs = formatIssues(parsed ? parsed.error.issues : [], plugin.formMeta[phase] ?? []);
      return fail(msgs[0] ?? "입력값을 확인해 주세요.");
    }
    // 시뮬레이션이 거부할 설계(예: 대조군에 없는 지표를 메인으로)는 제출 단계에서 바로 알려준다
    if (kind === "design") {
      const sim = runSimulation(plugin, phase, payload, "main");
      if (!sim.ok) return fail(sim.message);
    }
  }

  const { data: last } = await db
    .from("submissions").select("version").eq("team_id", teamId).eq("step", step).eq("phase", phase).eq("kind", kind)
    .order("version", { ascending: false }).limit(1).maybeSingle();
  const version = (last?.version ?? 0) + 1;
  const { error } = await db.from("submissions").insert({ class_id: cls.id, team_id: teamId, case_key: plugin.key, step, phase, kind, payload, version });
  if (error) {
    console.error("[api/submit] 저장 실패", error);
    return fail("제출을 저장하지 못했어요.", 500);
  }
  return NextResponse.json({ ok: true, version });
}
