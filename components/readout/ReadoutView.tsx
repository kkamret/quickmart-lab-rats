import type { ReactNode } from "react";
import type { TeamReadout } from "@/lib/sim/core/readout";
import { Card } from "../ui";
import { MetricTable } from "./MetricTable";
import { SrmStrip } from "./SrmStrip";
import { TimeSeries, type Series } from "./TimeSeries";
import { fmtInt, type ArmLabels } from "./format";

/**
 * 공통 Readout 화면. 읽는 순서는 고정: 데이터 품질(SRM) → Primary → Guardrail → Secondary·Driver → 사례 전용 패널.
 * 사례 전용 패널·시계열·그룹 이름은 props 로 받는다(공통 컴포넌트에 사례 로직이 새지 않게).
 */
export function ReadoutView({
  readout, title, series = [], periodUnit = "일", armLabels = {}, children,
}: { readout: TeamReadout; title?: string; series?: Series[]; periodUnit?: string; armLabels?: ArmLabels; children?: ReactNode }) {
  const arms = Object.keys(readout.periods[0]?.arms ?? { A: 1, B: 1 });
  const armName = (a: string) => armLabels[a]?.split(" ")[0] ?? a;
  return (
    <div className="space-y-4">
      {title && <h3 className="text-lg font-semibold">{title}</h3>}
      <p className="text-sm text-ink2">
        {readout.stoppedAt}{periodUnit}차까지 진행했어요.
        {readout.planned && <> 계획 표본은 그룹당 약 <b>{fmtInt(readout.planned.nPerArm)}</b>명, 기간은 약 <b>{readout.planned.days}</b>일이에요.</>}
      </p>
      {readout.srm && <SrmStrip srm={readout.srm} arms={arms.map(armName)} />}
      <Card className="!p-4"><MetricTable metrics={readout.metrics} armLabels={armLabels} /></Card>
      {series.length > 0 && (
        <Card className="!p-4">
          <h4 className="mb-2 text-sm font-semibold">{periodUnit}별 추이</h4>
          <TimeSeries periods={readout.periods} series={series} periodUnit={periodUnit} armLabels={armLabels} />
        </Card>
      )}
      {readout.costs && (
        <Card className="!p-4 text-sm">
          <b>실험 비용</b>: 쿠폰 비용 약 {fmtInt(readout.costs.coupon_cost_krw ?? 0)}원 <span className="text-ink3">(가상)</span>
        </Card>
      )}
      {children}
      <p className="text-xs text-ink3">모든 수치는 교육용 가상 데이터예요. 원문 사실과 섞이지 않아요.</p>
    </div>
  );
}
