import { describe, expect, it } from "vitest";
import { p1Schema } from "../schema";

const base = {
  phase: "p1", method: "interleaving", il_scheme: "team_draft", il_credit: "qualified_play_10min",
  il_members_per_pair: 10000, il_days: 7, candidates: ["R2", "R3"], correction: "bh", advance_rule: "보정 후 유의",
};

describe("넷플릭스 p1 가설 한 문장", () => {
  it("가설이 없어도 통과한다 (기존 설계 호환)", () => {
    expect(p1Schema.safeParse(base).success).toBe(true);
  });
  it("가설을 적으면 공백을 다듬어 저장한다", () => {
    const r = p1Schema.safeParse({ ...base, hypothesis: "  신규 랭커를 걸러 내면 시청 시간이 늘 것이다  " });
    expect(r.success && r.data.hypothesis).toBe("신규 랭커를 걸러 내면 시청 시간이 늘 것이다");
  });
});
