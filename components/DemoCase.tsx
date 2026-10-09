"use client";
import { useMemo, useState } from "react";
import { CASES, type CaseKey } from "@/lib/cases";
import { getClientCase } from "@/lib/cases/client-registry";
import { createDemoAdapter, resetDemo } from "@/lib/lab/adapter";
import { STEP_LABELS, type StepKey } from "@/lib/steps";
import { StepView } from "./StepView";
import { Button } from "./ui";

const DEMO_STEPS: StepKey[] = ["s1_diagnose", "s2_design", "s3_run", "s4_readout", "s5_deep", "s6_final"];

/** DB 없이 사례의 조 화면을 확인하는 데모. 제출은 이 브라우저(localStorage)에만 저장되고, 모든 스텝이 열려 있다. */
export function DemoCase({ caseKey }: { caseKey: CaseKey }) {
  const client = getClientCase(caseKey)!;
  const adapter = useMemo(() => createDemoAdapter(caseKey), [caseKey]);
  const [active, setActive] = useState<StepKey>("s1_diagnose");
  const [epoch, setEpoch] = useState(0);

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] md:grid-cols-[252px_minmax(0,1fr)]">
      <nav className="border-b border-line bg-surface p-4 md:sticky md:top-0 md:h-screen md:overflow-auto md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center gap-2.5 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-brand text-sm font-bold text-white">Q</div>
          <div className="leading-tight">
            <b className="block text-sm">{CASES[caseKey].company} 사례 데모</b>
            <small className="text-xs text-ink3">DB 없이 확인하는 화면</small>
          </div>
        </div>
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:block md:space-y-0.5 md:overflow-visible md:p-0">
          {DEMO_STEPS.map((k, i) => (
            <li key={k} className="shrink-0 md:shrink">
              <button
                onClick={() => setActive(k)}
                className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-sm ${active === k ? "bg-brand-soft font-semibold text-ink" : "text-ink2 hover:bg-sunk"}`}
              >
                <span className="w-5 text-xs text-ink3">{i + 1}</span>
                {STEP_LABELS[k]}
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-6 px-2">
          <Button variant="ghost" className="w-full" onClick={() => {
              if (!window.confirm("이 브라우저에 저장된 데모 제출을 모두 지워요. 계속할까요?")) return;
              resetDemo(caseKey);
              setEpoch((e) => e + 1);
            }}>데모 초기화</Button>
        </div>
      </nav>
      <main className="min-w-0 px-4 pb-20 md:px-9">
        <div className="mx-auto max-w-4xl">
          <p className="mt-4 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">
            데모 모드예요. 제출한 내용은 이 브라우저에만 저장되고, 실제 수업(조·강사·Realtime)과는 연결되지 않아요.
          </p>
          <h1 className="mb-1 mt-4 text-3xl font-bold tracking-tight">{STEP_LABELS[active]}</h1>
          <div className="mt-4">
            <StepView key={`${active}-${epoch}`} client={client} step={active} status="open" adapter={adapter} />
          </div>
        </div>
      </main>
    </div>
  );
}
