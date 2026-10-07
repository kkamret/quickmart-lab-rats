"use client";
import { useCallback, useEffect, useState } from "react";
import type { ClientCase, PhaseDef } from "@/lib/cases/types";
import type { LabAdapter } from "@/lib/lab/adapter";
import { decisionSchema, formatIssues, latestOf, simPhaseOf, stepPhases, type Submission } from "@/lib/lab/phase";
import type { StepKey, StepStatus } from "@/lib/steps";
import type { TeamReadout } from "@/lib/sim/core/readout";
import { getCaseUi } from "./cases/registry";
import { AutoForm } from "./form/AutoForm";
import { ReadoutView } from "./readout/ReadoutView";
import { Badge, Button, Card, ErrorText, inputClass, TheoryNote } from "./ui";

type Obj = Record<string, unknown>;
type RunKey = string; // `${phaseKey}:${mode}`

const PREV_PHASE: Record<string, string> = { p2: "p1", p3: "p2", p4: "p3" };

type Ctx = {
  client: ClientCase;
  step: StepKey;
  status: StepStatus;
  adapter: LabAdapter;
  subs: Submission[];
  reload: () => Promise<void>;
  runs: Record<RunKey, TeamReadout | { error: string }>;
  setRun: (k: RunKey, v: TeamReadout | { error: string }) => void;
};

/** 사례 플러그인이 정의한 Phase 를 순서대로 보여준다: 진단/설계 폼 → 제출 → 시뮬 → Readout → 결정 */
export function StepView({ client, step, status, adapter }: { client: ClientCase; step: StepKey; status: StepStatus; adapter: LabAdapter }) {
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const [runs, setRuns] = useState<Ctx["runs"]>({});
  const reload = useCallback(async () => setSubs(await adapter.loadSubmissions()), [adapter]);
  useEffect(() => { reload(); }, [reload]);

  const phases = stepPhases(client, step);
  if (phases.length === 0) return <Card><p className="text-ink2">이 스텝에는 이 사례의 화면이 없어요.</p></Card>;
  if (subs === null) return <p className="text-ink3">불러오는 중…</p>;

  const ctx: Ctx = { client, step, status, adapter, subs, reload, runs, setRun: (k, v) => setRuns((r) => ({ ...r, [k]: v })) };
  return (
    <div className="space-y-5">
      <TheoryNote step={step} />
      {status === "locked" && adapter.mode === "remote" && (
        <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">강사님이 이 스텝을 열면 진행할 수 있어요.</p>
      )}
      {status === "closed" && <p className="rounded-lg bg-sunk px-3 py-2 text-sm text-ink2">이 스텝은 마감됐어요. 제출한 내용은 볼 수 있어요.</p>}
      {phases.map((def) => (
        <Card key={def.key}>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-xl font-bold">{def.title}</h2>
            <SavedBadge ctx={ctx} def={def} />
          </div>
          <Phase ctx={ctx} def={def} />
        </Card>
      ))}
    </div>
  );
}

function SavedBadge({ ctx, def }: { ctx: Ctx; def: PhaseDef }) {
  const kind = def.kind === "design" ? "design" : def.kind === "diagnose" ? "diagnosis" : def.kind === "decide" ? "decision" : null;
  const s = kind ? latestOf(ctx.subs, simPhaseOf(def.key), kind) : undefined;
  return s ? <Badge tone="done">제출됨 · v{s.version}</Badge> : kind ? <Badge tone="draft">아직 제출 전</Badge> : null;
}

