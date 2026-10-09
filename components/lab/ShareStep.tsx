"use client";
import { useCallback, useEffect, useState } from "react";
import { CASES } from "@/lib/cases";
import type { ClientCase } from "@/lib/cases/types";
import type { LabAdapter } from "@/lib/lab/adapter";
import { SHARE_WHY } from "@/lib/lab/lab-why";
import { buildMemoDoc } from "@/lib/lab/memo";
import { latestOf, type Submission } from "@/lib/lab/phase";
import type { ReviewResult, ShareReview } from "@/lib/review/types";
import type { StepStatus } from "@/lib/steps";
import { Badge, Button, Card, ErrorText, inputClass, WhyLine } from "../ui";

/** s8 직소 공유: 결정 메모(공통) 제출 + 발표용 요약 + 강사가 만든 조별 브리핑 읽기 */
export function ShareStep({ code, teamId, teamName, client, status, adapter }: {
  code: string; teamId: string; teamName: string; client: ClientCase; status: StepStatus; adapter: LabAdapter;
}) {
  const [subs, setSubs] = useState<Submission[] | null>(null);
  const reload = useCallback(async () => setSubs(await adapter.loadSubmissions()), [adapter]);
  useEffect(() => { reload(); }, [reload]);
  if (subs === null) return <p className="text-ink3">불러오는 중…</p>;
  return (
    <div className="space-y-5">
      {status === "locked" && <p className="rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">강사님이 이 스텝을 열면 메모를 제출할 수 있어요.</p>}
      <MemoCard client={client} subs={subs} status={status} adapter={adapter} onSaved={reload} />
      <Briefs code={code} teamId={teamId} teamName={teamName} />
    </div>
  );
}

function MemoCard({ client, subs, status, adapter, onSaved }: { client: ClientCase; subs: Submission[]; status: StepStatus; adapter: LabAdapter; onSaved: () => Promise<void> }) {
  const saved = latestOf(subs, "memo", "note");
  const [learned, setLearned] = useState(String(saved?.payload.learned ?? ""));
  const [lesson, setLesson] = useState(String(saved?.payload.lesson ?? ""));
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const doc = buildMemoDoc(client, subs);

  async function save() {
    setBusy(true); setMsg(""); setErr("");
    const r = await adapter.submit({ step: "s8_share", phase: "memo", kind: "note", payload: { learned, lesson } });
    setBusy(false);
    if (!r.ok) setErr(r.error);
    else { setMsg(`제출했어요 (v${r.version})`); await onSaved(); }
  }
  async function copy() {
    try { await navigator.clipboard.writeText(doc); setMsg("복사했어요"); } catch { setErr("복사가 막혀 있어요. 텍스트를 직접 선택해 복사하세요."); }
  }

  return (
    <Card>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="text-xl font-bold">결정 메모</h2>
        {saved ? <Badge tone="done">제출됨 · v{saved.version}</Badge> : <Badge tone="draft">아직 제출 전</Badge>}
      </div>
      <p className="mb-3 text-sm text-ink2">&lsquo;유의하다&rsquo;에서 멈추지 말고, 효과 크기 × 비용 × 리스크로 말해보세요. 아래 요약은 지금까지 제출한 결정을 모은 거예요.</p>
      <pre className="whitespace-pre-wrap rounded-lg bg-sunk p-3 text-sm">{doc}</pre>
      <div className="mt-4 space-y-3">
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold text-ink2">오늘 가장 많이 배운 실험과 그 이유</span>
          <WhyLine why={SHARE_WHY.learned} className="mb-1.5" />
          <textarea className={inputClass} rows={3} value={learned} onChange={(e) => setLearned(e.target.value)} />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block text-xs font-semibold text-ink2">다른 조(다른 사례)에게 전하고 싶은 한 가지</span>
          <WhyLine why={SHARE_WHY.lesson} className="mb-1.5" />
          <textarea className={inputClass} rows={2} value={lesson} onChange={(e) => setLesson(e.target.value)} />
        </label>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={save} disabled={busy || status !== "open"}>{busy ? "저장 중…" : saved ? "다시 제출" : "제출하기"}</Button>
        <Button variant="ghost" onClick={copy}>요약 복사</Button>
        {msg && <span className="text-sm text-pos">{msg}</span>}
      </div>
      <ErrorText>{err}</ErrorText>
      <p className="mt-4 rounded-lg bg-brand-soft p-3 text-sm">
        <b>생각해 볼 질문</b> 오늘 결정한 실험 중 가장 많이 배운 실험은 무엇이었나요? 실험 기록이 다음 실험의 재료가 된다는 점과 연결해서 이야기해보세요.
      </p>
    </Card>
  );
}

function Briefs({ code, teamId, teamName }: { code: string; teamId: string; teamName: string }) {
  const [res, setRes] = useState<ReviewResult<ShareReview> | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setBusy(true); setErr("");
    try {
      const r = await fetch("/api/share", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, teamId }) });
      const body = await r.json();
      if (!r.ok) setErr(body.error ?? "브리핑을 불러오지 못했어요.");
      else { setRes(body.result); setRevealed(!!body.revealed); setLoaded(true); }
    } catch {
      setErr("브리핑을 불러오지 못했어요. 네트워크를 확인해 주세요.");
    }
    setBusy(false);
  }, [code, teamId]);
  useEffect(() => { load(); }, [load]);

  const briefs = res?.output.briefs ?? [];
  return (
    <Card>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold">조별 브리핑 (직소 공유)</h2>
        {res?.model === "mock" && <Badge tone="warn">샘플 브리핑</Badge>}
        <Button className="ml-auto" variant="ghost" onClick={load} disabled={busy}>{busy ? "불러오는 중…" : "새로고침"}</Button>
      </div>
      <p className="mt-1 text-sm text-ink3">강사님이 만든 조별 2분 브리핑 초안이에요. 다른 사례를 고른 조의 이야기를 들으며 내 사례와 연결해 보세요.{!revealed && " 정답 공개 전이라 함정 이름은 가려져 있어요."}</p>
      <ErrorText>{err}</ErrorText>
      {loaded && briefs.length === 0 && <p className="mt-3 text-sm text-ink2">아직 브리핑이 만들어지지 않았어요. 강사님이 만들면 여기에 나타나요.</p>}
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {briefs.map((b) => (
          <div key={b.team} className={`rounded-xl border p-4 ${b.team === teamName ? "border-brand ring-1 ring-brand" : "border-line bg-sunk"}`}>
            <div className="flex items-center justify-between gap-2">
              <b className="text-lg">{b.team}</b>
              <span className="text-sm text-ink3">{CASES[b.case as keyof typeof CASES]?.company ?? b.case}</span>
            </div>
            <ol className="mt-2 list-decimal space-y-1 pl-5 text-sm text-ink2">{b.story_in_3_lines.map((l) => <li key={l}>{l}</li>)}</ol>
            {b.traps_we_hit.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">{b.traps_we_hit.map((t) => <Badge key={t} tone="warn">{t}</Badge>)}</div>
            )}
            {b.one_lesson_for_other_teams && <p className="mt-3 rounded-lg bg-brand-soft p-2 text-sm"><b>다른 조에게</b> {b.one_lesson_for_other_teams}</p>}
          </div>
        ))}
      </div>
    </Card>
  );
}
