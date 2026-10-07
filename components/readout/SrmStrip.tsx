import type { Readout } from "@/lib/sim/core/readout";
import { fmtInt, fmtP } from "./format";
import { TheoryBadge } from "../ui";

/**
 * 데이터 품질: 실제 사용자 수와 계획한 배정 비율. 판정은 하지 않고 숫자만 보여준다(스스로 발견하게).
 * p 는 "계획한 비율에서 이만큼 벗어날 확률"이다.
 */
export function SrmStrip({ srm, arms }: { srm: NonNullable<Readout["srm"]>; arms: string[] }) {
  return (
    <div className="rounded-xl border border-line bg-sunk px-4 py-3 text-sm">
      <div className="flex flex-wrap items-center gap-x-6 gap-y-1">
        <b>데이터 품질 · 배정 비율<TheoryBadge k="srm" /></b>
        {srm.counts.map((c, i) => (
          <span key={arms[i]} className="tabular-nums">
            {arms[i]} <b>{fmtInt(c)}</b>명 <span className="text-ink3">(계획 {(srm.ratios[i] * 100).toFixed(1)}% · 실제 {((c / srm.counts.reduce((s, x) => s + x, 0)) * 100).toFixed(1)}%)</span>
          </span>
        ))}
        <span className="tabular-nums">비율 검정 p <b>{fmtP(srm.p)}</b></span>
      </div>
      <p className="mt-1 text-xs text-ink3">실제 배정이 계획한 비율과 다른지 확인하는 검정이에요. 지표를 읽기 전에 먼저 살펴보세요.</p>
    </div>
  );
}
