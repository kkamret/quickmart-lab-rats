"use client";
import { useMemo, useState } from "react";
import { fmtInt, fmtP, fmtPct } from "@/components/readout/format";
import { Button, Card, TheoryBadge, inputClass } from "@/components/ui";
import { peekingExperiment, simpsonRows, srmCheck, type PeekingResult } from "@/lib/lab/trap-lab";

/** s7 함정 연구소: 공통 화면. Readout 에서 스쳐 지나간 함정(Peeking, 심슨의 역설, SRM)을 직접 돌려본다. 브라우저에서만 계산한다. */
export function TrapLab() {
  return (
    <div className="space-y-5">
      <p className="text-ink2">Readout에서 스쳐 지나간 함정들을 직접 돌려봐요. 계산은 이 브라우저에서만 돌아가고 저장되지 않아요.</p>
      <Peeking />
      <Simpson />
      <SrmCalc />
    </div>
  );
}

function Peeking() {
  const [days, setDays] = useState(14);
  const [res, setRes] = useState<PeekingResult | null>(null);
  return (
    <Card>
      <h2 className="text-xl font-bold">Peeking: 매일 확인하다 유의하면 멈추면?<TheoryBadge k="peeking" reveal /></h2>
      <p className="mt-1 text-sm text-ink2">효과가 전혀 없는 A/A 실험을 수백 번 돌려요. 끝에 한 번만 보는 것과, 매일 보다가 p &lt; 0.05가 뜨는 순간 멈추는 것의 위양성률을 비교해요.</p>
      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="mb-1 block text-xs font-semibold text-ink2">실험 기간 (매일 1회 확인)</span>
          <select className={inputClass} value={days} onChange={(e) => { setDays(+e.target.value); setRes(null); }}>
            {[7, 14, 28].map((d) => <option key={d} value={d}>{d}일</option>)}
          </select>
        </label>
        <Button onClick={() => setRes(peekingExperiment(days))}>A/A 실험 400번 돌리기</Button>
      </div>
      {res && (
        <div className="mt-4 space-y-3">
          <Bar label="마지막 날 한 번만 확인" value={res.finalRate} tone="bg-pos" />
          <Bar label="매일 보다 유의하면 멈춤" value={res.everRate} tone="bg-neg" />
          <p className="text-xs text-ink3">막대 끝은 50%. 효과가 없는 실험이니, 여기 나온 &lsquo;유의&rsquo;는 전부 위양성이에요.</p>
          <h3 className="text-sm font-semibold">A/A 실험 {res.paths.length}개의 z-통계량 경로</h3>
          <ZPaths paths={res.paths} />
          <div className="rounded-lg bg-pos-soft p-3 text-sm">
            <b>무엇을 봤나요?</b> 경계선을 한 번이라도 넘은 경로가 꽤 많죠. 끝에 한 번만 보면 위양성률이 설계대로 약 5%지만, 매일 보고 멈추면 {fmtPct(res.everRate, 0)} 안팎으로 불어나요.
            실무 해결책은 ① 기간을 미리 정하고 끝까지 기다리기 ② 중간 확인이 필요하면 Sequential Testing(Always-valid p-value)처럼 여러 번 봐도 α가 유지되는 방법 쓰기예요.
          </div>
        </div>
      )}
    </Card>
  );
}

function Bar({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="w-44 shrink-0">{label}</span>
      <div className="h-3 flex-1 rounded bg-sunk"><div className={`h-3 rounded ${tone}`} style={{ width: `${Math.min(100, (value * 100) / 0.5)}%` }} /></div>
      <b className="w-14 text-right tabular-nums">{fmtPct(value, 1)}</b>
    </div>
  );
}

function ZPaths({ paths }: { paths: number[][] }) {
  const W = 640, H = 220, L = 40, R = 12, T = 10, B = 24;
  const n = paths[0]?.length ?? 1;
  const x = (i: number) => L + (n === 1 ? 0 : (i / (n - 1)) * (W - L - R));
  const lim = 3.5;
  const y = (v: number) => T + (1 - (Math.max(-lim, Math.min(lim, v)) + lim) / (2 * lim)) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="A/A 실험의 z 경로">
      {[-1.96, 1.96].map((v) => <line key={v} x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--neg)" strokeDasharray="4 3" />)}
      <line x1={L} x2={W - R} y1={y(0)} y2={y(0)} stroke="var(--line)" />
      {[-3, -1.96, 0, 1.96, 3].map((v) => <text key={v} x={L - 6} y={y(v) + 4} textAnchor="end" fontSize={11} fill="var(--ink3)">{v}</text>)}
      {paths.map((p, k) => <polyline key={k} fill="none" stroke="var(--blue)" strokeWidth={1.3} opacity={0.45} points={p.map((v, i) => `${x(i)},${y(v)}`).join(" ")} />)}
      <text x={L} y={H - 6} fontSize={11} fill="var(--ink3)">1일</text>
      <text x={W - R} y={H - 6} textAnchor="end" fontSize={11} fill="var(--ink3)">{n}일</text>
    </svg>
  );
}

