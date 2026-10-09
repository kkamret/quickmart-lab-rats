/** 사례 플러그인의 Phase 목록을 스텝 화면에서 다루는 헬퍼 (클라이언트·서버 공용) */
import { z } from "zod";
import type { ClientCase, FieldMeta, PhaseDef } from "../cases/types";
import type { StepKey } from "../steps";

/** 'p1_run', 'p1_readout' 같은 키에서 시뮬레이션·설계 Phase('p1')를 뽑는다. 진단은 'diagnose'. */
export const simPhaseOf = (key: string) => (key === "diagnose" ? "diagnose" : key.slice(0, 2));

export const phaseDef = (c: ClientCase, key: string): PhaseDef | undefined => c.phases.find((p) => p.key === key);

export const stepPhases = (c: ClientCase, step: StepKey): PhaseDef[] => c.phases.filter((p) => p.step === step);

export type SubmissionKind = "design" | "decision" | "note" | "diagnosis";

/** 폼으로 제출하는 Phase 의 DB kind. run/readout 은 제출이 없다. */
export function submissionKindOf(kind: PhaseDef["kind"]): SubmissionKind | null {
  if (kind === "design") return "design";
  if (kind === "diagnose") return "diagnosis";
  if (kind === "decide") return "decision";
  return null;
}

export const decisionSchema = (optionIds: string[], fields: { name: string; label: string }[] = []) =>
  z.object({
    option: z.string().refine((v) => optionIds.includes(v), "선택지 중에서 골라주세요"),
    rationale: z.string().trim().min(1, "근거를 적어주세요"),
    ...Object.fromEntries(fields.map((f) => [f.name, z.string().trim().min(1, `${f.label}을(를) 적어주세요`)])),
  });

export type Submission = { step: string; phase: string; kind: SubmissionKind; payload: Record<string, unknown>; version: number };

/** 같은 (phase, kind)의 최신 제출 */
export function latestOf(subs: Submission[], phase: string, kind: SubmissionKind): Submission | undefined {
  return subs.filter((s) => s.phase === phase && s.kind === kind).sort((a, b) => b.version - a.version)[0];
}

/** 검증에 실패한 입력란 이름(formMeta 의 name). 'metrics.primary' 처럼 더 깊은 경로는 가장 가까운 부모 입력란으로 올려 잡는다. */
export function issueFieldNames(issues: { path: PropertyKey[] }[], meta: FieldMeta[]): string[] {
  const names = new Set<string>();
  for (const i of issues) {
    for (let n = i.path.length; n > 0; n--) {
      const name = i.path.slice(0, n).join(".");
      if (meta.some((m) => m.name === name)) { names.add(name); break; }
    }
  }
  return [...names];
}

/** zod 오류를 폼 라벨 기준의 한국어 문장으로 바꾼다. 직접 쓴 한국어 메시지는 그대로 쓴다. */
export function formatIssues(issues: { path: PropertyKey[]; message: string }[], meta: FieldMeta[]): string[] {
  const label = (path: PropertyKey[]) => {
    const exact = meta.find((m) => m.name === path.join("."));
    if (exact) return exact.label;
    // 'metrics.primary' 처럼 더 깊은 경로가 아니라 부모만 매칭되는 경우
    for (let n = path.length - 1; n > 0; n--) {
      const m = meta.find((f) => f.name === path.slice(0, n).join("."));
      if (m) return m.label;
    }
    return path.join(".");
  };
  const seen = new Set<string>();
  const out: string[] = [];
  for (const i of issues) {
    const hasKorean = /[가-힣]/.test(i.message);
    const text = `${label(i.path)}: ${hasKorean ? i.message : "선택하거나 입력해 주세요"}`;
    if (!seen.has(text)) { seen.add(text); out.push(text); }
  }
  return out;
}
