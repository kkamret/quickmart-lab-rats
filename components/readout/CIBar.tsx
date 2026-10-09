/**
 * 0 을 기준선으로, 차이의 신뢰구간을 막대로 보여준다. 구간이 0 을 지나가면 회색, 아니면 파랑.
 * 막대 눈금은 행(지표)마다 달라서 행끼리 길이를 비교할 수 없다. 정확한 값은 옆의 숫자와 aria-label 로 읽는다.
 */
export function CIBar({ d, ci, scale, label }: { d: number; ci: [number, number]; scale: number; label?: string }) {
  const W = 140;
  const H = 18;
  const x = (v: number) => W / 2 + (Math.max(-scale, Math.min(scale, v)) / scale) * (W / 2 - 4);
  const crossesZero = ci[0] <= 0 && ci[1] >= 0;
  const color = crossesZero ? "var(--ink3)" : "var(--blue)";
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label ?? "차이의 신뢰구간"} className="shrink-0">
      <line x1={W / 2} x2={W / 2} y1={2} y2={H - 2} stroke="var(--line)" strokeWidth={1.5} />
      <line x1={x(ci[0])} x2={x(ci[1])} y1={H / 2} y2={H / 2} stroke={color} strokeWidth={3} strokeLinecap="round" />
      <circle cx={x(d)} cy={H / 2} r={3.5} fill={color} />
    </svg>
  );
}
