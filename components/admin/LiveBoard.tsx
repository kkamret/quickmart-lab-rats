"use client";
import { useCallback, useEffect, useState } from "react";
import type { BoardComparison, BoardData, BoardRow, BoardTeam } from "@/lib/admin/types";
import { CASE_KEYS, CASES } from "@/lib/cases";
import { FLAG_LABELS } from "@/lib/sim/core/flags";
import { STEP_LABELS, type StepKey } from "@/lib/steps";
import { fmtDiff, fmtP, fmtPct, fmtRel } from "../readout/format";
import { Badge, Card, ErrorText } from "../ui";

const POLL_MS = 5000;
type Tab = "case" | "concept";

/** 강사 전용 라이브 보드: 사례별 탭(조별 제출 + 같은 사례 비교표) / 개념 보드. 5초마다 서버에서 다시 읽는다. */
export function LiveBoard({ code, allowedCases }: { code: string; allowedCases: string[] }) {
  const [data, setData] = useState<BoardData | null>(null);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<Tab>("case");
  const [caseKey, setCaseKey] = useState<string>(allowedCases[0] ?? CASE_KEYS[0]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/board?code=${encodeURIComponent(code)}`, { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) return setError(body.error ?? "불러오지 못했어요.");
      setError("");
      setData(body as BoardData);
    } catch {
      setError("불러오지 못했어요. 네트워크를 확인해 주세요.");
    }
  }, [code]);

  useEffect(() => {
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, POLL_MS);
    return () => clearInterval(id);
  }, [load]);

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">라이브 보드</h2>
        <div className="flex gap-1 text-sm">
          {([["case", "사례별"], ["concept", "개념 보드"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)} className={`rounded-full border px-4 py-1.5 ${tab === k ? "border-brand bg-brand-soft font-semibold" : "border-line text-ink2"}`}>{label}</button>
          ))}
        </div>
        {data && <span className="ml-auto text-xs text-ink3">{new Date(data.generatedAt).toLocaleTimeString("ko-KR")} 기준 · 5초마다 갱신</span>}
      </div>
      <ErrorText>{error}</ErrorText>
      {!data && !error && <p className="text-ink3">불러오는 중…</p>}
      {data && tab === "case" && (
        <>
          <div className="mb-4 flex flex-wrap gap-2">
            {CASE_KEYS.filter((k) => allowedCases.includes(k)).map((k) => {
              const n = data.teams.filter((t) => t.caseKey === k).length;
              return (
                <button key={k} onClick={() => setCaseKey(k)} className={`rounded-lg border px-3 py-1.5 text-sm ${caseKey === k ? "border-brand bg-brand-soft font-semibold" : "border-line text-ink2"}`}>
                  {CASES[k].company} <span className="text-ink3">({n}조)</span>
                </button>
              );
            })}
          </div>
          <CaseTab data={data} caseKey={caseKey} />
        </>
      )}
      {data && tab === "concept" && <ConceptTab data={data} />}
    </Card>
  );
}

function CaseTab({ data, caseKey }: { data: BoardData; caseKey: string }) {
  const teams = data.teams.filter((t) => t.caseKey === caseKey);
  const comps = data.comparisons.filter((c) => c.caseKey === caseKey);
  if (teams.length === 0) return <p className="text-ink3">이 사례를 고른 조가 아직 없어요.</p>;
  return (
    <div className="space-y-6">
      <ul className="grid gap-3 md:grid-cols-2">
        {teams.map((t) => <TeamCard key={t.id} team={t} />)}
      </ul>
      {comps.length === 0 ? (
        <p className="text-ink3">아직 본 실험을 돌린 조가 없어요. 결과가 나오면 비교표가 여기에 생겨요.</p>
      ) : (
        comps.map((c) => <ComparisonTable key={c.phase} comp={c} />)
      )}
    </div>
  );
}

function TeamCard({ team }: { team: BoardTeam }) {
  return (
    <li className="rounded-xl border border-line bg-sunk p-4">
      <div className="mb-2 flex items-center justify-between">
        <b className="text-lg">{team.name}</b>
        <span className="text-xs text-ink3">제출 {team.submissions.length}건</span>
      </div>
      {team.submissions.length === 0 ? (
        <p className="text-sm text-ink3">아직 제출이 없어요.</p>
      ) : (
        <ul className="space-y-1 text-sm">
          {team.submissions.map((s) => (
            <li key={`${s.step}|${s.phase}|${s.kind}`}>
              <details>
                <summary className="cursor-pointer">
                  <span className="font-medium">{STEP_LABELS[s.step as StepKey] ?? s.step}</span>
                  <span className="text-ink3"> · {s.phase} {KIND_LABEL[s.kind] ?? s.kind} v{s.version}</span>
                  {s.kind === "decision" && typeof s.payload.option === "string" && <Badge tone="run">{s.payload.option}</Badge>}
                </summary>
                <Entries value={s.payload} />
              </details>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}

const KIND_LABEL: Record<string, string> = { design: "설계", decision: "결정", diagnosis: "진단", note: "메모" };

function flatten(v: unknown, prefix = ""): [string, string][] {
  if (v && typeof v === "object" && !Array.isArray(v)) {
    return Object.entries(v as Record<string, unknown>).flatMap(([k, x]) => flatten(x, prefix ? `${prefix}.${k}` : k));
  }
  return [[prefix, Array.isArray(v) ? v.join(", ") : String(v)]];
}

function Entries({ value }: { value: Record<string, unknown> }) {
  return (
    <dl className="mt-1 grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 rounded-lg bg-surface p-2 text-xs">
      {flatten(value).map(([k, v]) => (
        <div key={k} className="contents">
          <dt className="text-ink3">{k}</dt>
          <dd className="break-words">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function effectText(row: BoardRow, c: BoardRow["primary"][number]) {
  const m = { key: row.primaryKey ?? "", type: row.primaryType ?? "prop" } as const;
  return `${fmtDiff(m, c.d)} (${fmtRel(c.rel)})`;
}

/** "같은 모집단, 다른 설계, 다른 결과": 같은 사례를 고른 조들의 본 실험 결과를 한 표로 */
function ComparisonTable({ comp }: { comp: BoardComparison }) {
  const keys = [...new Set(comp.rows.flatMap((r) => Object.keys(r.design).filter((k) => typeof r.design[k] !== "object")))].slice(0, 4);
  return (
    <div>
      <h3 className="mb-1 text-lg font-bold">같은 모집단, 다른 설계, 다른 결과 <span className="text-sm font-normal text-ink3">· {comp.phase}</span></h3>
      <p className="mb-2 text-xs text-ink3">달성 검정력과 경고 플래그는 강사 전용이에요. 조 화면에는 보이지 않아요.</p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-base">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink3">
              <th className="py-2 pr-3">조</th>
              {keys.map((k) => <th key={k} className="px-2">{k}</th>)}
              <th className="px-2">Primary 지표 차이 (95% CI)</th>
              <th className="px-2">p</th>
              <th className="px-2">달성 검정력</th>
              <th className="px-2">SRM p</th>
              <th className="px-2">플래그</th>
            </tr>
          </thead>
          <tbody>
            {comp.rows.map((r) => (
              <tr key={r.teamId} className="border-b border-line align-top last:border-0">
                <td className="py-2 pr-3 font-semibold">{r.teamName}</td>
                {keys.map((k) => <td key={k} className="px-2 text-sm">{String(r.design[k] ?? "–")}</td>)}
                <td className="px-2">
                  {r.primary.length === 0 ? "–" : r.primary.map((c) => (
                    <div key={c.arm} className="text-sm">
                      <b className="tabular-nums">{r.primary.length > 1 ? `${c.arm}: ` : ""}{effectText(r, c)}</b>{" "}
                      <span className="text-ink3">[{ciText(r, c)}]</span>{" "}
                      <Badge tone={c.significant ? "run" : "draft"}>{c.significant ? "유의" : "유의하지 않음"}</Badge>
                    </div>
                  ))}
                </td>
                <td className="px-2 tabular-nums">{r.primary[0] ? fmtP(r.primary[0].p) : "–"}</td>
                <td className="px-2 tabular-nums">{r.achievedPower === null ? "–" : fmtPct(r.achievedPower, 0)}</td>
                <td className="px-2 tabular-nums">{r.srmP === null ? "–" : fmtP(r.srmP)}</td>
                <td className="px-2">
                  <div className="flex flex-wrap gap-1">
                    {r.flags.length === 0 ? <span className="text-ink3">없음</span> : r.flags.map((f) => <Badge key={f} tone="warn">{FLAG_LABELS[f]}</Badge>)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ciText(row: BoardRow, c: BoardRow["primary"][number]) {
  const m = { key: row.primaryKey ?? "", type: row.primaryType ?? "prop" } as const;
  return `${fmtDiff(m, c.ci[0])} ~ ${fmtDiff(m, c.ci[1])}`;
}

/** 전체 개념 보드: 어떤 개념(경고 플래그)에 어느 조가 걸렸는지 */
function ConceptTab({ data }: { data: BoardData }) {
  if (data.flagBoard.length === 0) return <p className="text-ink3">아직 걸린 개념이 없어요. 조들이 본 실험을 돌리면 여기에 모여요.</p>;
  return (
    <ul className="divide-y divide-line">
      {data.flagBoard.map((row) => (
        <li key={row.flag} className="flex flex-wrap items-center gap-3 py-3">
          <b className="min-w-56 text-lg">{FLAG_LABELS[row.flag]}</b>
          <span className="font-mono text-xs text-ink3">{row.flag}</span>
          <div className="flex flex-wrap gap-1.5">
            {row.teams.map((t) => <Badge key={t.id} tone="warn">{t.name} · {CASES[t.caseKey as keyof typeof CASES]?.company ?? t.caseKey}</Badge>)}
          </div>
        </li>
      ))}
    </ul>
  );
}
