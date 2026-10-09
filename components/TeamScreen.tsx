"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { CASE_KEYS, CASES, type CaseKey } from "@/lib/cases";
import { getClientCase } from "@/lib/cases/client-registry";
import { createRemoteAdapter } from "@/lib/lab/adapter";
import { STEP_KEYS, STEP_LABELS, type StepKey } from "@/lib/steps";
import { countByCase } from "@/lib/team-case";
import { useClassLive } from "@/lib/use-class-live";
import { ShareStep } from "./lab/ShareStep";
import { TrapLab } from "./lab/TrapLab";
import { RevealCard } from "./review/RevealCard";
import { TeamReviewCard } from "./review/TeamReviewCard";
import { StatusBadge } from "./StatusBadge";
import { StepView } from "./StepView";
import { Badge, Button, Card, ErrorText, PhaseIntro } from "./ui";

export function TeamScreen({ code, teamId }: { code: string; teamId: string }) {
  const { cls, teams, steps, error, loading } = useClassLive(code);
  const [active, setActive] = useState<StepKey>("s0_pick");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const adapter = useMemo(() => createRemoteAdapter(code, teamId), [code, teamId]);

  const me = teams.find((t) => t.id === teamId);
  if (loading) return <p className="p-8 text-ink3">불러오는 중…</p>;
  if (error || !cls) return <p className="p-8 text-neg">{error ?? "수업을 찾을 수 없어요."}</p>;
  if (!me)
    return (
      <p className="p-8">
        조 정보를 찾을 수 없어요. <Link className="text-brand underline" href="/">다시 입장하기</Link>
      </p>
    );

  // 내 조를 뺀 나머지 조들의 선택 수
  const counts = countByCase(teams.filter((t) => t.id !== teamId).map((t) => t.case_key));
  const done = STEP_KEYS.filter((k) => steps[k] === "closed").length;
  const pickOpen = steps.s0_pick === "open";
  const clientCase = getClientCase(me.case_key);

  async function pick(caseKey: CaseKey) {
    setMsg("");
    setBusy(caseKey);
    const res = await fetch("/api/team/case", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, teamId, caseKey }),
    });
    setBusy(null);
    if (!res.ok) setMsg((await res.json()).error ?? "선택하지 못했어요.");
  }

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] md:grid-cols-[252px_minmax(0,1fr)]">
      <nav className="border-b border-line bg-surface p-4 md:sticky md:top-0 md:h-screen md:overflow-auto md:border-b-0 md:border-r">
        <div className="mb-4 flex items-center gap-2.5 px-2">
          <div className="grid h-8 w-8 place-items-center rounded-[10px] bg-brand text-sm font-bold text-white">Q</div>
          <div className="leading-tight">
            <b className="block text-sm">{me.name}</b>
            <small className="text-xs text-ink3">{cls.title}</small>
          </div>
        </div>
        <ul className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1 md:mx-0 md:block md:space-y-0.5 md:overflow-visible md:p-0">
          {STEP_KEYS.map((k, i) => (
            <li key={k} className="shrink-0 md:shrink">
              <button
                onClick={() => setActive(k)}
                className={`flex w-full items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-2 text-left text-sm ${active === k ? "bg-brand-soft font-semibold text-ink" : "text-ink2 hover:bg-sunk"}`}
              >
                <span className="w-5 text-xs text-ink3">{i}</span>
                <span className="flex-1">{STEP_LABELS[k]}</span>
                <StatusBadge status={steps[k]} />
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <main className="min-w-0 px-4 pb-20 md:px-9">
        <div className="sticky top-0 z-10 bg-gradient-to-b from-bg from-70% to-transparent pb-2.5 pt-3.5">
          <div className="flex items-center gap-4 rounded-2xl bg-bar px-4 py-2.5 text-sm text-bar-ink">
            <span className="flex-1">
              <strong>{done}</strong> / {STEP_KEYS.length} 스텝 마감
            </span>
            <div className="h-2 flex-[0_0_38%] overflow-hidden rounded-full bg-bar-track">
              <div className="h-full rounded-full bg-brand transition-all duration-500" style={{ width: `${(done / STEP_KEYS.length) * 100}%` }} />
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl">
          <h1 className="mb-1 mt-4 text-3xl font-bold tracking-tight">{STEP_LABELS[active]}</h1>
          {active !== "s0_pick" ? (
            active === "s7_lab" ? (
              <div className="mt-4">
                {steps.s7_lab === "locked" && <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">강사님이 이 스텝을 열면 진행할 수 있어요. (계산은 미리 해 봐도 돼요.)</p>}
                <PhaseIntro intro={clientCase?.stepIntro?.s7_lab} />
                <TrapLab />
              </div>
            ) : !me.case_key ? (
              <Card className="mt-4"><p className="text-ink2">먼저 &lsquo;사례 선택&rsquo; 스텝에서 사례를 골라주세요.</p></Card>
            ) : !clientCase ? (
              <Card className="mt-4"><p className="text-ink2">이 사례의 화면은 아직 준비 중이에요. 강사님께 알려주세요.</p></Card>
            ) : (
              <div className="mt-4">
                {active === "s8_share" ? (
                  <>
                    <PhaseIntro intro={clientCase.stepIntro?.s8_share} />
                    <ShareStep code={code} teamId={teamId} teamName={me.name} client={clientCase} status={steps.s8_share ?? "locked"} adapter={adapter} />
                  </>
                ) : (
                  <>
                    <StepView key={active} client={clientCase} step={active} status={steps[active] ?? "locked"} adapter={adapter} />
                    <div className="mt-5"><TeamReviewCard key={`${active}-${cls.reveal_answers}`} code={code} teamId={teamId} step={active} /></div>
                    {cls.reveal_answers && <div className="mt-5"><RevealCard key={active} code={code} teamId={teamId} step={active} theory={active === "s6_final" ? clientCase.meta.theory : []} outsideTheory={active === "s6_final" ? clientCase.meta.outsideTheory : []} /></div>}
                  </>
                )}
              </div>
            )
          ) : (
            <>
              <p className="mb-4 text-ink2">우리 조가 실험해볼 사례를 하나 골라요. 사례당 최대 {cls.max_teams_per_case}개 조까지 고를 수 있어요.</p>
              {!pickOpen && <p className="mb-3 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">아직 선택이 열리지 않았어요. 강사님이 열면 고를 수 있어요.</p>}
              <div className="grid gap-3.5 sm:grid-cols-2">
                {CASE_KEYS.filter((k) => cls.allowed_cases.includes(k)).map((k) => {
                  const meta = CASES[k];
                  const taken = counts[k] ?? 0;
                  const full = taken >= cls.max_teams_per_case;
                  const mine = me.case_key === k;
                  return (
                    <Card key={k} className={mine ? "border-brand ring-1 ring-brand" : ""}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-xs text-ink3">
                            {meta.company} · 난이도 {"★".repeat(meta.difficulty)}
                          </p>
                          <h3 className="text-lg font-semibold">{meta.title}</h3>
                        </div>
                        {mine ? <Badge tone="run">우리 조</Badge> : full ? <Badge tone="warn">정원 마감</Badge> : null}
                      </div>
                      <p className="mt-2 text-sm text-ink2">“{meta.question}”</p>
                      <p className="mt-1 text-xs text-ink3">
                        권장: {meta.recommended} · 현재 {taken + (mine ? 1 : 0)}/{cls.max_teams_per_case}개 조
                      </p>
                      <Button
                        className="mt-3 w-full"
                        variant={mine ? "ghost" : "primary"}
                        disabled={!pickOpen || (full && !mine) || busy !== null}
                        onClick={() => pick(k)}
                      >
                        {mine ? "선택됨" : busy === k ? "저장 중…" : "이 사례로 할래요"}
                      </Button>
                    </Card>
                  );
                })}
              </div>
              <ErrorText>{msg}</ErrorText>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
