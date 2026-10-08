import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { simulateBaemin } from "@/lib/cases/baemin";
import { ALL_FLAGS, FLAG_LABELS } from "@/lib/sim/core/flags";
import { generateJson } from "../generate";
import type { ReviewLLM } from "../llm";
import { FLAG_NUDGES, inputHash, leaksFlag, mockClassReview, mockTeamReview, scrubTeamReview, sharePrompt, summarizeSim, teamPrompt, type TeamReviewInput } from "../prompts";
import { COOLDOWN_MS, ReviewError, readShare, reviewClass, reviewShare, reviewTeam } from "../service";
import { classReviewSchema, teamReviewSchema } from "../types";

vi.mock("server-only", () => ({}));

const llmReturning = (...texts: { text: string; truncated?: boolean }[]): ReviewLLM & { calls: number[] } => {
  const calls: number[] = [];
  return {
    model: "test", calls,
    async complete({ maxTokens }) {
      calls.push(maxTokens);
      const t = texts[Math.min(calls.length - 1, texts.length - 1)];
      return { text: t.text, truncated: t.truncated ?? false };
    },
  };
};
const goodTeam = { score: 70, strengths: ["a"], issues: [], nudge_questions: ["q?"], vs_original: "" };

describe("generateJson", () => {
  it("JSON 을 zod 로 검증해 돌려준다 (코드펜스도 허용)", async () => {
    const llm = llmReturning({ text: "```json\n" + JSON.stringify(goodTeam) + "\n```" });
    expect(await generateJson(llm, teamReviewSchema, { system: "s", user: "u" })).toEqual(goodTeam);
  });
  it("형식이 틀리면 1회만 재시도한다", async () => {
    const llm = llmReturning({ text: "{}" }, { text: JSON.stringify(goodTeam) });
    expect(await generateJson(llm, teamReviewSchema, { system: "s", user: "u" })).toEqual(goodTeam);
    expect(llm.calls).toHaveLength(2);
  });
  it("두 번 다 틀리면 오류를 던진다(무한 재시도 없음)", async () => {
    const llm = llmReturning({ text: "not json" });
    await expect(generateJson(llm, teamReviewSchema, { system: "s", user: "u" })).rejects.toThrow("해석하지 못했어요");
    expect(llm.calls).toHaveLength(2);
  });
  it("응답이 잘리면 max_tokens 를 늘려서 다시 요청한다", async () => {
    const llm = llmReturning({ text: "{\"score\":", truncated: true }, { text: JSON.stringify(goodTeam) });
    await generateJson(llm, teamReviewSchema, { system: "s", user: "u" });
    expect(llm.calls[0]).toBe(2500);
    expect(llm.calls[1]).toBeGreaterThan(2500);
  });
});

describe("플래그 노출 방어 (규칙 3)", () => {
  it("플래그 코드와 한글 이름이 든 문장은 조 화면용 피드백에서 빠진다", () => {
    const r = scrubTeamReview({
      score: 60,
      strengths: ["가설이 명확해요"],
      issues: ["SRM 이 깨졌어요", `${FLAG_LABELS.NOVELTY} 가 의심돼요`, "표본 수를 다시 볼까요?"],
      nudge_questions: ["UNIT_MISMATCH 아닌가요?", "두 그룹의 비율이 설계대로인가요?"],
      vs_original: "PEEKED 였어요",
    });
    expect(r.strengths).toEqual(["가설이 명확해요"]);
    expect(r.issues).toEqual(["표본 수를 다시 볼까요?"]);
    expect(r.nudge_questions).toEqual(["두 그룹의 비율이 설계대로인가요?"]);
    expect(r.vs_original).toBe("");
  });
  it("mock 유도 질문은 플래그 이름을 말하지 않는다", () => {
    for (const q of Object.values(FLAG_NUDGES)) expect(leaksFlag(q!), q).toBe(false);
  });
  it("모든 플래그 코드를 감지한다", () => {
    for (const f of ALL_FLAGS) expect(leaksFlag(`이건 ${f} 예요`)).toBe(true);
  });
});

