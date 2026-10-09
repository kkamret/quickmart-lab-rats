import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { PhaseIntro as PhaseIntroDef, Why } from "@/lib/cases/types";
import { introTheoryLabel, NEUTRAL_BADGE_TITLE, STEP_THEORY, TITLED_STEPS, theoryBadge, theoryLabel, theoryChapterOnly, whyBadge, whyBadgeTitle, type TheoryKey } from "@/lib/theory";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl border border-line bg-surface p-5 ${className}`}>{children}</div>;
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "ghost" }) {
  const base = "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed";
  const style =
    variant === "primary"
      ? "bg-brand text-white hover:opacity-90"
      : "border border-line bg-surface text-ink2 hover:bg-sunk";
  return <button className={`${base} ${style} ${className}`} {...props} />;
}

const TONES = {
  draft: "bg-sunk text-ink3 border border-line",
  run: "bg-brand-soft text-brand",
  done: "bg-pos-soft text-pos",
  warn: "bg-warn-soft text-warn",
  bad: "bg-neg-soft text-neg",
} as const;

export function Badge({ tone = "draft", children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${TONES[tone]}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
      {children}
    </span>
  );
}

export const inputClass =
  "w-full rounded-lg border border-line bg-sunk px-3 py-2 text-sm text-ink placeholder:text-ink3";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink2">{label}</span>
      {children}
    </label>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  return children ? <p role="alert" className="mt-2 text-sm text-neg">{children}</p> : null;
}

/** 입력란·경고 옆 회색 소형 배지: "Ch2" */
export function TheoryBadge({ k, reveal = false }: { k: TheoryKey; reveal?: boolean }) {
  return <span title={reveal ? theoryLabel(k) : NEUTRAL_BADGE_TITLE} className="ml-1.5 rounded bg-sunk px-1.5 py-0.5 align-middle text-[10px] font-medium text-ink3">{theoryBadge(k)}</span>;
}

/**
 * "왜 이 선택지?" 한 줄: 본문 뒤에 근거 배지(TheoryBadge 와 같은 모양, "Ch3" 또는 "사례").
 * lead 가 있으면 앞에 굵은 머리말("왜 묻나요" 등). label·span 안에도 들어가도록 block span 으로 그린다.
 */
export function WhyLine({ why, lead, className = "" }: { why: Why; lead?: string; className?: string }) {
  return (
    <span className={`block text-xs text-ink2 ${className}`}>
      {lead && <strong className="mr-1.5 font-semibold">{lead}</strong>}
      {why.text}
      <span title={whyBadgeTitle(why.src)} className="ml-1.5 rounded bg-sunk px-1.5 py-0.5 align-middle text-[10px] font-medium text-ink3">{whyBadge(why.src)}</span>
    </span>
  );
}

/** Phase(또는 s7·s8) 머리의 다리 문장 2~3줄 + (있으면) 개념 라벨 줄. revealOnly 개념은 챕터만 보여 준다. */
export function PhaseIntro({ intro }: { intro?: PhaseIntroDef }) {
  if (!intro?.lines.length) return null;
  return (
    <div className="mb-4 space-y-1 rounded-lg border border-line px-3 py-2">
      {intro.lines.map((l) => <WhyLine key={l.text} why={l} />)}
      {intro.theory?.length ? <span className="block text-xs text-ink3">{intro.theory.map(introTheoryLabel).join(" · ")}</span> : null}
    </div>
  );
}

/** 스텝 상단 한 줄: "이론 복습: Ch2 · 가설 문장 구조 · …" */
export function TheoryNote({ step }: { step: string }) {
  const keys = STEP_THEORY[step];
  if (!keys?.length) return null;
  const titled = TITLED_STEPS.has(step);
  // 개념 이름을 숨기는 스텝은 챕터만 중복 없이 보여 준다
  const chapters = [...new Set(keys.map(theoryChapterOnly))];
  return (
    <p className="rounded-lg bg-sunk px-3 py-2 text-xs text-ink2">
      <strong className="mr-1.5">이론 복습</strong>
      {titled
        ? keys.map((k) => theoryLabel(k)).join(" · ")
        : chapters.join(" · ")}
    </p>
  );
}
