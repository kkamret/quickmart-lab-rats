import type { MetricResult } from "@/lib/sim/core/readout";

type Stat = { n: number; x?: number; mean?: number; sd?: number };

export const fmtInt = (n: number) => Math.round(n).toLocaleString("ko-KR");

/** 큰 값은 정수로, 100 미만은 소수 둘째 자리까지 (예: 인당 클릭 수 1.14) */
export const fmtNum = (v: number) => (Math.abs(v) < 100 ? v.toFixed(2) : fmtInt(v));

export function fmtPct(v: number, digits = 2) {
  return `${(v * 100).toFixed(digits)}%`;
}

/** 크래시율처럼 아주 작은 비율은 소수점 자릿수를 늘린다 */
const digitsFor = (key: string) => (key === "crash" ? 3 : 2);

export function fmtValue(m: Pick<MetricResult, "key" | "type">, s: Stat | undefined): string {
  if (!s || s.n === 0) return "–";
  if (m.type === "prop") return fmtPct((s.x ?? 0) / s.n, digitsFor(m.key));
  if (m.type === "ratio") return fmtPct(s.mean ?? 0, 2);
  return fmtNum(s.mean ?? 0);
}

export function statValue(m: Pick<MetricResult, "type">, s: Stat | undefined): number {
  if (!s || s.n === 0) return NaN;
  return m.type === "prop" ? (s.x ?? 0) / s.n : (s.mean ?? 0);
}

/** 차이: 비율 지표는 %p, 그 외는 원/ms 같은 원래 단위 */
export function fmtDiff(m: Pick<MetricResult, "key" | "type">, d: number): string {
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  const a = Math.abs(d);
  if (m.type === "prop" || m.type === "ratio") return `${sign}${(a * 100).toFixed(digitsFor(m.key))}%p`;
  return `${sign}${a < 10 ? a.toFixed(3) : fmtInt(a)}`;
}

export function fmtRel(r: number): string {
  if (!Number.isFinite(r)) return "–";
  const sign = r > 0 ? "+" : r < 0 ? "−" : "";
  return `${sign}${(Math.abs(r) * 100).toFixed(1)}%`;
}

export function fmtP(p: number): string {
  if (p < 0.001) return "<0.001";
  return p.toFixed(3);
}

export const ROLE_LABEL = { P: "Primary", G: "Guardrail", S: "Secondary·Driver" } as const;
export const ARM_LABEL: Record<string, string> = { A: "A (대조군)", B: "B", C: "C", D: "D" };
/** 사례가 그룹 이름을 따로 쓰면(예: V1·V2) 이 표로 덮어쓴다 */
export type ArmLabels = Partial<Record<string, string>>;
