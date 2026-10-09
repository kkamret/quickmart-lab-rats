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

/** 지표 라벨 끝의 단위 표기("평균주문금액(원)", "로딩 시간(ms)")에서 단위를 뽑는다. 없으면 빈 문자열. */
export function unitOfLabel(label: string): string {
  const m = /\((원|ms)\)/.exec(label);
  return m ? m[1] : "";
}

/** 평균 지표 값 뒤에 붙는 단위: "원"은 붙여 쓰고, "ms"는 띄어 쓴다 */
const withUnit = (text: string, unit: string) => (unit ? (unit === "ms" ? `${text} ms` : `${text}${unit}`) : text);

export function fmtValue(m: Pick<MetricResult, "key" | "type">, s: Stat | undefined, unit = ""): string {
  if (!s || s.n === 0) return "–";
  if (m.type === "prop") return fmtPct((s.x ?? 0) / s.n, digitsFor(m.key));
  if (m.type === "ratio") return fmtPct(s.mean ?? 0, 2);
  return withUnit(fmtNum(s.mean ?? 0), unit);
}

export function statValue(m: Pick<MetricResult, "type">, s: Stat | undefined): number {
  if (!s || s.n === 0) return NaN;
  return m.type === "prop" ? (s.x ?? 0) / s.n : (s.mean ?? 0);
}

/** 차이: 비율 지표는 %p, 그 외는 원/ms 같은 원래 단위 */
export function fmtDiff(m: Pick<MetricResult, "key" | "type">, d: number, unit = ""): string {
  const sign = d > 0 ? "+" : d < 0 ? "−" : "";
  const a = Math.abs(d);
  if (m.type === "prop" || m.type === "ratio") return `${sign}${(a * 100).toFixed(digitsFor(m.key))}%p`;
  return withUnit(`${sign}${a < 10 ? a.toFixed(2) : fmtInt(a)}`, unit);
}

/** 신뢰구간 숫자: "[−0.12%p, +1.30%p]" */
export function fmtCI(m: Pick<MetricResult, "key" | "type">, ci: [number, number], unit = ""): string {
  return `[${fmtDiff(m, ci[0], unit)}, ${fmtDiff(m, ci[1], unit)}]`;
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

/** "p = 0.123" / "p < 0.001" */
export function fmtPText(p: number): string {
  return p < 0.001 ? "p < 0.001" : `p = ${p.toFixed(3)}`;
}

export const ROLE_LABEL = { P: "Primary", G: "Guardrail", S: "Secondary·Driver" } as const;
export const ARM_LABEL: Record<string, string> = { A: "A (대조군)", B: "B", C: "C", D: "D" };
/** 사례가 그룹 이름을 따로 쓰면(예: V1·V2) 이 표로 덮어쓴다 */
export type ArmLabels = Partial<Record<string, string>>;