function Phase({ ctx, def }: { ctx: Ctx; def: PhaseDef }) {
  const sim = simPhaseOf(def.key);
  const hasDesign = !!latestOf(ctx.subs, sim, "design");
  switch (def.kind) {
    case "diagnose":
    case "design": {
      const kind = def.kind === "design" ? "design" : "diagnosis";
      const saved = latestOf(ctx.subs, sim, kind);
      const prev = PREV_PHASE[sim] ? latestOf(ctx.subs, PREV_PHASE[sim], "design") : undefined;
      return (
        <FormPhase
          key={`${def.key}-${prev?.version ?? 0}`} /* 제출해도 폼을 다시 만들지 않는다(메시지 유지). 앞 Phase 설계가 바뀌면 이어받기 위해 다시 만든다. */
          ctx={ctx} def={def} sim={sim} kind={kind}
          initial={(saved?.payload as Obj) ?? ctx.client.defaultDesign(sim, prev?.payload as Obj | undefined)}
        />
      );
    }
    case "run":
      return <RunPhase ctx={ctx} def={def} hasDesign={hasDesign} modes={["aa", "main"]} />;
    case "readout":
      return <RunPhase ctx={ctx} def={def} hasDesign={hasDesign} modes={["main"]} />;
    case "decide":
      return <DecidePhase ctx={ctx} sim={sim} hasDesign={!!latestOf(ctx.subs, ctx.client.decisions[sim]?.requires ?? sim, "design")} />;
  }
}

