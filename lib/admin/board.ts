/** DB 행 → 강사 보드 데이터 (순수 함수). sim_runs.result 는 flags 를 포함한 원본 Readout 이다. */
import type { Flag } from "../sim/core/flags";
import { isNewer } from "../sim/time";
import type { Readout } from "../sim/core/readout";
import type { BoardComparison, BoardData, BoardRow, BoardTeam, FlagBoardRow } from "./types";

export type TeamRow = { id: string; name: string; case_key: string | null };
export type SubmissionRow = { team_id: string; step: string; phase: string; kind: string; version: number; payload: Record<string, unknown>; created_at: string };
export type SimRunRow = { team_id: string; case_key: string; phase: string; design: Record<string, unknown>; design_hash: string; result: Readout; created_at: string };

function latestSubmissions(rows: SubmissionRow[]): BoardTeam["submissions"] {
  const best = new Map<string, SubmissionRow>();
  for (const r of rows) {
    const k = `${r.step}|${r.phase}|${r.kind}`;
    const cur = best.get(k);
    if (!cur || r.version > cur.version) best.set(k, r);
  }
  return [...best.values()]
    .sort((a, b) => a.step.localeCompare(b.step) || a.phase.localeCompare(b.phase))
    .map((r) => ({ step: r.step, phase: r.phase, kind: r.kind, version: r.version, payload: r.payload, at: r.created_at }));
}

/** A/A 로 돌린 기록(design.aa)은 비교에서 뺀다. 조마다 Phase 별로 가장 최근 본 실험 1건. */
function latestMainRuns(runs: SimRunRow[]): SimRunRow[] {
  const best = new Map<string, SimRunRow>();
  for (const r of runs) {
    if ((r.design as { aa?: boolean }).aa) continue;
    const k = `${r.team_id}|${r.phase}`;
    const cur = best.get(k);
    if (!cur || isNewer(r.created_at, cur.created_at)) best.set(k, r);
  }
  return [...best.values()];
}

function toRow(run: SimRunRow, teamName: string): BoardRow {
  const r = run.result;
  const primary = r.metrics.find((m) => m.role === "P");
  return {
    teamId: run.team_id,
    teamName,
    phase: run.phase,
    design: run.design,
    designHash: run.design_hash,
    primaryLabel: primary?.label ?? null,
    primaryKey: primary?.key ?? null,
    primaryType: primary?.type ?? null,
    primary: (primary?.comparisons ?? []).map((c) => ({ arm: c.arm, d: c.d, ci: c.ci, rel: c.rel, p: c.p, significant: c.significant })),
    achievedPower: r.achievedPower ?? null,
    srmP: r.srm?.p ?? null,
    stoppedAt: r.stoppedAt ?? null,
    flags: r.flags ?? [],
    at: run.created_at,
  };
}

export function buildBoard(teams: TeamRow[], submissions: SubmissionRow[], simRuns: SimRunRow[], now = new Date()): BoardData {
  const nameOf = new Map(teams.map((t) => [t.id, t.name]));
  const caseOf = new Map(teams.map((t) => [t.id, t.case_key]));

  const boardTeams: BoardTeam[] = teams.map((t) => ({
    id: t.id,
    name: t.name,
    caseKey: t.case_key,
    submissions: latestSubmissions(submissions.filter((s) => s.team_id === t.id)),
  }));

  const grouped = new Map<string, BoardComparison>();
  for (const run of latestMainRuns(simRuns)) {
    const k = `${run.case_key}|${run.phase}`;
    const g = grouped.get(k) ?? { caseKey: run.case_key, phase: run.phase, rows: [] };
    g.rows.push(toRow(run, nameOf.get(run.team_id) ?? "(알 수 없는 조)"));
    grouped.set(k, g);
  }
  const comparisons = [...grouped.values()]
    .map((g) => ({ ...g, rows: g.rows.sort((a, b) => a.teamName.localeCompare(b.teamName, "ko")) }))
    .sort((a, b) => a.caseKey.localeCompare(b.caseKey) || a.phase.localeCompare(b.phase));

  const byFlag = new Map<Flag, FlagBoardRow["teams"]>();
  for (const c of comparisons) {
    for (const row of c.rows) {
      for (const f of row.flags) {
        const list = byFlag.get(f) ?? [];
        if (!list.some((t) => t.id === row.teamId)) list.push({ id: row.teamId, name: row.teamName, caseKey: caseOf.get(row.teamId) ?? c.caseKey });
        byFlag.set(f, list);
      }
    }
  }
  const flagBoard = [...byFlag.entries()].map(([flag, ts]) => ({ flag, teams: ts })).sort((a, b) => b.teams.length - a.teams.length);

  return { teams: boardTeams, comparisons, flagBoard, generatedAt: now.toISOString() };
}
