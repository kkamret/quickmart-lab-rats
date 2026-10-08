/** 정답 공개 이후 조에게 내려가는 정보를 만든다 (순수 함수). 공개 전에는 이 함수의 결과를 API 가 내려보내지 않는다(규칙 3). */
import type { CasePlugin, Verdict } from "./cases/types";
import { simPhaseOf } from "./lab/phase";
import { FLAG_LABELS, type Flag } from "./sim/core/flags";
import type { Readout } from "./sim/core/readout";

export type RunRow = { team_id: string; phase: string; design: Record<string, unknown>; result: Readout; created_at: string };

/** 조의 시뮬레이션 Phase 별 최신 본 실험(A/A 제외) 결과 */
export function latestRunPerPhase(runs: RunRow[], teamId: string): Map<string, RunRow> {
  const best = new Map<string, RunRow>();
  for (const r of runs) {
    if (r.team_id !== teamId || (r.design as { aa?: boolean }).aa) continue;
    const cur = best.get(r.phase);
    if (!cur || r.created_at > cur.created_at) best.set(r.phase, r);
  }
  return best;
}

/** 결정 제출(kind=decision)에서 Phase 별 최신 버전의 선택지 id */
export function latestDecisionPicks(rows: { phase: string; version: number; payload: Record<string, unknown> }[]): Record<string, string> {
  const best = new Map<string, { version: number; option: string }>();
  for (const r of rows) {
    const option = r.payload?.option;
    if (typeof option !== "string") continue;
    const cur = best.get(r.phase);
    if (!cur || r.version > cur.version) best.set(r.phase, { version: r.version, option });
  }
  return Object.fromEntries([...best.entries()].map(([phase, v]) => [phase, v.option]));
}

export type RevealItem = { step: string; phase: string; title: string; text: string };
export type RevealFlag = { code: Flag; label: string; why?: string };
export type RevealFlags = { step: string; phase: string; title: string; flags: RevealFlag[]; notes: string[]; achievedPower: number | null };
export type RevealDecision = { step: string; phase: string; title: string; option: string; verdict: Verdict; reason: string };
export type RevealPayload = { items: RevealItem[]; flags: RevealFlags[]; decisions: RevealDecision[] };

type Plugin = Pick<CasePlugin, "phases" | "reveal" | "decisions" | "judge">;

/** 조가 고른 결정 옵션을 그 조의 최신 본 실험 결과로 판정한다. 판정 함수가 없는 사례·실행 결과가 없는 Phase 는 건너뛴다. */
export function judgeDecisions(plugin: Pick<Plugin, "phases" | "decisions" | "judge">, runs: RunRow[], teamId: string, picks: Record<string, string>): RevealDecision[] {
  if (!plugin.judge) return [];
  const latest = latestRunPerPhase(runs, teamId);
  const out: RevealDecision[] = [];
  for (const [phase, option] of Object.entries(picks).sort(([a], [b]) => a.localeCompare(b))) {
    const def = plugin.phases.find((p) => p.kind === "decide" && simPhaseOf(p.key) === phase);
    const run = latest.get(phase);
    if (!def || !run) continue;
    const j = plugin.judge(phase, option, { design: run.design, result: run.result });
    if (!j) continue;
    const label = plugin.decisions[phase]?.options.find((o) => o.id === option)?.label ?? option;
    out.push({ step: def.step, phase, title: def.title, option: label, verdict: j.verdict, reason: j.reason });
  }
  return out;
}

export function buildReveal(plugin: Plugin, runs: RunRow[], teamId: string, picks: Record<string, string> = {}): RevealPayload {
  const defOf = (sim: string) => plugin.phases.find((p) => simPhaseOf(p.key) === sim);
  const items: RevealItem[] = [];
  for (const [phase, text] of Object.entries(plugin.reveal)) {
    const def = defOf(phase);
    if (def && text) items.push({ step: def.step, phase, title: def.title, text });
  }
  const flags: RevealFlags[] = [];
  for (const [phase, run] of latestRunPerPhase(runs, teamId)) {
    const def = defOf(phase);
    if (!def) continue;
    const why = (run.result.panels?._why ?? {}) as Partial<Record<Flag, string>>;
    const notes = run.result.panels?._notes;
    flags.push({
      step: def.step, phase, title: def.title,
      flags: (run.result.flags ?? []).map((code) => ({ code, label: FLAG_LABELS[code], ...(why[code] ? { why: why[code] } : {}) })),
      notes: Array.isArray(notes) ? notes.filter((n): n is string => typeof n === "string") : [],
      achievedPower: run.result.achievedPower ?? null,
    });
  }
  return { items, flags, decisions: judgeDecisions(plugin, runs, teamId, picks) };
}
