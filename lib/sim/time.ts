/** 두 타임스탬프 문자열 중 a 가 b 보다 나중인가. 문자열 비교는 시간대 표기(+09:00 / Z)가 섞이면 틀리므로 시각으로 비교한다. */
export function isNewer(a: string, b: string): boolean {
  const ta = Date.parse(a);
  const tb = Date.parse(b);
  if (Number.isNaN(ta) || Number.isNaN(tb)) return a > b;
  return ta > tb;
}
