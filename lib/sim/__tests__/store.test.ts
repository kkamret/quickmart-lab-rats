import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { saveSimRun } from "../store";

type Row = Record<string, unknown> & { id: string };

/** saveSimRun 이 쓰는 체인만 흉내 내는 인메모리 sim_runs */
function fakeDb(rows: Row[]) {
  let n = rows.length;
  const from = () => ({
    select: () => {
      const filters: [string, unknown][] = [];
      const q = {
        eq: (k: string, v: unknown) => { filters.push([k, v]); return q; },
        limit: () => q,
        maybeSingle: async () => ({ data: rows.find((r) => filters.every(([k, v]) => r[k] === v)) ?? null }),
      };
      return q;
    },
    update: (patch: Record<string, unknown>) => ({ eq: async (_k: string, id: string) => { Object.assign(rows.find((r) => r.id === id)!, patch); return {}; } }),
    insert: async (row: Record<string, unknown>) => { rows.push({ ...row, id: `r${++n}` }); return {}; },
  });
  return { from } as unknown as SupabaseClient;
}

const input = { class_id: "c", team_id: "t", case_key: "baemin", phase: "p1", design: { a: 1 }, design_hash: "h", result: { v: "new" } };

describe("saveSimRun", () => {
  it("처음 보는 설계는 새 행으로 넣는다", async () => {
    const rows: Row[] = [];
    expect(await saveSimRun(fakeDb(rows), input)).toBe("inserted");
    expect(rows).toHaveLength(1);
  });

  it("같은 design_hash 가 이미 있으면 새 행을 만들지 않고 결과와 시각을 갱신한다", async () => {
    const rows: Row[] = [{ ...input, id: "r1", result: { v: "old" }, created_at: "2026-10-01T00:00:00.000Z" }];
    const now = new Date("2026-10-10T00:00:00.000Z");
    expect(await saveSimRun(fakeDb(rows), input, now)).toBe("updated");
    expect(rows).toHaveLength(1);
    expect(rows[0].result).toEqual({ v: "new" });
    expect(rows[0].created_at).toBe(now.toISOString());
  });

  it("다른 조의 같은 design_hash 는 건드리지 않는다", async () => {
    const rows: Row[] = [{ ...input, id: "r1", team_id: "other", result: { v: "old" } }];
    expect(await saveSimRun(fakeDb(rows), input)).toBe("inserted");
    expect(rows[0].result).toEqual({ v: "old" });
  });
});