function FormPhase({ ctx, def, sim, kind, initial }: { ctx: Ctx; def: PhaseDef; sim: string; kind: "design" | "diagnosis"; initial: Obj }) {
  const { Diagnose, DesignAside } = getCaseUi(ctx.client.key);
  const [value, setValue] = useState<Obj>(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const editable = ctx.status === "open";

  async function submit() {
    setMsg("");
    const parsed = ctx.client.designSchema[sim].safeParse(value);
    if (!parsed.success) return setErrors(formatIssues(parsed.error.issues, ctx.client.formMeta[sim]));
    setErrors([]);
    setBusy(true);
    const r = await ctx.adapter.submit({ step: ctx.step, phase: sim, kind, payload: parsed.data as Obj });
    setBusy(false);
    if (!r.ok) return setErrors([r.error]);
    setMsg(`제출했어요 (v${r.version}). 다시 고쳐서 제출할 수도 있어요.`);
    await ctx.reload();
  }

  return (
    <div className="space-y-4">
      {def.kind === "diagnose" && Diagnose && <Diagnose />}
      {def.kind === "design" && DesignAside && <DesignAside phase={sim} value={value} />}
      <AutoForm meta={ctx.client.formMeta[sim]} value={value} onChange={setValue} disabled={!editable} />
      {errors.length > 0 && (
        <ul role="alert" className="list-disc space-y-0.5 rounded-lg bg-neg-soft py-2 pl-7 pr-3 text-sm text-neg">
          {errors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={!editable || busy}>{busy ? "제출 중…" : "제출하기"}</Button>
        {msg && <span className="text-sm text-pos">{msg}</span>}
      </div>
    </div>
  );
}

function RunPhase({ ctx, def, hasDesign, modes }: { ctx: Ctx; def: PhaseDef; hasDesign: boolean; modes: ("aa" | "main")[] }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [shown, setShown] = useState<"aa" | "main">(modes[modes.length - 1]);
  const { Panels, series, periodUnit, armLabels: baseLabels, armLabelsOf } = getCaseUi(ctx.client.key);
  const locked = ctx.status === "locked" && ctx.adapter.mode === "remote";

  async function run(mode: "aa" | "main") {
    setBusy(mode);
    const r = await ctx.adapter.simulate({ phase: def.key, mode });
    setBusy(null);
    ctx.setRun(`${def.key}:${mode}`, r.ok ? r.readout : { error: r.error });
    setShown(mode);
  }

  const result = ctx.runs[`${def.key}:${shown}`];
  const label = (m: "aa" | "main") => (m === "aa" ? "A/A 실행" : modes.length === 1 ? "결과 보기" : "본 실험 실행");
  return (
    <div className="space-y-4">
      {!hasDesign && <p className="text-sm text-ink2">먼저 설계를 제출해 주세요. 제출한 최신 설계로 시뮬레이션해요.</p>}
      {def.kind === "run" && (
        <p className="text-sm text-ink2">
          본 실험 전에 <b>A/A</b>(두 그룹에 같은 화면)로 먼저 돌려볼 수 있어요. 중간 확인 규칙을 정했다면 그 규칙대로 자동 종료돼요.
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2">
        {modes.map((m) => (
          <Button key={m} variant={m === "aa" ? "ghost" : "primary"} disabled={!hasDesign || locked || busy !== null} onClick={() => run(m)}>
            {busy === m ? "계산 중…" : label(m)}
          </Button>
        ))}
        {modes.length > 1 && (
          <div className="ml-auto flex gap-1 text-sm">
            {modes.map((m) => (
              <button key={m} onClick={() => setShown(m)} className={`rounded-full border px-3 py-1 ${shown === m ? "border-brand bg-brand-soft font-semibold" : "border-line text-ink2"}`}>
                {m === "aa" ? "A/A" : "본 실험"}
              </button>
            ))}
          </div>
        )}
      </div>
      {result && "error" in result && <ErrorText>{result.error}</ErrorText>}
      {result && !("error" in result) && (
        <ReadoutView readout={result} series={series} periodUnit={periodUnit} armLabels={{ ...baseLabels, ...(armLabelsOf?.(result.panels) ?? {}) }}>{Panels && <Panels phase={def.key} panels={result.panels} />}</ReadoutView>
      )}
    </div>
  );
}

function DecidePhase({ ctx, sim, hasDesign }: { ctx: Ctx; sim: string; hasDesign: boolean }) {
  const saved = latestOf(ctx.subs, sim, "decision");
  const def = ctx.client.decisions[sim];
  const options = def?.options ?? [];
  const fields = def?.fields ?? [];
  const [option, setOption] = useState<string>((saved?.payload.option as string) ?? "");
  const [rationale, setRationale] = useState<string>((saved?.payload.rationale as string) ?? "");
  const [extra, setExtra] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.name, (saved?.payload[f.name] as string) ?? ""])));
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const editable = ctx.status === "open";

  async function submit() {
    setMsg("");
    const parsed = decisionSchema(options.map((o) => o.id), fields).safeParse({ option, rationale, ...extra });
    if (!parsed.success) return setErr(option ? parsed.error.issues[0].message : "선택지 중에서 골라주세요");
    setErr("");
    setBusy(true);
    const r = await ctx.adapter.submit({ step: ctx.step, phase: sim, kind: "decision", payload: parsed.data });
    setBusy(false);
    if (!r.ok) return setErr(r.error);
    setMsg(`제출했어요 (v${r.version}).`);
    await ctx.reload();
  }

  return (
    <div className="space-y-3">
      {!hasDesign && <p className="text-sm text-ink2">설계를 제출하고 결과를 본 뒤에 결정해요.</p>}
      <div role="radiogroup" className="space-y-2">
        {options.map((o) => (
          <label key={o.id} className={`flex cursor-pointer gap-3 rounded-xl border p-3 ${option === o.id ? "border-brand bg-brand-soft" : "border-line bg-sunk"} ${editable ? "" : "opacity-60"}`}>
            <input type="radio" name={`decide-${sim}`} checked={option === o.id} disabled={!editable} onChange={() => setOption(o.id)} className="mt-1" />
            <span><b className="block text-sm">{o.label}</b><span className="text-xs text-ink2">{o.desc}</span></span>
          </label>
        ))}
      </div>
      <div>
        <label htmlFor={`rat-${sim}`} className="mb-1 block text-sm font-semibold">결정한 근거</label>
        <textarea id={`rat-${sim}`} rows={3} className={inputClass} value={rationale} disabled={!editable} onChange={(e) => setRationale(e.target.value)} />
      </div>
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={`${f.name}-${sim}`} className="mb-1 block text-sm font-semibold">{f.label}</label>
          {f.help && <p className="mb-1.5 text-xs text-ink3">{f.help}</p>}
          <textarea id={`${f.name}-${sim}`} rows={3} className={inputClass} value={extra[f.name] ?? ""} disabled={!editable} onChange={(e) => setExtra((x) => ({ ...x, [f.name]: e.target.value }))} />
        </div>
      ))}
      <ErrorText>{err}</ErrorText>
      <div className="flex items-center gap-3">
        <Button onClick={submit} disabled={!editable || busy}>{busy ? "제출 중…" : "결정 제출"}</Button>
        {msg && <span className="text-sm text-pos">{msg}</span>}
      </div>
    </div>
  );
}
