import type { ButtonHTMLAttributes, ReactNode } from "react";
import { NEUTRAL_BADGE_TITLE, STEP_THEORY, TITLED_STEPS, theoryBadge, theoryLabel, theorySlideOnly, wikiHref, type TheoryKey } from "@/lib/theory";

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

/** 입력란·경고 옆 회색 소형 배지: "Ch2·17" */
export function TheoryBadge({ k, reveal = false }: { k: TheoryKey; reveal?: boolean }) {
  return <span title={reveal ? theoryLabel(k) : NEUTRAL_BADGE_TITLE} className="ml-1.5 rounded bg-sunk px-1.5 py-0.5 align-middle text-[10px] font-medium text-ink3">{theoryBadge(k)}</span>;
}

/** 스텝 상단 한 줄: "이론 복습: Ch2 · 가설 문장 구조 (덱 17장) · …". 위키가 있으면 링크. */
export function TheoryNote({ step }: { step: string }) {
  const keys = STEP_THEORY[step];
  if (!keys?.length) return null;
  const titled = TITLED_STEPS.has(step);
  return (
    <p className="rounded-lg bg-sunk px-3 py-2 text-xs text-ink2">
      <strong className="mr-1.5">이론 복습</strong>
      {keys.map((k, i) => {
        const href = titled ? wikiHref(k) : undefined;
        return (
          <span key={k}>
            {i > 0 && " · "}
            {!titled ? theorySlideOnly(k) : href ? <a href={href} target="_blank" rel="noreferrer" className="underline">{theoryLabel(k)}</a> : theoryLabel(k)}
          </span>
        );
      })}
    </p>
  );
}