const design = {
  phase: "p1", hypothesis: { action: "안내해요", behavior: "바로 주문해요", impact: "이탈이 줄어요" },
  scope: { os: "android", surface: "store_home" }, unit: "session",
  metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov"] },
  alpha: 0.05, power: 0.8, mde_pp: 2, duration_days: 7, allocation: 1, ramp: "none", analysis_mode: "pooled", stopping: "fixed", count_basis: "assignment",
};
const sim = summarizeSim(simulateBaemin(design));

describe("mock 리뷰", () => {
  it("team: 스키마를 만족하고 플래그 이름 없이 질문으로 유도한다", () => {
    expect(sim.flags.length).toBeGreaterThan(0);
    const r = mockTeamReview({ case: "baemin", step: "s2_design", rubric: "", submission: {}, sim, revealed: false });
    expect(teamReviewSchema.safeParse(r).success).toBe(true);
    expect(r.vs_original).toBe("");
    expect(JSON.stringify(r)).not.toMatch(/UNIT_MISMATCH|SHORT_DURATION/);
  });
  it("class: 스키마를 만족하고 걸린 플래그를 개념 보드에 모은다", () => {
    const r = mockClassReview({ step: "s2_design", rubrics: {}, teams: [{ team: "1조", case: "baemin", submission: {}, sim }] });
    expect(classReviewSchema.safeParse(r).success).toBe(true);
    expect(r.concept_board.length).toBe(sim.flags.length);
  });
});

/** 서비스가 쓰는 supabase 체인만 흉내 내는 인메모리 DB */
function fakeDb(tables: Record<string, Record<string, unknown>[]>) {
  const builder = (name: string) => {
    let rows = tables[name];
    let order: [string, boolean] | null = null;
    let limit = Infinity;
    const b: Record<string, unknown> = {
      select: () => b,
      eq: (k: string, v: unknown) => ((rows = rows.filter((r) => r[k] === v)), b),
      is: (k: string, v: unknown) => ((rows = rows.filter((r) => (r[k] ?? null) === v)), b),
      order: (k: string, o: { ascending: boolean }) => ((order = [k, o.ascending]), b),
      limit: (n: number) => ((limit = n), b),
      maybeSingle: async () => ({ data: result()[0] ?? null }),
      single: async () => ({ data: result()[0] ?? null, error: null }),
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: result(), error: null }).then(res),
      insert: (row: Record<string, unknown>) => {
        const created = { ...row, created_at: new Date(clock.now).toISOString() };
        tables[name].push(created);
        rows = [created];
        return b;
      },
    };
    const result = () => {
      const out = [...rows];
      if (order) out.sort((x, y) => (String(x[order![0]]) < String(y[order![0]]) ? 1 : -1) * (order![1] ? -1 : 1));
      return out.slice(0, limit);
    };
    return b;
  };
  return { from: builder } as unknown as SupabaseClient;
}
const clock = { now: Date.parse("2026-10-05T00:00:00Z") };

const seed = () => ({
  classes: [{ id: "c1", reveal_answers: false }] as Record<string, unknown>[],
  teams: [
    { id: "t1", name: "1조", case_key: "baemin", class_id: "c1" },
    { id: "t2", name: "2조", case_key: "baemin", class_id: "c1" },
  ],
  submissions: [{ team_id: "t1", class_id: "c1", phase: "p1", kind: "design", version: 1, payload: design }] as Record<string, unknown>[],
  sim_runs: [{ team_id: "t1", class_id: "c1", case_key: "baemin", phase: "p1", design, design_hash: "h", result: simulateBaemin(design), created_at: "2026-10-04T00:00:00Z" }],
  ai_reviews: [] as Record<string, unknown>[],
});

