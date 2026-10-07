"use client";
import { useState } from "react";
import { fmtDiff, fmtInt, fmtP, fmtPct } from "@/components/readout/format";
import { PanelSection } from "@/components/readout/PanelSection";
import { Badge, Button } from "@/components/ui";
import { OPINIONS } from "@/lib/cases/daangn/content";

type Stat = { n: number; x: number };
type SegRow = { A: Stat; B: Stat; d?: number; p?: number; significant?: boolean };
const P = { key: "r", type: "prop" } as const;
const th = "px-2 py-2 text-right text-xs font-medium text-ink3";
const thl = "px-2 py-2 text-left text-xs font-medium text-ink3";
const TYPE_LABEL: Record<string, string> = { existing: "기존 사용자", new: "신규 사용자(가입 7일 이내)" };
const SDK_LABEL: Record<string, string> = { android_old: "안드로이드 구버전 SDK", android_new: "안드로이드 최신 SDK", ios: "iOS" };
const rate = (s: Stat) => fmtPct(s.x / s.n, 2);

function SegTable({ title, rows, labels }: { title: string; rows: Record<string, SegRow>; labels: Record<string, string> }) {
  return (
    <div>
      <h5 className="mb-1 text-xs font-semibold text-ink2">{title}</h5>
      <table className="w-full min-w-[520px] text-sm">
        <thead><tr><th className={thl}>구분</th><th className={th}>A 사용자</th><th className={th}>B 사용자</th><th className={th}>A 작성률</th><th className={th}>B 작성률</th><th className={th}>B − A</th></tr></thead>
        <tbody>
          {Object.entries(rows).map(([k, r]) => (
            <tr key={k} className="border-t border-line tabular-nums">
              <td className="px-2 py-2 font-medium">{labels[k] ?? k}</td>
              <td className="px-2 py-2 text-right">{fmtInt(r.A.n)}</td>
              <td className="px-2 py-2 text-right">{fmtInt(r.B.n)}</td>
              <td className="px-2 py-2 text-right">{rate(r.A)}</td>
              <td className="px-2 py-2 text-right">{rate(r.B)}</td>
              <td className="px-2 py-2 text-right">{r.d !== undefined && <><b>{fmtDiff(P, r.d)}</b> <span className="text-xs text-ink3">p {fmtP(r.p ?? 1)}</span></>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** 당근 사례 전용 패널: 실험 진단(A/A), 데이터 소스 비교, 세그먼트, salt 교차표, 동네 클러스터, 정성 의견 */
export function DaangnPanels({ phase, panels }: { phase: string; panels: Record<string, unknown> }) {
  const [opened, setOpened] = useState(false);
  const meta = panels.meta as { aa: boolean } | undefined;
  const diag = panels.diagnostics as
    | { cohorts: { label: string; A: number; B: number }[]; bothGroups: { users: number; total: number; share: number }; srmP: number }
    | undefined;
  const source = panels.data_source as { rows: { arm: string; n: number; server: number; client: number }[] } | undefined;
  const segments = panels.segments as { byType: Record<string, SegRow>; bySdk: Record<string, SegRow> } | undefined;
  const salt = panels.salt_crosstab as { rows: { prev: string; A: number; B: number }[] } | undefined;
  const ext = panels.external_validity as { text: string } | undefined;
  const clusters = panels.clusters as { neighborhoods: number; perArm: number[]; meanUsersPerNeighborhood: number; meanListingsPerNeighborhood: number; iccEstimate: number } | undefined;
  const isListing = phase.startsWith("p3");
  const showDiag = diag && (meta?.aa || opened);

  return (
    <div className="space-y-3">
      {ext && <section className="rounded-2xl border border-warn bg-warn-soft p-4 text-sm"><b className="text-warn">외적 타당성 주의</b><p className="mt-1">{ext.text}</p></section>}

      {diag && !meta?.aa && !opened && (
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-sm">
          <span className="text-ink2">숫자가 이상하다면 플랫폼 로그를 열어볼 수 있어요.</span>
          <Button variant="ghost" onClick={() => setOpened(true)}>조사하기</Button>
        </div>
      )}
      {showDiag && diag && (
        <PanelSection open title="플랫폼 진단" hint="배정과 로그를 확인하는 데이터예요. 설치 코호트별 사용자 수와, 양쪽 그룹에 동시에 존재하는 사용자를 보여줘요.">
          {diag.cohorts.length > 0 && (
            <table className="mb-3 w-full min-w-[420px] text-sm">
              <thead><tr><th className={thl}>신규 사용자 설치 코호트</th><th className={th}>A</th><th className={th}>B</th></tr></thead>
              <tbody>
                {diag.cohorts.map((c) => (
                  <tr key={c.label} className="border-t border-line tabular-nums">
                    <td className="px-2 py-2 font-medium">{c.label}</td><td className="px-2 py-2 text-right">{fmtInt(c.A)}</td><td className="px-2 py-2 text-right">{fmtInt(c.B)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="text-sm">
            양쪽 그룹에 동시에 존재하는 사용자: <b className="tabular-nums">{fmtInt(diag.bothGroups.users)}명</b> ({fmtPct(diag.bothGroups.share, 1)}) · 배정 비율 검정 p <b className="tabular-nums">{fmtP(diag.srmP)}</b>
          </p>
        </PanelSection>
      )}

      {source && (
        <PanelSection open title="데이터 소스 비교: 서버 DB vs 클라이언트 이벤트" hint="같은 사용자를 두 가지 기록으로 센 작성률이에요.">
          <table className="w-full min-w-[420px] text-sm">
            <thead><tr><th className={thl}>그룹</th><th className={th}>서버 DB</th><th className={th}>클라이언트 이벤트</th><th className={th}>차이</th></tr></thead>
            <tbody>
              {source.rows.map((r) => (
                <tr key={r.arm} className="border-t border-line tabular-nums">
                  <td className="px-2 py-2 font-medium">{r.arm}</td>
                  <td className="px-2 py-2 text-right">{fmtPct(r.server / r.n, 2)}</td>
                  <td className="px-2 py-2 text-right">{fmtPct(r.client / r.n, 2)}</td>
                  <td className="px-2 py-2 text-right">{fmtDiff(P, (r.client - r.server) / r.n)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelSection>
      )}

      {segments && (
        <PanelSection title="세그먼트별 결과" hint="신규/기존 사용자와 OS·SDK 로 나눈 작성률이에요.">
          <div className="space-y-4">
            <SegTable title="신규 / 기존" rows={segments.byType} labels={TYPE_LABEL} />
            <SegTable title="OS · SDK" rows={segments.bySdk} labels={SDK_LABEL} />
          </div>
        </PanelSection>
      )}

      {salt && (
        <PanelSection title="지난 거래후기 실험의 배정 × 이번 배정" hint="행은 지난 실험의 그룹, 열은 이번 실험의 그룹이에요. 사용자 수예요.">
          <table className="w-full min-w-[360px] text-sm">
            <thead><tr><th className={thl}>지난 실험</th><th className={th}>이번 A</th><th className={th}>이번 B</th></tr></thead>
            <tbody>
              {salt.rows.map((r) => (
                <tr key={r.prev} className="border-t border-line tabular-nums">
                  <td className="px-2 py-2 font-medium">지난 {r.prev}</td><td className="px-2 py-2 text-right">{fmtInt(r.A)}</td><td className="px-2 py-2 text-right">{fmtInt(r.B)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </PanelSection>
      )}

      {clusters && (
        <PanelSection open title="동네(클러스터) 배정 정보" hint="그룹당 동네 수와 동네 안의 규모, 같은 동네 안 상관(ICC)의 추정값이에요.">
          <p className="text-sm tabular-nums">
            전체 {fmtInt(clusters.neighborhoods)}개 동네 · A {fmtInt(clusters.perArm[0])}개 / B {fmtInt(clusters.perArm[1])}개 · 그룹당 동네 평균 검색 사용자 {fmtInt(clusters.meanUsersPerNeighborhood)}명, 신규 게시글 {fmtInt(clusters.meanListingsPerNeighborhood)}건 · Primary 지표의 ICC 추정 {clusters.iccEstimate.toFixed(3)}
          </p>
        </PanelSection>
      )}

      {isListing && (
        <PanelSection open title="사용자 의견 (정성)" hint="숫자로는 알 수 없는 맥락이에요. 결정에 어떻게 반영할지 생각해 보세요.">
          <ul className="space-y-1.5 text-sm">
            {OPINIONS.map((o) => (
              <li key={o.text} className="flex items-start gap-2">
                <Badge tone={o.tone === "good" ? "done" : "warn"}>{o.tone === "good" ? "긍정" : "아쉬움"}</Badge>
                <span>{o.text}</span>
              </li>
            ))}
          </ul>
        </PanelSection>
      )}
    </div>
  );
}