function Simpson() {
  const [view, setView] = useState<"pool" | "split">("pool");
  const rows = useMemo(() => simpsonRows(view), [view]);
  return (
    <Card>
      <h2 className="text-xl font-bold">심슨의 역설: 램프업 중 비율을 바꿨다면<TheoryBadge k="simpson" reveal /></h2>
      <p className="mt-1 text-sm text-ink2">첫 주는 B에 10%만 배정했다가, 둘째 주에 50%로 늘렸어요. 그런데 둘째 주는 마침 대형 프로모션 주간이었어요.</p>
      <div className="mt-3 flex gap-2">
        <Button variant={view === "pool" ? "primary" : "ghost"} onClick={() => setView("pool")}>전체 기간 합쳐 보기</Button>
        <Button variant={view === "split" ? "primary" : "ghost"} onClick={() => setView("split")}>기간별로 보기</Button>
      </div>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] text-sm">
          <thead>
            <tr className="text-xs text-ink3"><th className="px-2 py-2 text-left font-medium">구분</th><th className="px-2 py-2 text-right font-medium">A 전환율</th><th className="px-2 py-2 text-right font-medium">B 전환율</th><th className="px-2 py-2 text-right font-medium">B − A</th><th className="px-2 py-2 text-right font-medium">p</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-t border-line tabular-nums">
                <td className="px-2 py-2">{r.label}{r.note && <small className="ml-1 text-ink3">{r.note}</small>}</td>
                <td className="px-2 py-2 text-right">{fmtPct(r.A.x / r.A.n)}</td>
                <td className="px-2 py-2 text-right">{fmtPct(r.B.x / r.B.n)}</td>
                <td className="px-2 py-2 text-right font-semibold">{r.d > 0 ? "+" : "−"}{(Math.abs(r.d) * 100).toFixed(2)}%p</td>
                <td className="px-2 py-2 text-right">{fmtP(r.p)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {view === "pool" ? (
        <p className="mt-3 rounded-lg bg-warn-soft p-3 text-sm text-warn">합쳐 보면 B가 주문전환율을 크게 올린 것처럼 보여요. 정말 그럴까요? 기간별로 나눠보세요.</p>
      ) : (
        <div className="mt-3 rounded-lg bg-neg-soft p-3 text-sm">
          <b>기간마다 B가 오히려 낮아요.</b> 1주차(평소, 전환율 10% 수준)엔 B가 10%만 배정됐고, 2주차(프로모션, 전환율 16% 수준)엔 50%로 늘었어요. B 사용자의 대부분이 전환율 높은 주간에 몰려 있어서, 합치면 B가 좋아 보이는 착시가 생겨요. 이게 심슨의 역설이에요.
          <p className="mt-2">해결: 램프업 중 비율이 바뀐 기간은 분석에서 빼거나, 비율이 안정된 기간만 쓰거나, 기간별로 나눠 분석한 뒤 가중 결합해요.</p>
        </div>
      )}
    </Card>
  );
}

function SrmCalc() {
  const [a, setA] = useState("500000");
  const [b, setB] = useState("494000");
  const [r, setR] = useState("50");
  const res = srmCheck(+a, +b, +r / 100);
  return (
    <Card>
      <h2 className="text-xl font-bold">SRM 계산기<TheoryBadge k="srm" reveal /></h2>
      <p className="mt-1 text-sm text-ink2">설계한 배정 비율과 실제 사용자 수가 우연 이상으로 다른지 확인해요. 실무에서는 p &lt; 0.001이면 SRM으로 보고 결과 해석을 멈춰요.</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <Num label="A그룹 사용자 수" value={a} onChange={setA} />
        <Num label="B그룹 사용자 수" value={b} onChange={setB} />
        <Num label="설계한 A 비율 (%)" value={r} onChange={setR} />
      </div>
      {res.ok ? (
        <div className={`mt-3 rounded-lg p-3 text-sm ${res.srm ? "bg-neg-soft" : "bg-pos-soft"}`}>
          <b>{res.srm ? "SRM이 의심돼요" : "배정 비율이 설계와 맞아요"}</b>
          <span className="ml-2 tabular-nums">A {fmtInt(res.a)}명 ({fmtPct(res.shareA)}) · B {fmtInt(res.b)}명 ({fmtPct(res.shareB)}) · p = {fmtP(res.p)}</span>
        </div>
      ) : (
        <p role="alert" className="mt-3 text-sm text-neg">{res.error}</p>
      )}
      <p className="mt-2 text-xs text-ink3">같은 0.6%p 차이도 표본이 1천 명이면 우연이지만, 10만 명이면 SRM이에요. 비율만 보고 판단하지 말고 검정하세요.</p>
    </Card>
  );
}

function Num({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-ink2">{label}</span>
      <input className={inputClass} type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
