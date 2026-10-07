"use client";
import { useEffect, useState } from "react";
import type { RevealPayload } from "@/lib/reveal";
import type { StepKey } from "@/lib/steps";
import { theoryLabel, type TheoryKey } from "@/lib/theory";
import { Badge, Card, ErrorText } from "../ui";

/** 정답 공개 카드: 강사가 공개를 켠 뒤에만 보인다. 원문 비교 해설과, 이 조의 시뮬레이션이 심어 둔 함정을 알려준다. */
export function RevealCard({ code, teamId, step, theory }: { code: string; teamId: string; step: StepKey; theory: TheoryKey[] }) {
  const [data, setData] = useState<RevealPayload | null>(null);
  const [err, setErr] = useState("");

  useEffect(() => {
    let off = false;
    fetch("/api/reveal", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, teamId }) })
      .then(async (r) => {
        const body = await r.json();
        if (off) return;
        if (!r.ok) setErr(body.error ?? "정답을 불러오지 못했어요.");
        else setData(body);
      })
      .catch(() => { if (!off) setErr("정답을 불러오지 못했어요. 네트워크를 확인해 주세요."); });
    return () => { off = true; };
  }, [code, teamId]);

  const items = data?.items.filter((i) => i.step === step) ?? [];
  const flags = data?.flags.filter((f) => f.step === step) ?? [];
  if (!err && items.length === 0 && flags.length === 0) return null;
  return (
    <Card className="border-brand">
      <div className="flex items-center gap-2"><h2 className="text-xl font-bold">정답 공개</h2><Badge tone="run">강사님이 공개했어요</Badge></div>
      <ErrorText>{err}</ErrorText>
      {flags.map((f) => (
        <div key={f.phase} className="mt-3">
          <h3 className="text-sm font-semibold">{f.title}: 우리 조의 시뮬레이션에 심어 둔 함정</h3>
          {f.flags.length === 0 ? (
            <p className="mt-1 text-sm text-ink2">이 설계에서는 걸린 함정이 없었어요.</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">{f.flags.map((x) => <Badge key={x.code} tone="warn">{x.label}</Badge>)}</div>
          )}
          {f.achievedPower !== null && <p className="mt-1 text-xs text-ink3">달성 검정력 {Math.round(f.achievedPower * 100)}%</p>}
        </div>
      ))}
      {items.map((i) => (
        <div key={i.phase} className="mt-3">
          <h3 className="text-sm font-semibold">{i.title}: 원문과 비교해 보면</h3>
          <p className="mt-1 text-sm text-ink2">{i.text}</p>
        </div>
      ))}
      {theory.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">오늘 쓴 개념 ↔ 이론 슬라이드</h3>
          <ul className="mt-1 space-y-0.5 text-sm text-ink2">
            {theory.map((k) => <li key={k}>{theoryLabel(k)}</li>)}
          </ul>
        </div>
      )}
    </Card>
  );
}
