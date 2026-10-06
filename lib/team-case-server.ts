import type { SupabaseClient } from "@supabase/supabase-js";
import { checkCasePick, type CasePickResult } from "./team-case";

export type PickArgs = {
  classId: string; teamId: string; caseKey: string; prevCase: string | null; allowedCases: string[]; maxTeamsPerCase: number;
};
type PickOutcome = CasePickResult | { ok: false; reason: "error"; message: string };

const ATTEMPTS = 4;
const jitter = () => new Promise<void>((r) => setTimeout(r, 30 + Math.random() * 120));

/**
 * 사례 선택 저장 (경쟁 상태 방지). "확인 후 저장"만 하면 여러 조가 동시에 마지막 자리를 보고 모두 통과해 정원을 넘는다(부하 점검에서 재현).
 * 그래서 저장 → 다시 세기 → 정원을 넘었으면 내 선택을 되돌리는 순서로 한다.
 *
 * 마지막으로 다시 읽는 조는 앞서 커밋된 모든 저장을 보므로, 정원을 넘는 상황이면 그 조가 반드시 되돌린다 → 정원 초과는 생기지 않는다.
 * 다만 거의 동시에 저장한 조들이 서로의 저장을 보고 함께 되돌리면 자리가 남는다(부하 점검: 8자리 중 5조만 성공).
 * 그래서 되돌린 뒤 다시 세어 보고, 정말 가득 찬 게 아니라 자리가 남아 있으면(경합으로 함께 되돌려진 경우)
 * 무작위로 조금 쉬었다가 다시 시도한다. 쉬는 시간이 조마다 달라서 다음 시도에서는 겹치지 않을 가능성이 높다.
 */
export async function savePick(db: SupabaseClient, args: PickArgs, wait: () => Promise<void> = jitter): Promise<PickOutcome> {
  const opts = { allowedCases: args.allowedCases, maxTeamsPerCase: args.maxTeamsPerCase };
  const others = async () => {
    const { data } = await db.from("teams").select("case_key").eq("class_id", args.classId).neq("id", args.teamId);
    return (data ?? []).map((t: { case_key: string | null }) => t.case_key);
  };

  let last: CasePickResult = { ok: false, reason: "full", message: "" };
  for (let attempt = 0; attempt < ATTEMPTS; attempt++) {
    const before = checkCasePick(args.caseKey as never, await others(), opts);
    if (!before.ok) return before;

    const { error } = await db.from("teams").update({ case_key: args.caseKey }).eq("id", args.teamId);
    if (error) {
      console.error("[team-case] 저장 실패", error);
      return { ok: false, reason: "error", message: "사례를 저장하지 못했어요." };
    }

    const after = checkCasePick(args.caseKey as never, await others(), opts);
    if (after.ok) return { ok: true };

    last = after;
    await db.from("teams").update({ case_key: args.prevCase }).eq("id", args.teamId);
    // 되돌린 뒤에도 자리가 없으면 정말 가득 찬 것 → 바로 안내. 자리가 남았으면 경합으로 함께 되돌려진 것 → 다시 시도
    const settled = checkCasePick(args.caseKey as never, await others(), opts);
    if (!settled.ok) return settled;
    await wait();
  }
  return last;
}
