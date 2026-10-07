import type { Arm, MetricResult } from "@/lib/sim/core/readout";
import { Badge } from "../ui";
import { CIBar } from "./CIBar";
import { ARM_LABEL, ROLE_LABEL, type ArmLabels, fmtDiff, fmtP, fmtRel, fmtValue } from "./format";

const ROLE_ORDER = { P: 0, G: 1, S: 2 } as const;

/** 지표 표: Primary → Guardrail → Secondary·Driver 순. 처치군마다 대조군(A) 대비 차이·신뢰구간·p 값을 보여준다. */
export function MetricTable({ metrics, armLabels = {} }: { metrics: MetricResult[]; armLabels?: ArmLabels }) {
  const label = (a: string) => armLabels[a] ?? ARM_LABEL[a];
  const sorted = [...metrics].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const arms = (["A", "B", "C", "D"] as Arm[]).filter((a) => metrics.some((m) => m.arms[a]));
  const treat = arms.filter((a) => a !== "A");
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-xs text-ink3">
            <th className="py-2 pr-3 font-medium">지표</th>
            {arms.map((a) => <th key={a} className="px-2 py-2 text-right font-medium">{label(a)}</th>)}
            {treat.map((a) => <th key={a} className="px-2 py-2 font-medium">{armLabels[a]?.split(" ")[0] ?? a} − A 차이 (95% 신뢰구간)</th>)}
          </tr>
        </thead>
        <tbody>
          {sorted.map((m) => {
            const scale = Math.max(1e-9, ...m.comparisons.map((c) => Math.max(Math.abs(c.ci[0]), Math.abs(c.ci[1]))));
            return (
              <tr key={m.key} className="border-b border-line last:border-0 align-top">
                <td className="py-2.5 pr-3">
                  <div className="font-medium">{m.label}</div>
                  <span className={`mt-0.5 inline-block rounded px-1.5 py-px text-[11px] font-semibold ${m.role === "P" ? "bg-brand text-white" : m.role === "G" ? "bg-warn-soft text-warn" : "border border-line bg-sunk text-ink2"}`}>
                    {ROLE_LABEL[m.role]}
                  </span>
                </td>
                {arms.map((a) => <td key={a} className="px-2 py-2.5 text-right tabular-nums">{fmtValue(m, m.arms[a])}</td>)}
                {treat.map((a) => {
                  const c = m.comparisons.find((x) => x.arm === a);
                  if (!c) return <td key={a} className="px-2 py-2.5 text-ink3">비교할 수 없어요</td>;
                  return (
                    <td key={a} className="px-2 py-2.5">
                      <div className="flex items-center gap-2">
                        <CIBar d={c.d} ci={c.ci} scale={scale} />
                        <div className="text-xs leading-tight">
                          <b className="text-sm tabular-nums">{fmtDiff(m, c.d)}</b> <span className="text-ink3">({fmtRel(c.rel)})</span>
                          <div className="mt-0.5 flex items-center gap-1.5 text-ink3">
                            p {fmtP(c.p)}
                            <Badge tone={c.significant ? "run" : "draft"}>{c.significant ? "유의" : "유의하지 않음"}</Badge>
                          </div>
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
