import type { ReactNode } from "react";
import { fmtDiff, fmtInt, fmtPText, fmtValue } from "@/components/readout/format";
import { Badge } from "@/components/ui";
import { METRIC_LABELS } from "@/lib/cases/baemin/formMeta";

type Stat = { n: number; x?: number; mean?: number; sd?: number };
/** 두 그룹 비교 한 칸. arms 에 있는 그룹(A, B, C…)은 모두 보여주고, 차이·p 는 B − A 만 있다. */
type Cmp = { arm?: string; arms: Partial<Record<string, Stat>>; d?: number; ci?: [number, number]; rel?: number; p?: number; significant?: boolean };
type M = { key: string; type: "prop" | "mean"; unit: string };

const TYPE_LABEL: Record<string, string> = { general: "일반", first_order: "첫 주문 혜택", member: "멤버십" };
const OS_LABEL: Record<string, string> = { android: "안드로이드", ios_new: "iOS 신버전", ios_old: "iOS 구버전" };

const labelOf = (key: string) => METRIC_LABELS[key] ?? key;
const MEAN_UNIT: Record<string, string> = { aov: "원", gmv: "원", load_time: "ms" };
const metricOf = (key: string): M => ({ key, type: key in MEAN_UNIT ? "mean" : "prop", unit: MEAN_UNIT[key] ?? "" });

function Section({ title, hint, open, children }: { title: string; hint?: string; open?: boolean; children: ReactNode }) {
  return (
    <details open={open} className="rounded-2xl border border-line bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold">{title}</summary>
      {hint && <p className="mt-1 text-xs text-ink3">{hint}</p>}
      <div className="mt-3 overflow-x-auto">{children}</div>
    </details>
  );
}

/** 처치군 키: cmp.arm 이 있으면 그것, 없으면 A 가 아닌 첫 그룹 */
const armOf = (c: Cmp) => c.arm ?? (["B", "C", "D"] as const).find((a) => c.arms[a]) ?? "B";
/** 비교 목록에서 "A → B → C" 같은 표기 */
const arrow = (cs?: Cmp[]) => (cs?.length ? ["A", ...cs.map(armOf)].join(" → ") : "A → B");

/** 한 칸: 처치군이 여럿이면 A 값 → B 값 → C 값을 한 줄에, 차이·p 는 처치군마다 한 줄씩 */
function CmpCell({ m, cs }: { m: M; cs: Cmp[] }) {
  if (cs.length === 0) return <td className="px-2 py-2 text-right text-ink3">–</td>;
  const multi = cs.length > 1;
  return (
    <td className="whitespace-nowrap px-2 py-2 text-right tabular-nums">
      <div className="text-xs text-ink3">{[fmtValue(m, cs[0].arms.A, m.unit), ...cs.map((c) => fmtValue(m, c.arms[armOf(c)], m.unit))].join(" → ")}</div>
      {cs.map((c) => c.d !== undefined && (
        <div key={armOf(c)}>
          {multi && <span className="mr-1 text-xs text-ink3">{armOf(c)}−A</span>}
          <b>{fmtDiff(m, c.d, m.unit)}</b> <span className="text-xs text-ink3">{fmtPText(c.p ?? 1)}</span>{" "}
          {c.significant && <Badge tone="run">유의</Badge>}
        </div>
      ))}
    </td>
  );
}

const th = "px-2 py-2 text-right text-xs font-medium text-ink3";
const thLeft = "px-2 py-2 text-left text-xs font-medium text-ink3";

