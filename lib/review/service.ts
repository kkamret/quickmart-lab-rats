import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getPlugin } from "../cases/registry";
import { simPhaseOf } from "../lab/phase";
import type { Readout } from "../sim/core/readout";
import { judgeDecisions, latestRunPerPhase, type RunRow as RevealRun } from "../reveal";
import { generateJson } from "./generate";
import { getLLM } from "./llm";
import {
  classPrompt, inputHash, mockClassReview, mockShareReview, mockTeamReview, scrubShareReview, scrubTeamReview, sharePrompt, summarizeSim, teamPrompt,
  type ClassReviewInput, type ShareReviewInput, type SimSummary, type TeamReviewInput,
} from "./prompts";
import { classReviewSchema, shareReviewSchema, teamReviewSchema, type ClassReview, type ReviewResult, type ShareReview, type TeamReview } from "./types";

export const COOLDOWN_MS = 30_000;

export class ReviewError extends Error {
  constructor(message: string, readonly status: number) { super(message); }
}

type SubRow = { team_id: string; phase: string; kind: string; version: number; payload: Record<string, unknown> };
type RunRow = { team_id: string; phase: string; design: Record<string, unknown>; result: Readout; created_at: string };

/** step 에 속한 Phase 의 시뮬레이션·설계 키 (예: s5_deep → p2, p3) */
function simPhasesOfStep(plugin: { phases: { key: string; step: string }[] }, step: string): string[] {
  return [...new Set(plugin.phases.filter((p) => p.step === step).map((p) => simPhaseOf(p.key)))];
}

function latestSubmissions(rows: SubRow[], teamId: string, phases: string[]): Record<string, unknown> {
  const best = new Map<string, SubRow>();
  for (const r of rows) {
    if (r.team_id !== teamId || !phases.includes(r.phase)) continue;
    const k = `${r.phase}.${r.kind}`;
    if (!best.has(k) || r.version > best.get(k)!.version) best.set(k, r);
  }
  return Object.fromEntries([...best.entries()].sort().map(([k, r]) => [k, r.payload]));
}

function latestSim(runs: RunRow[], teamId: string, phases: string[]): SimSummary | null {
  const mine = runs
    .filter((r) => r.team_id === teamId && phases.includes(r.phase) && !(r.design as { aa?: boolean }).aa)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  return mine[0] ? summarizeSim(mine[0].result) : null;
}

type Where = { classId: string; teamId: string | null; step: string; scope: string };

async function findCached<T>(db: SupabaseClient, where: Where, hash: string) {
  let q = db.from("ai_reviews").select("output, model, input_hash, created_at").eq("class_id", where.classId).eq("step", where.step).eq("scope", where.scope);
  q = where.teamId ? q.eq("team_id", where.teamId) : q.is("team_id", null);
  const { data } = await q.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return { hit: null as ReviewResult<T> | null, lastAt: null as number | null };
  const hit = data.input_hash === hash ? { output: data.output as T, model: data.model as string, cached: true, createdAt: data.created_at as string } : null;
  return { hit, lastAt: new Date(data.created_at).getTime() };
}

function checkCooldown(lastAt: number | null, now: number) {
  if (lastAt !== null && now - lastAt < COOLDOWN_MS) {
    throw new ReviewError(`${Math.ceil((COOLDOWN_MS - (now - lastAt)) / 1000)}초 뒤에 다시 요청할 수 있어요.`, 429);
  }
}

async function save(db: SupabaseClient, where: Where, model: string, hash: string, output: unknown) {
  const { data, error } = await db.from("ai_reviews")
    .insert({ class_id: where.classId, team_id: where.teamId, step: where.step, scope: where.scope, model, input_hash: hash, output })
    .select("created_at").single();
  if (error) {
    console.error("[review] 저장 실패", error);
    throw new ReviewError("리뷰를 저장하지 못했어요.", 500);
  }
  return data.created_at as string;
}

