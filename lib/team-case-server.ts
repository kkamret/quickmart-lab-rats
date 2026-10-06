import type { SupabaseClient } from "@supabase/supabase-js";
import { checkCasePick, type CasePickResult } from "./team-case";

/**
 * 사례 선택 저장 (경쟁 상태 방지). "확인 후 저장"만 하면 여러 조가 동시에 마지막 자리를 보고 모두 통과해 정원을 넘는다(부하 점검에서 재현).
 * 그래서 저장 → 다시 세기 → 정원을 넘었으면 내 선택을 되돌리는 순서로 한다.
 *
 * 마지막으로 다시 읽는 조는 앞서 커밋된 모든 저장을 보므로, 정원을 넘는 상황이면 그 조가 반드시 되돌린다 → 정원 초과는 생기지 않는다.
 * 대신 거의 동시에 저장된 조들이 서로의 저장을 보고 함께 되돌릴 수 있다(자리가 남았는데 "찼어요"가 나올 수 있음). 이때는 다시 누르면 된다.
 */
export async function savePick(
  db: SupabaseClient,
  args: { classId: string; teamId: string; caseKey: string; prevCase: string | null; allowedCases: string[]; maxTeamsPerCase: number },
): Promise<CasePickResult | { ok: false; reason: "error"; message: string }> {
  const opts = { allowedCases: args.allowedCases, maxTeamsPerCase: args.maxTeamsPerCase };
  const others = async () => {
    const { data } = await db.from("teams").select("case_key").eq("class_id", args.classId).neq("id", args.teamId);
    return (data ?? []).map((t: { case_key: string | null }) => t.case_key);
  };

  const before = checkCasePick(args.caseKey as never, await others(), opts);
  if (!before.ok) return before;

  const { error } = await db.from("teams").update({ case_key: args.caseKey }).eq("id", args.teamId);
  if (error) {
    console.error("[team-case] 저장 실패", error);
    return { ok: false, reason: "error", message: "사례를 저장하지 못했어요." };
  }

  const after = checkCasePick(args.caseKey as never, await others(), opts);
  if (!after.ok) {
    await db.from("teams").update({ case_key: args.prevCase }).eq("id", args.teamId);
    return after;
  }
  return { ok: true };
}