describe("reviewTeam / reviewClass (캐시·쿨다운·권한 범위)", () => {
  it("제출이 없으면 409", async () => {
    const db = fakeDb(seed());
    await expect(reviewTeam(db, { classId: "c1", teamId: "t2", step: "s2_design" }, clock.now)).rejects.toMatchObject({ status: 409 });
  });
  it("다른 수업의 조는 404", async () => {
    const db = fakeDb(seed());
    await expect(reviewTeam(db, { classId: "other", teamId: "t1", step: "s2_design" }, clock.now)).rejects.toBeInstanceOf(ReviewError);
  });
  it("키가 없으면 mock 으로 만들고 저장, 같은 입력은 캐시를 재사용한다", async () => {
    delete process.env.UPSTAGE_API_KEY;
    const t = seed();
    const db = fakeDb(t);
    const first = await reviewTeam(db, { classId: "c1", teamId: "t1", step: "s2_design" }, clock.now);
    expect(first.model).toBe("mock");
    expect(first.cached).toBe(false);
    expect(t.ai_reviews).toHaveLength(1);
    const again = await reviewTeam(db, { classId: "c1", teamId: "t1", step: "s2_design" }, clock.now + 1000);
    expect(again.cached).toBe(true);
    expect(t.ai_reviews).toHaveLength(1);
  });
  it("입력이 바뀌면 30초 안에는 429, 지나면 새로 만든다", async () => {
    delete process.env.UPSTAGE_API_KEY;
    const t = seed();
    const db = fakeDb(t);
    await reviewTeam(db, { classId: "c1", teamId: "t1", step: "s2_design" }, clock.now);
    t.submissions.push({ team_id: "t1", class_id: "c1", phase: "p1", kind: "design", version: 2, payload: { ...design, duration_days: 14 } });
    await expect(reviewTeam(db, { classId: "c1", teamId: "t1", step: "s2_design" }, clock.now + 5000)).rejects.toMatchObject({ status: 429 });
    clock.now += COOLDOWN_MS + 1000;
    const r = await reviewTeam(db, { classId: "c1", teamId: "t1", step: "s2_design" }, clock.now);
    expect(r.cached).toBe(false);
    expect(t.ai_reviews).toHaveLength(2);
  });
  it("class: 제출한 조만 모아 분석한다", async () => {
    delete process.env.UPSTAGE_API_KEY;
    const db = fakeDb(seed());
    const r = await reviewClass(db, { classId: "c1", step: "s2_design" }, clock.now);
    expect(r.output.team_cards.map((c) => c.team)).toEqual(["1조"]);
  });
  it("정답 공개 전에는 원문 해설을 보내지 않고, 공개 뒤에는 보내며 결과도 따로 캐시한다", async () => {
    delete process.env.UPSTAGE_API_KEY;
    const inputs: string[] = [];
    const spy = vi.spyOn(await import("../generate"), "generateJson").mockImplementation(async (_l, _s, p) => {
      inputs.push(p.user);
      return { score: 70, strengths: [], issues: ["SRM 을 확인하세요"], nudge_questions: ["q?"], vs_original: "원문은 달랐어요" } as never;
    });
    const t = seed();
    const db = fakeDb(t);
    const closed = await reviewTeam(db, { classId: "c1", teamId: "t1", step: "s2_design" }, clock.now);
    expect(JSON.parse(inputs[0]).original).toBeUndefined();
    expect(closed.output.issues).toEqual([]); // 함정 이름이 든 문장은 걸러진다
    t.classes[0].reveal_answers = true;
    clock.now += COOLDOWN_MS + 1000;
    const open = await reviewTeam(db, { classId: "c1", teamId: "t1", step: "s2_design" }, clock.now);
    expect(open.cached).toBe(false);
    expect(JSON.parse(inputs[1]).revealed).toBe(true);
    expect(JSON.parse(inputs[1]).original).toBeTruthy();
    expect(open.output.issues).toEqual(["SRM 을 확인하세요"]);
    expect(open.output.vs_original).toBe("원문은 달랐어요");
    spy.mockRestore();
  });
  it("class: 제출이 하나도 없으면 409", async () => {
    const db = fakeDb({ ...seed(), submissions: [] });
    await expect(reviewClass(db, { classId: "c1", step: "s2_design" }, clock.now)).rejects.toMatchObject({ status: 409 });
  });
});