export async function reviewTeam(db: SupabaseClient, args: { classId: string; teamId: string; step: string }, now = Date.now()): Promise<ReviewResult<TeamReview>> {
  const { data: team } = await db.from("teams").select("id, case_key").eq("id", args.teamId).eq("class_id", args.classId).maybeSingle();
  if (!team) throw new ReviewError("이 수업에 속한 조가 아니에요.", 404);
  const plugin = getPlugin(team.case_key);
  if (!plugin) throw new ReviewError("먼저 사례를 골라주세요.", 409);
  const phases = simPhasesOfStep(plugin, args.step);
  if (phases.length === 0) throw new ReviewError("이 스텝에는 AI 피드백이 없어요.", 400);

  const [subs, runs, cls] = await Promise.all([
    db.from("submissions").select("team_id, phase, kind, version, payload").eq("team_id", args.teamId),
    db.from("sim_runs").select("team_id, phase, design, result, created_at").eq("team_id", args.teamId),
    db.from("classes").select("reveal_answers").eq("id", args.classId).maybeSingle(),
  ]);
  const revealed = cls.data?.reveal_answers === true;
  const submission = latestSubmissions((subs.data ?? []) as SubRow[], args.teamId, phases);
  if (Object.keys(submission).length === 0) throw new ReviewError("먼저 이 스텝에서 무언가를 제출해 주세요.", 409);

  const picks = Object.fromEntries(phases.flatMap((p) => {
    const option = (submission[`${p}.decision`] as { option?: unknown } | undefined)?.option;
    return typeof option === "string" ? [[p, option] as const] : [];
  }));
  const decision_checks = judgeDecisions(plugin, (runs.data ?? []) as RevealRun[], args.teamId, picks)
    .map(({ phase, option, verdict, reason }) => ({ phase, option, verdict, reason }));
  const input: TeamReviewInput = {
    case: plugin.key, step: args.step,
    rubric: phases.map((p) => plugin.rubric[p]).filter(Boolean).join("\n"),
    submission, sim: latestSim((runs.data ?? []) as RunRow[], args.teamId, phases), revealed,
    ...(decision_checks.length ? { decision_checks } : {}),
    // 정답 공개 뒤에는 원문 비교 해설을 함께 보낸다(캐시 키에도 들어가므로 공개 전후 결과가 섞이지 않는다)
    ...(revealed ? { original: phases.map((p) => plugin.reveal[p]).filter(Boolean).join("\n") } : {}),
  };
  const hash = inputHash(input);
  const where: Where = { classId: args.classId, teamId: args.teamId, step: args.step, scope: "team" };
  const { hit, lastAt } = await findCached<TeamReview>(db, where, hash);
  if (hit) return hit;
  checkCooldown(lastAt, now);

  const llm = getLLM(() => mockTeamReview(input));
  const raw = await generateJson(llm, teamReviewSchema, teamPrompt(input));
  const output = revealed ? raw : scrubTeamReview(raw);
  const createdAt = await save(db, where, llm.model, hash, output);
  return { output, model: llm.model, cached: false, createdAt };
}