/** 배민 사례 전용 패널: 주차별, 고객 유형별, OS별 사용자 수, 트리거 비교 (phase 별로 있는 것만 렌더링) */
export function BaeminPanels({ phase, panels, primary }: { phase: string; panels: Record<string, unknown>; primary?: string }) {
  type WeekRow = { week: number; bShare: number; shares?: Record<string, number>; byArm?: Record<string, Record<string, Cmp>>; [k: string]: unknown };
  const weekly = panels.weekly as WeekRow[] | undefined;
  const segments = panels.segments as Record<string, Record<string, Cmp>> | undefined;
  const segmentsByArm = panels.segmentsByArm as Record<string, Record<string, Record<string, Cmp>>> | undefined;
  const byOs = panels.byOs as Record<string, Record<string, { users: number; crash: number }>> | undefined;
  const trigger = panels.trigger as { biased?: { conv: Cmp; aov: Cmp }; counterfactual?: { conv: Cmp; aov: Cmp; n: { A: number; B: number } } } | undefined;
  const sim = phase.slice(0, 2);

  // 주차별 표는 학생이 고른 Primary 를 따라간다(그 지표가 패널에 없으면 주문전환율)
  const weeklyKey = primary && weekly?.[0]?.[primary] ? primary : "conv";
  /** 주차 한 줄의 처치군별 비교(byArm 이 없으면 최상위 값 하나) */
  const weekCmps = (w: WeekRow): Cmp[] => (w.byArm ? Object.values(w.byArm).map((r) => r[weeklyKey]).filter(Boolean) : w[weeklyKey] ? [w[weeklyKey] as Cmp] : []);
  const weeklyArrow = arrow(weekly?.[0] ? weekCmps(weekly[0]) : undefined);

  // 해당 OS 사용자가 하나도 없으면(예: 안드로이드만 실험) 그 행은 숨긴다
  const osRows = byOs ? Object.entries(byOs).filter(([, arms]) => Object.values(arms).some((g) => g.users > 0)) : [];
  const segKeys = segments ? Object.keys(Object.values(segments)[0] ?? {}) : [];
  /** 고객 유형·지표 한 칸의 처치군별 비교 */
  const segCmps = (type: string, k: string): Cmp[] =>
    segmentsByArm ? Object.values(segmentsByArm).map((s) => s[type]?.[k]).filter(Boolean) : segments?.[type]?.[k] ? [segments[type][k]] : [];
  const firstType = segments ? Object.keys(segments)[0] : undefined;
  const segArrow = arrow(firstType ? segCmps(firstType, segKeys[0]) : undefined);

  return (
    <div className="space-y-3">
      {trigger && (
        <Section open title="트리거 사용자 비교" hint="문구 노출 조건(고허들 쿠폰 보유 + 최소금액 달성)과 관련된 두 가지 비교예요. 각 줄이 누구와 누구를 비교하는지 읽어 보세요.">
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr><th className={thLeft}>비교 (왼쪽 → 오른쪽)</th><th className={th}>주문전환율</th><th className={th}>평균주문금액</th></tr></thead>
            <tbody>
              {trigger.counterfactual && (
                <tr className="border-t border-line">
                  <td className="px-2 py-2">A에서 같은 조건을 채웠을 사용자 → B에서 문구를 본 사용자 <span className="text-xs text-ink3">({fmtInt(trigger.counterfactual.n.A)}명 · {fmtInt(trigger.counterfactual.n.B)}명)</span></td>
                  <CmpCell m={metricOf("conv")} cs={[trigger.counterfactual.conv]} />
                  <CmpCell m={metricOf("aov")} cs={[trigger.counterfactual.aov]} />
                </tr>
              )}
              {trigger.biased && (
                <tr className="border-t border-line">
                  <td className="px-2 py-2">B에서 문구를 못 본 사용자 → B에서 문구를 본 사용자</td>
                  <CmpCell m={metricOf("conv")} cs={[trigger.biased.conv]} />
                  <CmpCell m={metricOf("aov")} cs={[trigger.biased.aov]} />
                </tr>
              )}
            </tbody>
          </table>
        </Section>
      )}

      {segments && (
        <Section open={sim === "p2"} title="고객 유형별 결과" hint={`같은 지표를 고객 유형으로 나눠서 본 표예요. (${segArrow})`}>
          <table className="w-full min-w-[640px] text-sm">
            <thead><tr><th className={thLeft}>고객 유형</th>{segKeys.map((k) => <th key={k} className={th}>{labelOf(k)}</th>)}</tr></thead>
            <tbody>
              {Object.entries(segments).map(([type, ms]) => (
                <tr key={type} className="border-t border-line">
                  <td className="px-2 py-2 font-medium">{TYPE_LABEL[type] ?? type}</td>
                  {segKeys.map((k) => <CmpCell key={k} m={metricOf(k)} cs={segCmps(type, k)} />)}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {byOs && osRows.length > 0 && (
        <Section open={sim === "p2"} title="OS별 사용자 수와 크래시" hint="그룹별로 집계된 사용자 수와 크래시 수예요.">
          <table className="w-full min-w-[480px] text-sm">
            <thead>
              <tr>
                <th className={thLeft}>OS</th>
                {Object.keys(osRows[0][1]).map((a) => <th key={a} className={th}>{a} 사용자 수</th>)}
                {Object.keys(osRows[0][1]).map((a) => <th key={`c${a}`} className={th}>{a} 크래시 수</th>)}
              </tr>
            </thead>
            <tbody>
              {osRows.map(([os, arms]) => (
                <tr key={os} className="border-t border-line">
                  <td className="px-2 py-2 font-medium">{OS_LABEL[os] ?? os}</td>
                  {Object.values(arms).map((g, i) => <td key={i} className="px-2 py-2 text-right tabular-nums">{fmtInt(g.users)}명</td>)}
                  {Object.values(arms).map((g, i) => <td key={`c${i}`} className="px-2 py-2 text-right tabular-nums">{fmtInt(g.crash)}건</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {weekly && weekly.length > 1 && (
        <Section title="주차별 결과" hint={`실험 기간을 1주 단위로 나눠서 본 ${labelOf(weeklyKey)}이에요. (${weeklyArrow})`}>
          <table className="w-full min-w-[480px] text-sm">
            <thead><tr><th className={thLeft}>주차</th><th className={th}>{weekly[0].shares && Object.keys(weekly[0].shares).length > 1 ? "처치군 배정 비중" : `${Object.keys(weekly[0].shares ?? { B: 1 })[0]} 배정 비중`}</th><th className={th}>{labelOf(weeklyKey)}</th></tr></thead>
            <tbody>
              {weekly.map((w) => (
                <tr key={w.week} className="border-t border-line">
                  <td className="px-2 py-2 font-medium">{w.week}주차</td>
                  <td className="px-2 py-2 text-right tabular-nums">{w.shares ? Object.entries(w.shares).map(([a, v]) => `${a} ${(v * 100).toFixed(0)}%`).join(" · ") : `${(w.bShare * 100).toFixed(0)}%`}</td>
                  <CmpCell m={metricOf(weeklyKey)} cs={weekCmps(w)} />
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}
    </div>
  );
}
