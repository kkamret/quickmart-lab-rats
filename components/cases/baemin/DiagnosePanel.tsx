import { FUNNEL_BY_TYPE, MIN_ORDER, REVISIT_ROWS } from "@/lib/cases/baemin/diagnose";
import { fmtInt, fmtPct } from "@/components/readout/format";
import { Card } from "@/components/ui";

const TYPE_LABEL: Record<string, string> = { general: "일반", first_order: "첫 주문 혜택", member: "멤버십" };

/** s1_diagnose: 이탈 퍼널 대시보드(관찰 데이터). 이 데이터만으로 인과를 말할 수 있는지가 질문이다. */
export function BaeminDiagnosePanel() {
  return (
    <div className="space-y-3">
      <Card className="!p-4 text-sm">
        <h4 className="mb-1 font-semibold">상황</h4>
        <p className="text-ink2">
          퀵마트 가게홈에서 장바구니에 상품을 담고도 주문하지 않고 떠나는 사용자가 많아요. 최소주문금액은 {fmtInt(MIN_ORDER)}원이에요.
          “가게홈에 최소주문금액 달성 여부를 보여주는 바를 넣으면 이탈이 줄 것”이라는 가설이 있어요. 아래는 지금까지 쌓인 <b>관찰 데이터</b>예요.
        </p>
      </Card>
      <Card className="!p-4">
        <h4 className="mb-2 text-sm font-semibold">고객 유형별 퍼널</h4>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="text-left text-xs text-ink3">
              <th className="py-1 font-medium">고객 유형</th><th className="py-1 text-right font-medium">장바구니 담기율</th>
              <th className="py-1 text-right font-medium">장바구니 이탈률</th><th className="py-1 text-right font-medium">이탈 중 최소금액 미달 비중</th>
            </tr>
          </thead>
          <tbody>
            {FUNNEL_BY_TYPE.map((r) => (
              <tr key={r.type} className="border-t border-line tabular-nums">
                <td className="py-1.5 font-medium">{TYPE_LABEL[r.type]}</td>
                <td className="py-1.5 text-right">{fmtPct(r.cartAdd, 0)}</td>
                <td className="py-1.5 text-right">{fmtPct(r.abandon, 1)}</td>
                <td className="py-1.5 text-right">{fmtPct(r.belowMin, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
      <Card className="!p-4">
        <h4 className="mb-2 text-sm font-semibold">장바구니를 다시 열어본 횟수별 주문 비율</h4>
        <div className="overflow-x-auto">
        <table className="w-full min-w-[360px] text-sm">
          <thead><tr className="text-left text-xs text-ink3"><th className="py-1 font-medium">재방문 횟수</th><th className="py-1 text-right font-medium">사용자 비중</th><th className="py-1 text-right font-medium">주문 비율</th></tr></thead>
          <tbody>
            {REVISIT_ROWS.map((r) => (
              <tr key={r.label} className="border-t border-line tabular-nums">
                <td className="py-1.5 font-medium">{r.label}</td>
                <td className="py-1.5 text-right">{fmtPct(r.share, 0)}</td>
                <td className="py-1.5 text-right">{fmtPct(r.orderRate, 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </Card>
      <p className="text-xs text-ink3">모든 수치는 교육용 가상 데이터예요. 출처: 우아한형제들 기술블로그 「최소주문금액바 4번의 A/B실험」을 각색한 가상 시나리오.</p>
    </div>
  );
}