export async function reviewClass(db: SupabaseClient, args: { classId: string; step: string }, now = Date.now()): Promise<ReviewResult<ClassReview>> {
  const { data: teams } = await db.from("teams").select("id, name, case_key").eq("class_id", args.classId);
  const [subs, runs] = await Promise.all([
    db.from("submissions").select("team_id, phase, kind, version, payload").eq("class_id", args.classId),
    db.from("sim_runs").select("team_id, phase, design, result, created_at").eq("class_id", args.classId),
  ]);
  const rubrics: Record<string, string> = {};
  const input: ClassReviewInput = { step: args.step, teams: [], rubrics };
  for (const t of [...(teams ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ko"))) {
    const plugin = getPlugin(t.case_key);
    if (!plugin) continue;
    const phases = simPhasesOfStep(plugin, args.step);
    if (phases.length === 0) continue;
    const submission = latestSubmissions((subs.data ?? []) as SubRow[], t.id, phases);
    if (Object.keys(submission).length === 0) continue;
    rubrics[plugin.key] = phases.map((p) => plugin.rubric[p]).filter(Boolean).join("\n");
    input.teams.push({ team: t.name, case: plugin.key, submission, sim: latestSim((runs.data ?? []) as RunRow[], t.id, phases) });
  }
  if (input.teams.length === 0) throw new ReviewError("이 스텝에 제출한 조가 아직 없어요.", 409);

  const hash = inputHash(input);
  const where: Where = { classId: args.classId, teamId: null, step: args.step, scope: "class" };
  const { hit, lastAt } = await findCached<ClassReview>(db, where, hash);
  if (hit) return hit;
  checkCooldown(lastAt, now);

  const llm = getLLM(() => mockClassReview(input));
  const output = await generateJson(llm, classReviewSchema, classPrompt(input));
  const createdAt = await save(db, where, llm.model, hash, output);
  return { output, model: llm.model, cached: false, createdAt };
}

const STEP_SHARE = "s8_share";

type AllSubRow = SubRow & { step: string };

/** 조의 결정 제출을 "Phase 제목: 선택 — 근거" 한 줄씩으로 요약 */
function decisionLines(plugin: NonNullable<ReturnType<typeof getPlugin>>, subs: AllSubRow[], teamId: string): string[] {
  const best = new Map<string, AllSubRow>();
  for (const r of subs) {
    if (r.team_id !== teamId || r.kind !== "decision") continue;
    if (!best.has(r.phase) || r.version > best.get(r.phase)!.version) best.set(r.phase, r);
  }
  return [...best.values()].sort((a, b) => a.phase.localeCompare(b.phase)).map((r) => {
    const title = plugin.phases.find((p) => simPhaseOf(p.key) === r.phase && p.kind === "decide")?.title ?? r.phase;
    const opt = plugin.decisions[r.phase]?.options.find((o) => o.id === r.payload.option)?.label ?? String(r.payload.option ?? "");
    return `${title}: ${opt} — ${String(r.payload.rationale ?? "")}`;
  });
}

/** 직소 브리핑(강사): 조마다 결정 요약 + 결정 메모 + 시뮬레이션 함정을 모아 한 번의 호출로 브리핑 초안을 만든다. */
export async function reviewShare(db: SupabaseClient, args: { classId: string }, now = Date.now()): Promise<ReviewResult<ShareReview>> {
  const { data: teams } = await db.from("teams").select("id, name, case_key").eq("class_id", args.classId);
  const [subs, runs] = await Promise.all([
    db.from("submissions").select("team_id, step, phase, kind, version, payload").eq("class_id", args.classId),
    db.from("sim_runs").select("team_id, phase, design, result, created_at").eq("class_id", args.classId),
  ]);
  const input: ShareReviewInput = { step: STEP_SHARE, teams: [] };
  for (const t of [...(teams ?? [])].sort((a, b) => a.name.localeCompare(b.name, "ko"))) {
    const plugin = getPlugin(t.case_key);
    if (!plugin) continue;
    const memoRow = ((subs.data ?? []) as AllSubRow[])
      .filter((r) => r.team_id === t.id && r.step === STEP_SHARE && r.phase === "memo" && r.kind === "note")
      .sort((a, b) => b.version - a.version)[0];
    const decisions = decisionLines(plugin, (subs.data ?? []) as AllSubRow[], t.id);
    if (!memoRow && decisions.length === 0) continue;
    const flags = [...new Set([...latestRunPerPhase((runs.data ?? []) as RevealRun[], t.id).values()].flatMap((r) => r.result.flags ?? []))];
    input.teams.push({
      team: t.name, case: plugin.key, flags,
      memo: memoRow ? { learned: String(memoRow.payload.learned ?? ""), lesson: String(memoRow.payload.lesson ?? "") } : null,
      decisions,
    });
  }
  if (input.teams.length === 0) throw new ReviewError("브리핑을 만들 제출이 아직 없어요.", 409);

  const hash = inputHash(input);
  const where: Where = { classId: args.classId, teamId: null, step: STEP_SHARE, scope: "share" };
  const { hit, lastAt } = await findCached<ShareReview>(db, where, hash);
  if (hit) return hit;
  checkCooldown(lastAt, now);

  const llm = getLLM(() => mockShareReview(input));
  const output = await generateJson(llm, shareReviewSchema, sharePrompt(input));
  const createdAt = await save(db, where, llm.model, hash, output);
  return { output, model: llm.model, cached: false, createdAt };
}

/** 조 화면용: 가장 최근에 만들어진 브리핑(없으면 null). 정답 공개 전에는 함정 이름이 든 문장을 뺀다. */
export async function readShare(db: SupabaseClient, classId: string, revealed: boolean): Promise<{ result: ReviewResult<ShareReview> | null; revealed: boolean }> {
  const { data } = await db.from("ai_reviews").select("output, model, created_at").eq("class_id", classId).eq("step", STEP_SHARE).eq("scope", "share")
    .order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return { result: null, revealed };
  const parsed = shareReviewSchema.safeParse(data.output);
  if (!parsed.success) return { result: null, revealed };
  const output = revealed ? parsed.data : scrubShareReview(parsed.data);
  return { result: { output, model: data.model as string, cached: true, createdAt: data.created_at as string }, revealed };
}
