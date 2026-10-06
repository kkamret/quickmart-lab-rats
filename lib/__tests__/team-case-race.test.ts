import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it } from "vitest";
import { savePick } from "../team-case-server";

type Row = { id: string; class_id: string; case_key: string | null };

/** teams 테이블만 흉내 내는 인메모리 DB. hook 으로 호출 사이에 다른 조의 저장을 끼워 넣을 수 있다. */
function fakeDb(rows: Row[], onRead?: (n: number) => void) {
  let reads = 0;
  return {
    from: () => {
      let filters: ((r: Row) => boolean)[] = [];
      let patch: Partial<Row> | null = null;
      const b: Record<string, unknown> = {
        select: () => b,
        update: (p: Partial<Row>) => ((patch = p), b),
        eq: (k: keyof Row, v: unknown) => (filters.push((r) => r[k] === v), apply(b)),
        neq: (k: keyof Row, v: unknown) => (filters.push((r) => r[k] !== v), apply(b)),
      };
      const matched = () => rows.filter((r) => filters.every((f) => f(r)));
      const apply = (self: Record<string, unknown>) => {
        // update 는 마지막 eq 에서 실행, select 는 then 으로 실행
        if (patch) {
          for (const r of matched()) Object.assign(r, patch);
          return Promise.resolve({ error: null });
        }
        (self as { then?: unknown }).then = (res: (v: unknown) => unknown) => {
          onRead?.(++reads);
          return Promise.resolve({ data: matched().map((r) => ({ case_key: r.case_key })) }).then(res);
        };
        return self;
      };
      return b;
    },
  } as unknown as SupabaseClient;
}

const base = { classId: "c1", allowedCases: ["baemin", "toss"], maxTeamsPerCase: 2 };
const count = (rows: Row[], c: string) => rows.filter((r) => r.case_key === c).length;

describe("사례 선택 저장 (경쟁 상태)", () => {
  it("자리가 있으면 저장한다", async () => {
    const rows: Row[] = [{ id: "a", class_id: "c1", case_key: "baemin" }, { id: "b", class_id: "c1", case_key: null }];
    const r = await savePick(fakeDb(rows), { ...base, teamId: "b", caseKey: "baemin", prevCase: null });
    expect(r.ok).toBe(true);
    expect(count(rows, "baemin")).toBe(2);
  });

  it("처음부터 가득 차 있으면 저장하지 않는다", async () => {
    const rows: Row[] = [
      { id: "a", class_id: "c1", case_key: "baemin" }, { id: "b", class_id: "c1", case_key: "baemin" }, { id: "c", class_id: "c1", case_key: null },
    ];
    const r = await savePick(fakeDb(rows), { ...base, teamId: "c", caseKey: "baemin", prevCase: null });
    expect(r).toMatchObject({ ok: false, reason: "full" });
    expect(rows[2].case_key).toBeNull();
  });

  it("확인 직후 다른 조가 먼저 저장해 정원을 넘기게 되면 내 선택을 이전 값으로 되돌린다", async () => {
    const rows: Row[] = [
      { id: "a", class_id: "c1", case_key: "baemin" }, { id: "b", class_id: "c1", case_key: null }, { id: "c", class_id: "c1", case_key: "toss" },
    ];
    // c(이전 toss)가 baemin 을 고르는 동안, 첫 번째 읽기 직후 b 가 baemin 을 먼저 저장한 상황
    const db = fakeDb(rows, (n) => { if (n === 1) rows[1].case_key = "baemin"; });
    const r = await savePick(db, { ...base, teamId: "c", caseKey: "baemin", prevCase: "toss" });
    expect(r).toMatchObject({ ok: false, reason: "full" });
    expect(rows[2].case_key).toBe("toss");
    expect(count(rows, "baemin")).toBe(2);
  });

  it("거의 동시에 여러 조가 저장해도 정원을 넘는 일은 없다 (함께 되돌려질 수는 있다)", async () => {
    const rows: Row[] = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, class_id: "c1", case_key: null }));
    const dbs = rows.map(() => fakeDb(rows));
    await Promise.all(rows.map((r, i) => savePick(dbs[i], { ...base, teamId: r.id, caseKey: "baemin", prevCase: null })));
    expect(count(rows, "baemin")).toBeLessThanOrEqual(2);
  });
});