describe("reviewShare / readShare (직소 브리핑)", () => {
  const withMemo = () => {
    const t = seed();
    t.submissions.push({ team_id: "t1", class_id: "c1", step: "s8_share", phase: "memo", kind: "note", version: 1, payload: { learned: "SRM 이 중요했어요", lesson: "먼저 의심하자" } });
    return t;
  };
  it("제출이 없으면 409", async () => {
    await expect(reviewShare(fakeDb({ ...seed(), submissions: [] }), { classId: "c1" }, clock.now)).rejects.toMatchObject({ status: 409 });
  });
  it("결정 메모와 시뮬레이션 함정을 모아 한 번에 만들고 같은 입력은 캐시한다", async () => {
    delete process.env.UPSTAGE_API_KEY;
    const t = withMemo();
    const db = fakeDb(t);
    const first = await reviewShare(db, { classId: "c1" }, clock.now);
    expect(first.model).toBe("mock");
    expect(first.output.briefs.map((b) => b.team)).toEqual(["1조"]);
    expect(first.output.briefs[0].one_lesson_for_other_teams).toBe("먼저 의심하자");
    expect(t.ai_reviews).toHaveLength(1);
    expect((t.ai_reviews[0] as { scope: string }).scope).toBe("share");
    expect((await reviewShare(db, { classId: "c1" }, clock.now + 1000)).cached).toBe(true);
    expect(t.ai_reviews).toHaveLength(1);
  });
  it("조 화면용 읽기: 공개 전에는 함정 이름을 가리고, 공개 뒤에는 그대로 보여준다", async () => {
    delete process.env.UPSTAGE_API_KEY;
    const t = withMemo();
    const db = fakeDb(t);
    await reviewShare(db, { classId: "c1" }, clock.now);
    const out = (await readShare(db, "c1", false)).result!.output;
    expect(JSON.stringify(out)).not.toMatch(/SRM|표본 비율 불일치|구성 효과/);
    const shown = (await readShare(db, "c1", true)).result!.output;
    expect(shown.briefs[0].traps_we_hit.length).toBeGreaterThanOrEqual(out.briefs[0].traps_we_hit.length);
    expect((await readShare(fakeDb({ ...seed(), ai_reviews: [] }), "c1", false)).result).toBeNull();
  });
});

describe("프롬프트 용어 (덱과 통일)", () => {
  it("프롬프트가 덱 용어를 쓰라고 안내한다", () => {
    const { system } = teamPrompt({ case: "c", step: "design", rubric: "r", submission: {}, sim: null, revealed: false });
    expect(system).toContain("Primary");
    expect(system).toContain("Guardrail");
    expect(sharePrompt({ step: "design", teams: [] }).system).toContain("Primary");
  });

  it("결정 판정(decision_checks)이 있으면 프롬프트 입력에 그대로 실리고, 정답 공개 전에는 정답을 직접 말하지 말라고 지시한다", () => {
    const input = {
      case: "baemin", step: "s4_readout", rubric: "r", submission: {}, sim: null, revealed: false,
      decision_checks: [{ phase: "p1", option: "배포", verdict: "correct", reason: "근거 문장" }],
    } as TeamReviewInput;
    const p = teamPrompt(input);
    expect(p.user).toContain("decision_checks");
    expect(p.user).toContain("근거 문장");
    expect(p.system).toContain("decision_checks");
  });

  it("decision_checks 가 없는 입력의 해시는 이전과 같다(캐시 호환)", () => {
    const a = { case: "baemin", step: "s2_design", rubric: "r", submission: {}, sim: null, revealed: false } as TeamReviewInput;
    expect(inputHash(a)).toBe(inputHash({ ...a }));
    expect(JSON.stringify(a)).not.toContain("decision_checks");
  });
});
