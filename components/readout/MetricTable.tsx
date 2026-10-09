import type { Arm, MetricResult } from "@/lib/sim/core/readout";
import { Badge } from "../ui";
import { CIBar } from "./CIBar";
import { ARM_LABEL, ROLE_LABEL, type ArmLabels, fmtCI, fmtDiff, fmtPText, fmtRel, fmtValue, unitOfLabel } from "./format";

const ROLE_ORDER = { P: 0, G: 1, S: 2 } as const;

/** 유의수준 α 에서 신뢰구간 수준(%)을 구한다. α 를 모르면 undefined. */
const ciLevel = (alpha?: number) => (alpha === undefined ? undefined : Math.round((1 - alpha) * 1000) / 10);

/**
 * 지표 표: Primary → Guardrail → Secondary·Driver 순. 처치군마다 대조군(A) 대비 차이·신뢰구간(숫자와 막대)·p 값을 보여준다.
 * alpha 는 학생이 제출한 설계의 유의수준이다(없으면 신뢰구간 수준을 적지 않는다).
 * metricLabels 로 지표 이름을 화면 전체에서 같은 이름으로 맞출 수 있다.
 */
export function MetricTable({
  metrics, armLabels = {}, alpha, metricLabels = {},
}: { metrics: MetricResult[]; armLabels?: ArmLabels; alpha?: number; metricLabels?: Record<string, string> }) {
  const label = (a: string) => armLabels[a] ?? ARM_LABEL[a];
  const sorted = [...metrics].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
  const arms = (["A", "B", "C", "D"] as Arm[]).filter((a) => metrics.some((m) => m.arms[a]));
  const treat = arms.filter((a) => a !== "A");
  const level = ciLevel(alpha);

  const all = metrics.flatMap((m) => m.comparisons);
  const methods = [...new Set(all.map((c) => c.method))];
  const adjusted = methods.some((m) => /보정|순차/.test(m));
  const bonferroni = methods.some((m) => m.includes("Bonferroni"));
  // 보정·순차 기준 때문에 "p < α" 와 유의 표시가 어긋난 비교 수
  const flipped = alpha === undefined ? 0 : all.filter((c) => (c.p < alpha) !== c.significant).length;

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs text-ink3">
              <th className="py-2 pr-3 font-medium">지표</th>
              {arms.map((a) => <th key={a} className="px-2 py-2 text-right font-medium">{label(a)}</th>)}
              {treat.map((a) => (
                <th key={a} className="px-2 py-2 font-medium">
                  {armLabels[a]?.split(" ")[0] ?? a} − A 차이 ({level !== undefined ? `${level}% ` : ""}신뢰구간)
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((m) => {
              const scale = Math.max(1e-9, ...m.comparisons.map((c) => Math.max(Math.abs(c.ci[0]), Math.abs(c.ci[1]))));
              const unit = unitOfLabel(m.label);
              const name = metricLabels[m.key] ?? m.label;
              return (
                <tr key={m.key} className="border-b border-line last:border-0 align-top">
                  <td className="py-2.5 pr-3">
                    <div className="font-medium">{name}</div>
                    <span className={`mt-0.5 inline-block rounded px-1.5 py-px text-[11px] font-semibold ${m.role === "P" ? "bg-brand text-white" : m.role === "G" ? "bg-warn-soft text-warn" : "border border-line bg-sunk text-ink2"}`}>
                      {ROLE_LABEL[m.role]}
                    </span>
                  </td>
                  {arms.map((a) => <td key={a} className="whitespace-nowrap px-2 py-2.5 text-right tabular-nums">{fmtValue(m, m.arms[a], unit)}</td>)}
                  {treat.map((a) => {
                    const c = m.comparisons.find((x) => x.arm === a);
                    if (!c) return <td key={a} className="px-2 py-2.5 text-ink3">비교할 수 없어요</td>;
                    const ciText = fmtCI(m, c.ci, unit);
                    return (
                      <td key={a} className="px-2 py-2.5">
                        <div className="flex items-center gap-2">
                          <CIBar d={c.d} ci={c.ci} scale={scale} label={`${name} 차이 ${fmtDiff(m, c.d, unit)}, 신뢰구간 ${ciText}`} />
                          <div className="text-xs leading-tight">
                            <b className="text-sm tabular-nums">{fmtDiff(m, c.d, unit)}</b> <span className="text-ink3">({fmtRel(c.rel)})</span>
                            <div className="mt-0.5 tabular-nums text-ink2">{ciText}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-ink3">
                              <span className="tabular-nums">{fmtPText(c.p)}</span>
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
      <div className="mt-3 space-y-1 text-xs text-ink3">
        <p>
          막대는 지표마다 눈금이 달라서 행끼리 길이를 비교할 수 없어요. 정확한 값은 옆의 숫자로 읽어요.
          {methods.length > 0 && <> 검정 방법: {methods.join(" / ")}.</>}
        </p>
        {adjusted && (
          <p className="text-ink2">
            <b>유의 표시는 보정·순차 기준이에요.</b> 신뢰구간과 p 값은 보정하지 않은 값이에요.
            {bonferroni && alpha !== undefined && all.length > 0 && <> Bonferroni 기준은 p &lt; {(alpha / all.length).toPrecision(2)} (α {alpha} ÷ 비교 {all.length}개)예요.</>}
            {flipped > 0 && <> 이 기준 때문에 p &lt; α({alpha})인데도 유의하지 않거나, 반대로 표시된 비교가 {flipped}개 있어요.</>}
          </p>
        )}
      </div>
    </div>
  );
}
