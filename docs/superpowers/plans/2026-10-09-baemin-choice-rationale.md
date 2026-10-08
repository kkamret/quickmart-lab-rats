# 배민 선택지 근거("왜 이 선택지?") Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배민 실습에서 학생에게 보이는 모든 선택(입력란 목적, select·multiselect·boolean 보기, 결정 보기, 실행 버튼)에 승인된 "왜 이 선택지?" 한 줄을, Phase(와 s7·s8)마다 다리 문장을 근거 챕터 배지(`Ch1`~`Ch5` 또는 `사례`)와 함께 보여 준다.

**Architecture:** 승인된 문장을 새 파일 `lib/cases/baemin/why.ts` 한 곳에 모으고, `attachWhy`·`attachDecisionWhy`·`attachPhaseIntro`가 `formMeta`·`decisions`·`phases`의 **사본**에 붙여 `baeminClient`로 내보낸다(원본 `formMeta.ts`·`decisions.ts`는 그대로). 타입은 모두 선택 필드라 다른 사례는 바뀌지 않는다. 공통 컴포넌트(`WhyLine`, `PhaseIntro`, AutoForm 접이식 보기 목록, StepView, TeamScreen)는 why 데이터가 있을 때만 그린다.

**Tech Stack:** Next.js 15, React 19, TypeScript strict, Tailwind v4, Vitest(node 환경, DOM 테스트 없음). 설계 문서: `docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md`(승인본, 이하 "설계").

**작업 브랜치:** `feat/baemin-choice-rationale` (`feat/baemin-theory-logic` 위). 푸시·PR·머지는 사용자가 말할 때만 한다. 커밋은 태스크마다 한다.

**전체 규칙**
- 테스트 실행: `npx vitest run <경로>`, 전체는 `npx vitest run`. 타입: `npx tsc --noEmit`. 린트: `npm run lint`. 빌드: `npm run build`.
- 커밋 메시지 끝에 항상 빈 줄 다음 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` 줄을 둔다.
- **문장을 새로 만들지 않는다.** `why.ts`·`lab-why.ts`의 모든 문장은 설계 2.2·3장 표의 "제안 한 줄"/"다리 문장 초안"을 글자 그대로 옮긴 것이다. 설계에서 `(줄 없음)`·`(넣지 않음)`인 자리는 코드에 두지 않는다. 문구를 바꾸고 싶으면 멈추고 사용자에게 묻는다.
- 근거 표시는 챕터만: `src`에는 `1`~`5` 또는 `"case"`만 둔다. 슬라이드 제목·위키 편·원문 조각을 코드·주석에 두지 않는다.
- 기존 맥락 문구 4개(`scope.os=all` desc, `coupon_ops` low·high desc, `rationale` help)는 고치지 않는다(설계 0장 4).
- 숨긴 효과 숫자·플래그 이름·함정 이름을 새 문장에 넣지 않는다(s7 다리 문장·TrapLab 줄만 면제).
- 기대값이 틀려 테스트가 실패하면 기대값을 몰래 고치지 말고 실패 출력을 사용자에게 보고한다.

---

## 설계와의 정합 메모 (계획에서 정한 해석)

설계 문서 안에서 서로 맞지 않거나 비어 있는 곳을 아래처럼 정했다. 구현자는 이 해석을 따른다.

| # | 설계의 자리 | 문제 | 이 계획의 해석 |
|---|---|---|---|
| R1 | 2.2 p1 다리 문장 ①~④, 4.1 `PhaseIntro` 주석 "2~3줄", 6.1 "Phase당 3줄 이하" | P1 설계는 사용자 결정으로 ④가 추가돼 4줄이다 | 줄 수 한도는 3, 예외로 `p1`만 4(테스트 `LIMIT_EXCEPTIONS = { p1: 4 }`) |
| R2 | 3.7 R3 "p2·p3·p4 readout '결과 보기'" vs 6.1 "readout Phase는 main의 ACTION_WHY" | `p1_readout`도 readout Phase이고 같은 "결과 보기" 버튼이 있다 | 승인된 R3 문장을 `p1_readout`에도 같이 쓴다(새 문장 없음) |
| R3 | 3.6 X8 "X1과 같은 문장", 3.8 L9 "L8과 같아요." | 문장 대신 참조로 적혀 있다 | 참조한 문장을 상수로 공유한다(`DEPLOY_WHY`, `SRM_COUNT_WHY`) |
| R4 | 1.3-6·4.1 `PhaseIntro.theory`, 6.4 개념 라벨 테스트 | 2.2 표 어디에도 개념 키가 지정돼 있지 않다 | `theory`는 비워 둔다(새 내용을 만들지 않음). 렌더러와 라벨 도우미 `introTheoryLabel`은 구현·단위 테스트한다 |
| R5 | 6.3 "PHASE_INTRO.theory에 revealOnly 없음" vs 6.4 "revealOnly면 theoryChapterOnly로" | 데이터에서 금지하면 6.4 분기는 데이터로 닿지 않는다 | 둘 다 구현: 데이터는 금지(why.test), 렌더러는 방어적으로 챕터만(theory.test에서 도우미 직접 검사) |
| R6 | 6.3 기존 맥락 문구 허용 목록 | 네 문구 모두 자동 금지어 검사에 걸리지 않는다 | 허용 목록을 "정확히 이 4개 + 모두 formMeta에 그대로 남아 있음" 스냅샷으로 고정하고, 나머지 기존 문구는 같은 검사를 돌린다 |
| R7 | 6.3 숨긴 효과 숫자 "…등" | 목록이 열려 있다 | §2·§3-2 숫자로 고정. `1.5`(§3-1b 공개 협의 MDE, Primary help에 나옴)와 문장에 흔한 작은 정수(`2.2`, `2.3`, `14`, `0.5`)는 제외. "약 18%"(§1 기준값)는 허용 |
| R8 | 4.3 `WhyLine` "본문(`text-xs text-ink2`)" | 결정 보기는 `<label>` 안이라 `<p>`를 넣으면 잘못된 중첩 | `WhyLine`은 `<span className="block …">`으로 그린다 |
| R9 | 4.1 "ClientCase에 stepIntro 추가" | `ClientCase = Omit<CasePlugin, …>`라 따로 더할 자리가 없다 | `CasePlugin`에 선택 필드로 두어 `ClientCase`가 물려받는다(서버 플러그인은 `baeminClient`를 펼쳐 쓴다) |
| R10 | 6.4 "WhyLine 배지는 Ch/사례만", 6.5 "why 없으면 같은 DOM" | Vitest가 node 환경이고 DOM 테스트 도구가 없다 | 배지 문자열·툴팁은 순수 함수 `whyBadge`·`whyBadgeTitle`로 빼서 테스트하고, DOM 동일성은 조건부 렌더링 + 브라우저 확인(Task 9)으로 본다 |
| R11 | 5장 S-1·S-2 | 고칠 방향만 있고 바꿀 문장이 없다 | 설계에 이미 있는 문구만 이어 붙인다(S-2: 5장 S-2의 "우연으로 보기 어려운 차이면 결과 해석을 멈추고 원인을 찾는다", S-1: 승인된 s8 문장의 "다음 실험의 재료"). Task 8은 선택 태스크이고 PR 리뷰에서 이 두 문장을 따로 확인받는다 |
| R12 | 4.4 2단계 "TrapLab·ShareStep 안 문장" | 컴포넌트 안에 문자열을 두면 길이·출처 검사를 할 수 없다 | 문장은 `lib/lab/lab-why.ts`에 두고 두 컴포넌트가 가져다 쓴다 |

---

## 파일 구조

| 파일 | 변경 | 책임 |
|---|---|---|
| `lib/cases/baemin/__tests__/why.test.ts` | 신규 | 커버리지·근거 표시·스포일러·허용 목록 검사 |
| `lib/__tests__/theory.test.ts` | 수정 | note 검사 입력 확장, 다리 문장 개념 라벨, 근거 배지 |
| `lib/cases/types.ts` | 수정(전체 교체) | `Why`, `PhaseIntro`, `StepIntroKey`, `FieldMeta.why`, `FieldOption.why`, `DecisionOption.why`, `DecisionDef.rationaleWhy`, `PhaseDef.intro/actionWhy`, `CasePlugin.stepIntro` |
| `lib/theory.ts` | 수정 | `introTheoryLabel`, `whyBadge`, `whyBadgeTitle`, `CASE_BADGE_TITLE` |
| `lib/cases/baemin/why.ts` | 신규 | 승인 문장 전부 + `attachWhy`·`attachDecisionWhy`·`attachPhaseIntro` |
| `lib/cases/baemin/ui.ts` | 수정 | `baeminClient`에 붙이기 |
| `components/ui.tsx` | 수정 | `WhyLine`, `PhaseIntro` 컴포넌트 |
| `components/form/AutoForm.tsx` | 수정(전체 교체) | 입력란 "왜 묻나요" 줄, 접이식 보기 목록, boolean 보기 라벨 |
| `components/StepView.tsx` | 수정 | Phase 다리 문장, 실행 버튼 줄, 결정 보기·결정 근거 줄 |
| `components/TeamScreen.tsx` | 수정 | s7·s8 다리 문장 |
| `lib/lab/lab-why.ts` | 신규(Task 8, 선택) | s7 L1~L10, s8 S1·S2 문장 |
| `lib/lab/__tests__/lab-why.test.ts` | 신규(Task 8, 선택) | s7·s8 줄과 S-1·S-2 정리 검사 |
| `components/lab/TrapLab.tsx`, `components/lab/ShareStep.tsx` | 수정(Task 8, 선택) | 줄 표시, 근거 없는 기존 문구 정리 |
| `docs/sim-core.md` | 수정 | §5 플러그인 인터페이스에 선택 필드 반영 |

`formMeta.ts`, `decisions.ts`, `defaults.ts`, `lib/cases/client-registry.ts`는 바꾸지 않는다(설계 4.2: 원본 desc·help 유지, 붙이기는 `ui.ts`에서만).

---

### Task 0: 시작 상태 확인

**Files:** 없음

- [ ] **Step 1: 브랜치·작업 트리 확인**

Run: `git branch --show-current && git status --short`
Expected: `feat/baemin-choice-rationale` 한 줄, 변경 목록은 비어 있다. 다른 변경이 보이면 멈추고 사용자에게 보고한다.

- [ ] **Step 2: 기준 테스트 수 확인**

Run: `npx vitest run`
Expected: 마지막 줄 근처에 `Test Files  23 passed (23)`, `Tests  298 passed (298)`.

---

### Task 1: 실패하는 테스트 먼저 (why.test.ts + theory.test.ts 확장)

설계 6.1~6.4를 `why.ts`의 모양(설계 4.2)에 맞춰 먼저 쓴다. `why.ts`가 없어 실패해야 한다.

**Files:**
- Create: `lib/cases/baemin/__tests__/why.test.ts`
- Modify: `lib/__tests__/theory.test.ts:2`, `lib/__tests__/theory.test.ts:98-103`, 파일 끝(131행 뒤)

- [ ] **Step 1: `lib/cases/baemin/__tests__/why.test.ts` 작성 (새 파일, 전체)**

```ts
/**
 * "왜 이 선택지?" 한 줄과 Phase 다리 문장 검사 (설계 문서 docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md 6장).
 * 원문 일치(출처 조각) 테스트는 두지 않는다(설계 0장 3). 문장이 덱·위키에서 나왔는지는 리뷰에서 확인한다.
 */
import { describe, expect, it } from "vitest";
import type { FieldMeta, Why } from "@/lib/cases/types";
import { ALL_FLAGS, FLAG_LABELS } from "@/lib/sim/core/flags";
import { THEORY, type TheoryKey } from "@/lib/theory";
import { decisions } from "../decisions";
import { formMeta } from "../formMeta";
import { METRIC_KEYS } from "../schema";
import { baeminClient, phases } from "../ui";
import {
  ACTION_WHY, DECISION_WHY, FIELD_WHY, FIELD_WHY_BY_PHASE, METRIC_WHY, OPTION_WHY, PHASE_INTRO, RATIONALE_WHY, STEP_INTRO, WHY_NONE,
} from "../why";

const METRIC_FIELDS = new Set(["metrics.primary", "metrics.secondary", "metrics.guardrails"]);
const CHOICE_TYPES = new Set<FieldMeta["type"]>(["select", "multiselect"]);
const allFields = (): { phase: string; f: FieldMeta }[] => Object.entries(formMeta).flatMap(([phase, list]) => list.map((f) => ({ phase, f })));

/** 검사할 문장 하나. label 은 그 문장이 붙는 입력란의 label(개념 이름 허용 판단용). */
type Line = { where: string; why: Why; label?: string };
const labelOf = (name: string) => allFields().find(({ f }) => f.name === name)?.f.label;

/** why.ts 의 모든 문장. exempt=true 는 스포일러 검사 면제(s7 다리 문장). */
function allLines(): (Line & { exempt?: boolean })[] {
  const out: (Line & { exempt?: boolean })[] = [];
  for (const [name, why] of Object.entries(FIELD_WHY)) out.push({ where: `field:${name}`, why, label: labelOf(name) });
  for (const [phase, m] of Object.entries(FIELD_WHY_BY_PHASE)) for (const [name, why] of Object.entries(m ?? {})) out.push({ where: `field:${phase}:${name}`, why, label: labelOf(name) });
  for (const [name, m] of Object.entries(OPTION_WHY)) for (const [v, why] of Object.entries(m)) out.push({ where: `option:${name}:${v}`, why, label: labelOf(name) });
  for (const [k, why] of Object.entries(METRIC_WHY)) out.push({ where: `metric:${k}`, why });
  for (const [phase, m] of Object.entries(DECISION_WHY)) for (const [id, why] of Object.entries(m)) out.push({ where: `decision:${phase}:${id}`, why });
  out.push({ where: "rationale", why: RATIONALE_WHY });
  for (const [phase, m] of Object.entries(ACTION_WHY)) for (const [mode, why] of Object.entries(m)) if (why) out.push({ where: `action:${phase}:${mode}`, why });
  for (const [phase, intro] of Object.entries(PHASE_INTRO)) intro.lines.forEach((why, i) => out.push({ where: `intro:${phase}:${i + 1}`, why }));
  for (const [step, intro] of Object.entries(STEP_INTRO)) intro?.lines.forEach((why, i) => out.push({ where: `step:${step}:${i + 1}`, why, exempt: step === "s7_lab" }));
  return out;
}

describe("커버리지", () => {
  it("formMeta 의 모든 입력란(진단, P1~P4)에 목적 한 줄이 있다", () => {
    for (const { phase, f } of allFields()) {
      const why = (FIELD_WHY_BY_PHASE as Partial<Record<string, Record<string, Why>>>)[phase]?.[f.name] ?? FIELD_WHY[f.name];
      expect(why, `${phase}:${f.name}`).toBeDefined();
    }
  });

  it("select·multiselect 보기는 문장이 있거나 WHY_NONE 에 있고, 둘 다는 아니다", () => {
    for (const { phase, f } of allFields()) {
      if (!CHOICE_TYPES.has(f.type)) continue;
      for (const o of f.options ?? []) {
        const key = `option:${f.name}:${String(o.value)}`;
        const why = METRIC_FIELDS.has(f.name) ? METRIC_WHY[o.value as keyof typeof METRIC_WHY] : OPTION_WHY[f.name]?.[String(o.value)];
        expect(!!why !== WHY_NONE.has(key), `${phase}:${key}`).toBe(true);
      }
    }
  });

  it("boolean 입력란은 예·아니요 문장이 모두 있다", () => {
    const bools = allFields().filter(({ f }) => f.type === "boolean");
    expect(bools.length).toBeGreaterThan(0);
    for (const { f } of bools) {
      expect(OPTION_WHY[f.name]?.true, `${f.name}:true`).toBeDefined();
      expect(OPTION_WHY[f.name]?.false, `${f.name}:false`).toBeDefined();
    }
  });

  it("WHY_NONE 은 사용자가 정한 4개(진단 보기 3, pooled)와 정확히 같다", () => {
    expect([...WHY_NONE].sort()).toEqual(["option:analysis_mode:pooled", "option:causal_claim:no", "option:causal_claim:unsure", "option:causal_claim:yes"]);
  });

  it("지표 11종 모두에 한 줄이 있다", () => {
    expect(Object.keys(METRIC_WHY).sort()).toEqual([...METRIC_KEYS].sort());
  });

  it("결정 보기 12개 모두에 한 줄이 있고 '결정한 근거' 목적 한 줄이 있다", () => {
    let n = 0;
    for (const [phase, def] of Object.entries(decisions)) for (const o of def.options) {
      n++;
      expect((DECISION_WHY as Record<string, Record<string, Why>>)[phase]?.[o.id], `${phase}:${o.id}`).toBeDefined();
    }
    expect(n).toBe(12);
    expect(RATIONALE_WHY.text.length).toBeGreaterThan(0);
  });

  it("모든 Phase 에 다리 문장이 있고, run 은 aa·main, readout 은 main 버튼 줄이 있다", () => {
    for (const p of phases) {
      expect(PHASE_INTRO[p.key]?.lines.length, p.key).toBeGreaterThan(0);
      const a = ACTION_WHY[p.key];
      if (p.kind === "run") { expect(a?.aa, `${p.key}:aa`).toBeDefined(); expect(a?.main, `${p.key}:main`).toBeDefined(); }
      else if (p.kind === "readout") { expect(a?.main, `${p.key}:main`).toBeDefined(); expect(a?.aa, `${p.key}:aa`).toBeUndefined(); }
      else expect(a, p.key).toBeUndefined();
    }
  });

  it("STEP_INTRO 에 s7_lab·s8_share 다리 문장이 있다", () => {
    expect(Object.keys(STEP_INTRO).sort()).toEqual(["s7_lab", "s8_share"]);
    expect(STEP_INTRO.s7_lab?.lines.length).toBeGreaterThan(0);
    expect(STEP_INTRO.s8_share?.lines.length).toBeGreaterThan(0);
  });

  it("반대 방향: why.ts 의 키는 실제 입력란·보기·결정·Phase 에 있다 (오타 방지)", () => {
    const fields = new Map(allFields().map(({ f }) => [f.name, f]));
    for (const name of Object.keys(FIELD_WHY)) expect(fields.has(name), `field:${name}`).toBe(true);
    for (const [phase, m] of Object.entries(FIELD_WHY_BY_PHASE)) {
      expect(Object.keys(formMeta), `phase:${phase}`).toContain(phase);
      for (const name of Object.keys(m ?? {})) expect(formMeta[phase].some((f) => f.name === name), `${phase}:${name}`).toBe(true);
    }
    for (const [name, m] of Object.entries(OPTION_WHY)) {
      const f = fields.get(name);
      expect(f, `option field:${name}`).toBeDefined();
      expect(METRIC_FIELDS.has(name), `metric field in OPTION_WHY:${name}`).toBe(false);
      const values = f!.type === "boolean" ? ["true", "false"] : (f!.options ?? []).map((o) => String(o.value));
      for (const v of Object.keys(m)) expect(values, `option:${name}:${v}`).toContain(v);
    }
    for (const key of WHY_NONE) {
      const [, name, v] = key.split(":");
      expect((fields.get(name)?.options ?? []).map((o) => String(o.value)), key).toContain(v);
    }
    for (const [phase, m] of Object.entries(DECISION_WHY)) {
      const ids = (decisions[phase]?.options ?? []).map((o) => o.id);
      for (const id of Object.keys(m)) expect(ids, `decision:${phase}:${id}`).toContain(id);
    }
    const keys = phases.map((p) => p.key);
    for (const k of Object.keys(PHASE_INTRO)) expect(keys, `intro:${k}`).toContain(k);
    for (const k of Object.keys(ACTION_WHY)) expect(keys, `action:${k}`).toContain(k);
  });

  it("한 줄은 90자 이하, 다리 문장은 Phase 당 3줄 이하(P1 설계만 사용자 결정으로 4줄)", () => {
    for (const l of allLines()) {
      expect(l.why.text.trim().length, l.where).toBeGreaterThan(0);
      expect(l.why.text.length, `${l.where}: ${l.why.text}`).toBeLessThanOrEqual(90);
    }
    const LIMIT_EXCEPTIONS: Record<string, number> = { p1: 4 };
    for (const [k, intro] of Object.entries(PHASE_INTRO)) expect(intro.lines.length, k).toBeLessThanOrEqual(LIMIT_EXCEPTIONS[k] ?? 3);
    for (const [k, intro] of Object.entries(STEP_INTRO)) expect(intro!.lines.length, k).toBeLessThanOrEqual(3);
  });

  it("baeminClient 에 문장이 붙어 있다(formMeta·decisions·phases·stepIntro)", () => {
    for (const [phase, list] of Object.entries(baeminClient.formMeta)) for (const f of list) {
      expect(f.why, `${phase}:${f.name}`).toBeDefined();
      for (const o of f.options ?? []) {
        const key = `option:${f.name}:${String(o.value)}`;
        expect(!!o.why !== WHY_NONE.has(key), `${phase}:${key}`).toBe(true);
      }
    }
    const trig = baeminClient.formMeta.p3.find((f) => f.name === "trigger_logging")!;
    expect(trig.options?.map((o) => [o.value, o.label, !!o.why])).toEqual([[true, "예", true], [false, "아니요", true]]);
    for (const def of Object.values(baeminClient.decisions)) {
      expect(def.rationaleWhy).toEqual(RATIONALE_WHY);
      for (const o of def.options) expect(o.why, o.id).toBeDefined();
    }
    for (const p of baeminClient.phases) expect(p.intro, p.key).toEqual(PHASE_INTRO[p.key]);
    expect(baeminClient.stepIntro).toEqual(STEP_INTRO);
  });

  it("원본 formMeta·decisions·phases 는 바꾸지 않는다(기존 desc·help 유지)", () => {
    for (const list of Object.values(formMeta)) for (const f of list) {
      expect(f.why, f.name).toBeUndefined();
      for (const o of f.options ?? []) expect(o.why, `${f.name}:${String(o.value)}`).toBeUndefined();
    }
    for (const def of Object.values(decisions)) for (const o of def.options) expect((o as { why?: Why }).why, o.id).toBeUndefined();
    for (const p of phases) expect(p.intro, p.key).toBeUndefined();
  });
});

describe("근거 표시(챕터만)", () => {
  it("모든 src 는 1~5 또는 'case' 다", () => {
    for (const l of allLines()) expect([1, 2, 3, 4, 5, "case"], l.where).toContain(l.why.src);
  });
  it("앱 문장에 출처 표기(덱·위키·슬라이드 등)가 섞이지 않는다", () => {
    const SOURCE_MARKERS = ["덱", "위키", "슬라이드", "편", "「", "」", "docs/", "§"];
    for (const l of allLines()) for (const m of SOURCE_MARKERS) expect(l.why.text.includes(m), `${l.where}: ${m}`).toBe(false);
  });
});

// ── 스포일러 ──
const REVEAL_ONLY = (Object.keys(THEORY) as TheoryKey[]).filter((k) => "revealOnly" in THEORY[k]);
const TRAP_KEYS: TheoryKey[] = ["interference", "interference_fix", "peeking", "srm", "simpson"];
const TRAP_NAMES = ["SRM", "Sample Ratio", "표본 비율", "심슨", "Simpson", "생존", "Survivorship", "선택 편향", "Selection Bias", "신규성", "신기효과", "Novelty", "Primacy", "초두", "이월", "Peeking", "피킹", "위양성", "ITT", "트리거 분석"];
const HINT_WORDS = ["정답", "오답", "틀린", "틀려", "잘못", "올바른", "옳은", "권장", "피하세요", "하면 안", "좋은 선택", "나쁜 선택"];
/** 사례 문서 §2(숨긴 효과)·§3-2(반영 규칙)의 숫자. §3-1b 협의 MDE(1.5 등)와 §1 기준값은 공개 값이라 넣지 않는다. */
const HIDDEN_NUMBERS = ["0.025", "−0.025", "-0.025", "0.036", "0.024", "0.018", "0.246", "0.066", "0.0002", "0.023", "0.04", "0.50", "0.55", "0.30", "29,400", "9,190", "24%", "4.1%", "6.1%", "4.9%", "0.9%", "0.2%", "2.0%", "18%"];
/** §1 기준값 표기 "약 18%"(최소주문금액 근처 주문 비중)는 공개 값이라 허용한다. */
const PUBLIC_NUMBER_PHRASES = ["약 18%"];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function spoilers(text: string, label = ""): string[] {
  const hits: string[] = [];
  for (const code of ALL_FLAGS) if (new RegExp(`\\b${code}\\b`).test(text)) hits.push(`flag:${code}`);
  for (const lab of Object.values(FLAG_LABELS)) if (text.includes(lab)) hits.push(`flagLabel:${lab}`);
  const scrubbed = PUBLIC_NUMBER_PHRASES.reduce((t, p) => t.replaceAll(p, ""), text);
  for (const n of HIDDEN_NUMBERS) if (new RegExp(`(?<![\\d.,])${esc(n)}(?!\\d)`).test(scrubbed)) hits.push(`number:${n}`);
  for (const k of REVEAL_ONLY) if (text.includes(THEORY[k].title) && !label.includes(THEORY[k].title)) hits.push(`revealOnly:${k}`);
  for (const t of TRAP_NAMES) if (text.includes(t)) hits.push(`trap:${t}`);
  for (const h of HINT_WORDS) if (text.includes(h)) hits.push(`hint:${h}`);
  return hits;
}

/** 0장 4: 학생에게 필요한 맥락이라 그대로 두는 기존 문구. 새 문구가 슬쩍 끼지 않게 정확히 이 4개로 고정한다. */
const ALLOWED_EXISTING_HINTS = [
  "desc:scope.os:all:iOS 구버전 사용자가 포함돼요.",
  "desc:coupon_ops:low:문구 노출 조건을 채우는 사용자가 적어요.",
  "desc:coupon_ops:high:노출 대상이 늘지만 쿠폰 비용이 들어요.",
  "help:rationale:다른 설명(교란)이 가능한지 적어보세요.",
] as const;

function existingTexts(): { key: string; text: string; label: string }[] {
  const out: { key: string; text: string; label: string }[] = [];
  for (const { f } of allFields()) {
    out.push({ key: `label:${f.name}:${f.label}`, text: f.label, label: f.label });
    if (f.help) out.push({ key: `help:${f.name}:${f.help}`, text: f.help, label: f.label });
    for (const o of f.options ?? []) {
      out.push({ key: `optlabel:${f.name}:${String(o.value)}:${o.label}`, text: o.label, label: f.label });
      if (o.desc) out.push({ key: `desc:${f.name}:${String(o.value)}:${o.desc}`, text: o.desc, label: f.label });
    }
  }
  return out;
}

describe("스포일러(새 문장)", () => {
  it("새 why 줄·다리 문장에 플래그·숨긴 효과 숫자·revealOnly 개념 이름·함정 이름·정오 힌트가 없다(s7 면제)", () => {
    for (const l of allLines()) {
      if (l.exempt) continue;
      expect(spoilers(l.why.text, l.label), `${l.where}: ${l.why.text}`).toEqual([]);
    }
  });
  it("검사기는 금지어를 실제로 잡는다", () => {
    expect(spoilers("SRM이 보이면")).toContain("flag:SRM");
    expect(spoilers("효과는 24%예요")).toContain("number:24%");
    expect(spoilers("대조군 기준 약 18%예요")).toEqual([]);
    expect(spoilers("기준 18%로 늘어요")).toContain("number:18%");
    expect(spoilers("이건 정답이에요")).toContain("hint:정답");
    expect(spoilers("다중검정을 보정해요")).toContain("revealOnly:multiple_testing");
    expect(spoilers("다중검정을 보정해요", "다중검정 보정")).toEqual([]);
  });
  it("Phase·스텝 다리 문장의 개념 라벨에 revealOnly·함정 개념이 없다(s7 면제)", () => {
    for (const [k, intro] of Object.entries(PHASE_INTRO)) for (const t of intro.theory ?? []) {
      expect(REVEAL_ONLY, `${k}:${t}`).not.toContain(t);
      expect(TRAP_KEYS, `${k}:${t}`).not.toContain(t);
    }
    for (const [k, intro] of Object.entries(STEP_INTRO)) {
      if (k === "s7_lab") continue;
      for (const t of intro?.theory ?? []) {
        expect(REVEAL_ONLY, `${k}:${t}`).not.toContain(t);
        expect(TRAP_KEYS, `${k}:${t}`).not.toContain(t);
      }
    }
  });
});

describe("스포일러(기존 formMeta 문구, 허용 목록)", () => {
  it("허용 목록은 정확히 4개이고, 모두 formMeta 에 그대로 남아 있다", () => {
    expect(ALLOWED_EXISTING_HINTS).toHaveLength(4);
    const keys = new Set(existingTexts().map((t) => t.key));
    for (const k of ALLOWED_EXISTING_HINTS) expect(keys.has(k), k).toBe(true);
  });
  it("허용 목록 밖의 기존 label·help·desc 에도 같은 금지어가 없다", () => {
    const allowed = new Set<string>(ALLOWED_EXISTING_HINTS);
    for (const t of existingTexts()) {
      if (allowed.has(t.key)) continue;
      expect(spoilers(t.text, t.label), t.key).toEqual([]);
    }
  });
});
```

- [ ] **Step 2: `lib/__tests__/theory.test.ts` import 줄 교체 (2행)**

old:
```ts
import { FIELD_THEORY, NEUTRAL_BADGE_TITLE, STEP_THEORY, THEORY, TITLED_STEPS, theoryBadge, theoryChapterOnly, theoryLabel, theoryNote, type TheoryKey } from "../theory";
```
new:
```ts
import { CASE_BADGE_TITLE, FIELD_THEORY, NEUTRAL_BADGE_TITLE, STEP_THEORY, THEORY, TITLED_STEPS, introTheoryLabel, theoryBadge, theoryChapterOnly, theoryLabel, theoryNote, whyBadge, whyBadgeTitle, type TheoryKey } from "../theory";
```

- [ ] **Step 3: note 검사의 입력 목록만 넓히기 (98~103행, 테스트 이름·판정은 그대로)**

old:
```ts
    const texts: string[] = [];
    for (const c of CASE_KEYS) for (const list of Object.values(getClientCase(c)!.formMeta)) for (const f of list) {
      texts.push(f.label, f.help ?? "");
      for (const o of f.options ?? []) texts.push(o.label, o.desc ?? "");
    }
```
new:
```ts
    const texts: string[] = [];
    for (const c of CASE_KEYS) {
      const cc = getClientCase(c)!;
      for (const list of Object.values(cc.formMeta)) for (const f of list) {
        texts.push(f.label, f.help ?? "", f.why?.text ?? "");
        for (const o of f.options ?? []) texts.push(o.label, o.desc ?? "", o.why?.text ?? "");
      }
      for (const d of Object.values(cc.decisions)) {
        texts.push(d.rationaleWhy?.text ?? "");
        for (const o of d.options) texts.push(o.why?.text ?? "");
      }
      for (const p of cc.phases) {
        for (const l of p.intro?.lines ?? []) texts.push(l.text);
        for (const a of Object.values(p.actionWhy ?? {})) texts.push(a?.text ?? "");
      }
      for (const s of Object.values(cc.stepIntro ?? {})) for (const l of s?.lines ?? []) texts.push(l.text);
    }
```

- [ ] **Step 4: 파일 끝(마지막 `});` 다음)에 새 describe 추가**

```ts
/** 사례마다 Phase·스텝 다리 문장(stepIntro)을 [위치, intro] 로 모은다 */
function intros() {
  return CASE_KEYS.flatMap((c) => {
    const cc = getClientCase(c)!;
    return [
      ...cc.phases.flatMap((p) => (p.intro ? [{ where: `${c}:${p.key}`, step: p.step as string, intro: p.intro }] : [])),
      ...Object.entries(cc.stepIntro ?? {}).flatMap(([step, intro]) => (intro ? [{ where: `${c}:${step}`, step, intro }] : [])),
    ];
  });
}

describe("선택지 근거 줄과 다리 문장의 이론 표시", () => {
  it("다리 문장의 개념 키는 모두 THEORY 에 있다", () => {
    for (const { where, intro } of intros()) for (const k of intro.theory ?? []) expect(THEORY[k], `${where}:${k}`).toBeDefined();
  });
  it("다리 문장 개념 라벨: revealOnly 개념은 챕터만, 그 밖은 챕터 · 이름", () => {
    expect(introTheoryLabel("hypothesis")).toBe(theoryLabel("hypothesis"));
    expect(introTheoryLabel("trigger")).toMatch(/^Ch\d$/);
    for (const k of REVEAL_ONLY) expect(introTheoryLabel(k), k).toMatch(/^Ch\d$/);
    for (const { where, intro } of intros()) for (const k of intro.theory ?? []) {
      if (REVEAL_ONLY.includes(k)) expect(introTheoryLabel(k), `${where}:${k}`).toMatch(/^Ch\d$/);
      else expect(introTheoryLabel(k), `${where}:${k}`).toBe(theoryLabel(k));
    }
  });
  it("revealOnly 개념은 s7_lab 밖의 다리 문장 개념 라벨에 들어가지 않는다", () => {
    for (const { where, step, intro } of intros()) {
      if (step === "s7_lab") continue;
      for (const k of intro.theory ?? []) expect(REVEAL_ONLY, `${where}:${k}`).not.toContain(k);
    }
  });
  it("근거 배지는 Ch1~Ch5 또는 '사례'만 그리고, 툴팁에 개념 이름이 없다", () => {
    expect(whyBadge(3)).toBe("Ch3");
    expect(whyBadge("case")).toBe("사례");
    expect(whyBadgeTitle(2)).toBe(NEUTRAL_BADGE_TITLE);
    expect(whyBadgeTitle("case")).toBe(CASE_BADGE_TITLE);
    const srcs = new Set<number | string>();
    for (const c of CASE_KEYS) {
      const cc = getClientCase(c)!;
      for (const list of Object.values(cc.formMeta)) for (const f of list) {
        if (f.why) srcs.add(f.why.src);
        for (const o of f.options ?? []) if (o.why) srcs.add(o.why.src);
      }
      for (const d of Object.values(cc.decisions)) {
        if (d.rationaleWhy) srcs.add(d.rationaleWhy.src);
        for (const o of d.options) if (o.why) srcs.add(o.why.src);
      }
      for (const p of cc.phases) {
        for (const l of p.intro?.lines ?? []) srcs.add(l.src);
        for (const a of Object.values(p.actionWhy ?? {})) if (a) srcs.add(a.src);
      }
      for (const s of Object.values(cc.stepIntro ?? {})) for (const l of s?.lines ?? []) srcs.add(l.src);
    }
    expect(srcs.size).toBeGreaterThan(1);
    for (const s of srcs) {
      const badge = whyBadge(s as 1 | 2 | 3 | 4 | 5 | "case");
      expect(badge, String(s)).toMatch(/^(Ch[1-5]|사례)$/);
      for (const k of KEYS) expect(whyBadgeTitle(s as 1 | 2 | 3 | 4 | 5 | "case"), `${s}:${k}`).not.toContain(THEORY[k].title);
    }
  });
});
```

- [ ] **Step 5: 실패 확인**

Run: `npx vitest run lib/cases/baemin/__tests__/why.test.ts lib/__tests__/theory.test.ts`
Expected: FAIL.
- `why.test.ts`: `Failed to resolve import "../why" from "lib/cases/baemin/__tests__/why.test.ts"` (파일 단위 실패)
- `theory.test.ts`: `Tests  2 failed | 19 passed (21)`. 실패 메시지는 `TypeError: introTheoryLabel is not a function`, `TypeError: whyBadge is not a function`.

(`npx tsc --noEmit`은 Task 3이 끝날 때까지 `f.why` 등 없는 속성 때문에 실패한다. 이 태스크에서는 돌리지 않는다.)

- [ ] **Step 6: 커밋**

```bash
git add lib/cases/baemin/__tests__/why.test.ts lib/__tests__/theory.test.ts
git commit -m "test: 배민 선택지 근거 줄 커버리지·근거 표시·스포일러 테스트 먼저 추가

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 타입과 근거 배지·개념 라벨 도우미

**Files:**
- Modify(전체 교체): `lib/cases/types.ts`
- Modify: `lib/theory.ts:78` 뒤
- Test: `lib/__tests__/theory.test.ts`

- [ ] **Step 1: `lib/cases/types.ts` 전체를 아래로 교체**

```ts
/** 사례 플러그인 인터페이스 (docs/sim-core.md §5) */
import type { ZodType } from "zod";
import type { CaseKey } from "../cases";
import type { StepKey } from "../steps";
import type { Readout } from "../sim/core/readout";
import type { TheoryChapter, TheoryKey } from "../theory";

export type PhaseKind = "diagnose" | "design" | "run" | "readout" | "decide";

/** "왜 이 선택지?" 한 줄. src 는 덱 챕터(1~5) 또는 사례 문서("case"). 슬라이드 제목·위키 편·원문 조각은 두지 않는다. */
export type Why = { text: string; src: TheoryChapter | "case" };

/** Phase(또는 s7·s8 스텝) 머리의 다리 문장 */
export type PhaseIntro = {
  /** 다리 문장(보통 2~3줄, P1 설계만 사용자 결정으로 4줄) */
  lines: Why[];
  /** 개념 라벨로 보여 줄 개념(선택). revealOnly 개념이면 챕터만 보여 준다. */
  theory?: TheoryKey[];
};

export type PhaseDef = {
  key: string;
  step: StepKey;
  title: string;
  kind: PhaseKind;
  intro?: PhaseIntro;
  /** 실행 버튼별 한 줄: run 은 aa·main, readout 은 main("결과 보기") */
  actionWhy?: Partial<Record<"aa" | "main", Why>>;
};

/** Phase 가 없어 다리 문장을 사례 정의에 따로 두는 공통 스텝 */
export type StepIntroKey = "s7_lab" | "s8_share";

export type FieldOption = { value: string | number | boolean; label: string; desc?: string; why?: Why };

/** designSchema 와 함께 폼을 자동 렌더링하는 데 쓰는 입력란 메타. 문구는 해요체. */
export type FieldMeta = {
  /** designSchema 안의 점 표기 경로 (예: "scope.os", "metrics.primary") */
  name: string;
  label: string;
  help?: string;
  type: "text" | "textarea" | "number" | "select" | "multiselect" | "boolean";
  /** 입력란 자체가 왜 있는지(목적). help 는 '무엇을 입력하나', why 는 '왜 묻나'. */
  why?: Why;
  /** boolean 도 받을 수 있다: [{ value: true, label: "예", why }, { value: false, label: "아니요", why }] */
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type DecisionOption = { id: string; label: string; desc: string; why?: Why };
/** 결정과 함께 적는 추가 글칸(예: 공지 초안). 필수. */
export type DecisionField = { name: string; label: string; help?: string };
export type DecisionDef = {
  options: DecisionOption[];
  fields?: DecisionField[];
  /** 이 결정 전에 설계가 제출돼 있어야 하는 Phase(기본: 같은 Phase). 설계가 없는 최종 결정은 앞 Phase 를 가리킨다. */
  requires?: string;
  /** '결정한 근거' 글칸의 목적 */
  rationaleWhy?: Why;
};

export interface CasePlugin<D = unknown> {
  key: CaseKey;
  meta: {
    title: string;
    company: string;
    sourceUrl: string;
    sourceTitle: string;
    difficulty: 1 | 2 | 3 | 4;
    concepts: string[];
    /** 이 사례에서 쓰는 이론 개념 (정답 공개 때 "오늘 쓴 개념 ↔ 덱" 표에 쓴다) */
    theory: TheoryKey[];
    /** 실습에서 쓰지만 덱·위키가 설명하지 않는 개념 이름 (정답 공개 뒤 이름만 보여 준다) */
    outsideTheory: string[];
  };
  phases: PhaseDef[];
  designSchema: Record<string, ZodType>;
  formMeta: Record<string, FieldMeta[]>;
  decisions: Record<string, DecisionDef>;
  /** Phase 가 없는 s7·s8 의 다리 문장(선택) */
  stepIntro?: Partial<Record<StepIntroKey, PhaseIntro>>;
  /** 폼의 초기값. prev 는 같은 사례의 앞 Phase 에서 제출한 설계(있으면 이어받는다). */
  defaultDesign(phase: string, prev?: Record<string, unknown>): Record<string, unknown>;
  /** 설계가 유효하지 않으면 SimulationRejected 를 던진다 */
  simulate(phase: string, design: D, ctx: { prior: Record<string, Readout> }): Readout;
  /** 서버 전용: 클라이언트 번들에 넣지 않는다 (정답 공개 전에는 조에게 보여주지 않음) */
  rubric: Record<string, string>;
  reveal: Record<string, string>;
  /** 서버 전용: 조가 고른 결정 옵션을 그 조의 실제 결과(Readout)로 판정한다. 알 수 없는 옵션이면 null. */
  judge?(phase: string, optionId: string, run: { design: Record<string, unknown>; result: Readout }): Judgement | null;
}

/** 클라이언트로 보내도 되는 부분(폼·화면에 필요한 것). 시뮬 엔진, 루브릭, 정답 해설은 제외. */
export type ClientCase = Omit<CasePlugin, "simulate" | "rubric" | "reveal" | "judge">;

/** 결정 옵션의 판정. 근거 문장(reason)은 정답 공개 뒤에만 조에게 보인다. */
export type Verdict = "correct" | "partial" | "wrong";
export type Judgement = { verdict: Verdict; reason: string };

/** 시뮬레이션을 돌릴 수 없는 설계. 메시지는 조 화면에 그대로 보여준다. */
export class SimulationRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationRejected";
  }
}
```

- [ ] **Step 2: `lib/theory.ts`에 도우미 추가 (`theoryLabel` 정의 바로 아래)**

old:
```ts
export const theoryLabel = (k: TheoryKey) => `Ch${THEORY[k].chapter} · ${THEORY[k].title}`;
```
new:
```ts
export const theoryLabel = (k: TheoryKey) => `Ch${THEORY[k].chapter} · ${THEORY[k].title}`;

/** 다리 문장의 개념 라벨: revealOnly 개념은 챕터만("Ch2"), 그 밖은 "Ch2 · 가설 문장 구조" */
export const introTheoryLabel = (k: TheoryKey) => ("revealOnly" in THEORY[k] ? theoryChapterOnly(k) : theoryLabel(k));

/** "왜 이 선택지?" 줄의 근거 배지: 챕터면 "Ch3", 사례 문서면 "사례". 개념 이름은 담지 않는다. */
export const whyBadge = (src: TheoryChapter | "case") => (src === "case" ? "사례" : `Ch${src}`);

/** 사례 근거 배지의 툴팁 */
export const CASE_BADGE_TITLE = "사례 문서";

/** 근거 배지 툴팁: 챕터는 NEUTRAL_BADGE_TITLE, 사례는 CASE_BADGE_TITLE (개념 이름 없음) */
export const whyBadgeTitle = (src: TheoryChapter | "case") => (src === "case" ? CASE_BADGE_TITLE : NEUTRAL_BADGE_TITLE);
```

- [ ] **Step 3: 테스트 실행 (부분 통과 확인)**

Run: `npx vitest run lib/__tests__/theory.test.ts`
Expected: `Tests  1 failed | 20 passed (21)`. 남은 실패는 "근거 배지는 Ch1~Ch5 또는 '사례'만 그리고…"의 `expected 0 to be greater than 1`(아직 어떤 사례에도 why 데이터가 없음). Task 3에서 통과한다.

- [ ] **Step 4: 커밋**

```bash
git add lib/cases/types.ts lib/theory.ts
git commit -m "feat: 선택지 근거(Why)·다리 문장 타입과 근거 배지·개념 라벨 도우미

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 승인 문장 `why.ts`와 `baeminClient` 연결

모든 문장은 설계 표에서 글자 그대로 옮겼다(117개 `w(...)` 호출: 입력란 23, 보기 32, 지표 11, 결정 11(+X8은 X1 공유), 결정 근거 1, Phase 다리 문장 33, 실행 버튼 3(R3 공유), s7·s8 다리 문장 3). `WHY_NONE` 4자리(진단 보기 3, `pooled`)와 설계의 "넣지 않음" 3줄(P2 고객 유형별, P3 trigger 비율, P4 쿠폰 운영)은 넣지 않았다.

**Files:**
- Create: `lib/cases/baemin/why.ts`
- Modify: `lib/cases/baemin/ui.ts:7`, `lib/cases/baemin/ui.ts:44-48`
- Test: `lib/cases/baemin/__tests__/why.test.ts`, `lib/__tests__/theory.test.ts`

- [ ] **Step 1: `lib/cases/baemin/why.ts` 작성 (새 파일, 전체)**

```ts
/**
 * 배민 실습의 "왜 이 선택지?" 한 줄과 Phase 다리 문장.
 * 문장은 설계 문서(docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md) 2.2·3.1~3.7 표에서 승인된 것만 그대로 옮긴다.
 * 새 문장을 만들지 않는다. 근거가 없는 자리는 WHY_NONE 에 둔다.
 * 클라이언트 번들에 들어가므로 숨긴 효과·플래그·루브릭·함정 이름을 담지 않는다(CLAUDE.md 절대 규칙 3).
 */
import type { DecisionDef, FieldMeta, FieldOption, PhaseDef, PhaseIntro, StepIntroKey, Why } from "../types";
import type { MetricKey } from "./schema";

const w = (text: string, src: Why["src"]): Why => ({ text, src });

type SimPhase = "p1" | "p2" | "p3" | "p4";

/** 입력란 목적(3.1 D1·D5, 3.2 C1~C38 입력란 줄, 3.4 P3-1·P3-4, 3.5 P4-1·P4-5). 키는 formMeta 의 name. */
export const FIELD_WHY: Record<string, Why> = {
  causal_claim: w("지금 쌓인 관찰 데이터로 무엇까지 말할 수 있는지 먼저 따져 보는 질문이에요.", 1),
  rationale: w("관찰한 차이를 함께 설명할 수 있는 다른 요인이 있는지 적어 봐요.", 1),
  "hypothesis.action": w("대조군과 다른 점을 핵심 변화 하나로 두어야, 결과 차이가 무엇 때문인지 해석할 수 있어요.", 2),
  "hypothesis.behavior": w("Treatment → 사용자 행동 변화 → 지표 변화로 이어지는 연결을 설명할 수 있어야 해요.", 2),
  "hypothesis.impact": w("어떤 결과가 나오면 가설을 버릴지 정하려면 지표·방향·크기가 필요해요.", 2),
  "scope.os": w("어느 사용자에게서 확인한 결과인지가 정해져요. 다른 사용자에게도 통할지(일반화)와 이어져요.", 1),
  "scope.surface": w("어느 화면에서 확인한 결과인지가 정해져요. 다른 화면에도 통할지와 이어져요.", 1),
  unit: w("무엇 하나를 독립된 관측 대상으로 보고 A/B를 나눌지 정해요.", 2),
  "metrics.primary": w("가설의 핵심 효과를 대표하는 지표예요. 결과를 보기 전에 하나로 정해요.", 2),
  "metrics.secondary": w("Primary가 왜 움직였는지, 또 무엇이 변했는지 보는 지표예요. 가설의 메커니즘에 따라 미리 골라요.", 2),
  "metrics.guardrails": w("개선 대상이 아니라 넘으면 안 되는 선이에요. 이번 Treatment가 부작용을 낼 만한 영역만 둬요.", 2),
  alpha: w("효과가 없는데 배포하는 위험(헛배포)을 얼마까지 허용할지 정해요.", 2),
  power: w("실제 효과가 MDE만큼 있을 때 잡아낼 확률이에요. 좋은 기능을 놓칠 위험(놓친 기회)을 얼마나 줄일지 정해요.", 2),
  duration_days: w("필요한 표본을 모으고, 요일마다 다른 사용자 행동을 한 주기 이상 담을 만큼 돌려요.", 3),
  allocation: w("실험에 넣는 트래픽이 적을수록 같은 표본을 모으는 데 기간이 길어져요.", 2),
  ramp: w("새 화면을 처음부터 모두에게 낼지, 조금씩 늘릴지 정해요. 램프업은 효과를 빨리 찾는 절차가 아니라 위험을 제한하는 절차예요.", 3),
  analysis_mode: w("같은 조건끼리 묶은 층별로 효과를 구해 합치는 분석이 있어서, 결과를 어떻게 합칠지 골라요.", 3),
  stopping: w("결과를 언제, 어떤 규칙으로 확인하고 끝낼지 실험 전에 정해요.", 3),
  count_basis: w("분석에서 누구를 셀지 실험 전에 정해요. 배정(어느 그룹)과 노출(실제로 봤나)은 따로 기록돼요.", 3),
  trigger_logging: w("문구는 조건을 채운 사람에게만 보여서, 누구를 분석할지와 그 조건을 어떻게 기록할지 실험 전에 정해요.", 4),
  coupon_ops: w("문구 노출 조건에 '고허들 쿠폰 보유'가 들어 있어서, 쿠폰 운영 수준을 함께 정해요.", "case"),
  arms: w("실험에서 비교할 변형군(사용자 경험)을 골라요. 대조군 하나에 실험군 여럿이면 A/B/n이에요.", 1),
  correction: w("그룹과 지표가 늘어 검정이 여러 개가 될 때, 유의 기준을 어떻게 다룰지 정해요.", 3),
};

/** 보기별 한 줄. 키는 입력란 name → String(value). 지표 3칸은 METRIC_WHY 를 쓴다. */
export const OPTION_WHY: Record<string, Record<string, Why>> = {
  "scope.os": {
    android: w("일 유입의 약 59%예요. 작은 범위에서 먼저 문제를 확인하고 넓히는 방식이에요.", 3),
    all: w("안드로이드(59%)와 iOS(41%) 사용자가 모두 들어와, 실험 대상이 실제 출시 대상을 닮아요.", 2),
  },
  "scope.surface": {
    store_home: w("탐색 화면 중 약 56%가 가게홈이에요. 범위를 좁혀 작게 시작하는 선택이에요.", 3),
    all: w("탐색 화면 전체를 넣어, 실험 대상이 출시 대상을 닮게 하는 선택이에요.", 2),
  },
  unit: {
    user: w("같은 사람이 실험 내내 같은 화면을 봐요. 일관된 경험이나 재구매 같은 누적 지표가 중요할 때 써요.", 2),
    session: w("방문 한 번마다 그룹을 정해요. 본 변화가 다음 방문에 영향을 주지 않을 때나, 사람을 계속 알아보기 어려울 때 써요.", 2),
    pageview: w("화면을 열 때마다 그룹을 정해요. 응답 속도처럼 요청 하나의 성능을 볼 때 써요.", 2),
  },
  alpha: {
    "0.01": w("헛배포를 더 엄격하게 막아요. 헛배포 비용이 클 때 쓰고, 필요한 표본이 늘어요.", 2),
    "0.05": w("관행으로 많이 쓰는 기준이에요(정해진 규칙은 아니에요).", 2),
    "0.1": w("효과가 있다고 판단하기 쉬워지고, 필요한 표본이 줄어요.", 2),
  },
  power: {
    "0.7": w("효과를 놓칠 가능성을 더 허용하고, 필요한 표본이 줄어요.", 2),
    "0.8": w("관행으로 많이 쓰는 값이에요.", 2),
    "0.9": w("좋은 기능을 놓치는 비용이 클 때 높여요. 필요한 표본이 늘어요.", 2),
  },
  ramp: {
    none: w("처음부터 정한 비율로 노출해요. 같은 전체 표본이면 50:50이 비교 효율이 가장 좋아요.", 2),
    "10_50_100": w("노출을 단계적으로 늘리며, 초기 단계에서 버그·크래시와 가드레일을 먼저 확인하는 방식이에요.", 3),
    "10_week1_50_week2": w("장애 위험이 있을 때 일부(B 10%)에게 먼저 노출하는 방식이에요. 실험군 표본이 천천히 쌓여요.", 2),
  },
  analysis_mode: {
    stratified: w("배정 비율이 같은 기간을 한 층으로 보고, 층별 효과를 구해 합쳐요.", 3),
  },
  stopping: {
    fixed: w("미리 정한 종료 시점에 한 번 최종 검정해요.", 4),
    peek_stop: w("매일 대시보드를 보며 판단하는 실무 상황을 그대로 규칙으로 옮긴 보기예요.", 3),
    sequential: w("중간 확인을 전제로 경계를 미리 설계하고, 경계를 넘으면 멈춰요. 대가로 검정력이 조금 낮아요.", 4),
  },
  count_basis: {
    assignment: w("그룹에 배정된 사용자를 모두 세요. 배정된 사람이 화면에 한 번도 오지 않았을 수도 있어요.", 3),
    exposure: w("화면 로그가 남은 사용자만 세요. 영향받을 수 있는 사람만 분석하면 노이즈가 줄어요.", 3),
  },
  trigger_logging: {
    true: w("A·B 모두에 같은 조건 기록이 남아요.", 3),
    false: w("실험군에서 문구가 실제로 나간 기록만 남아요.", 3),
  },
  coupon_ops: {
    low: w("지금의 쿠폰 운영 그대로 실험해요. 추가 쿠폰 비용이 들지 않아요.", 5),
    high: w("마케팅과 협업해 쿠폰 대상을 넓혀요. 운영 비용이 늘어요.", 5),
  },
  arms: {
    A: w("비교 기준이 되는 기존 버전이자, 문제가 생기면 돌아갈 기본 버전이에요.", 1),
    B: w("부족 금액 추천을 항상 보여 주는 실험군이에요.", "case"),
    C: w("부족 금액이 8천 원 이하일 때만 보여 주는 실험군이에요. B와는 노출 조건 하나만 달라요.", "case"),
  },
  correction: {
    none: w("Primary를 실험 전에 하나로 정하고 나머지 지표의 역할을 나눠 두는 방식이에요.", 3),
    bonferroni: w("α를 검정 개수로 나눠, 하나라도 거짓 양성이 날 확률(FWER)을 막아요. 소수의 중요한 가설에 써요.", 3),
    bh: w("발견 중 거짓 비율(FDR)을 통제해요. 검정력이 더 높아 많은 지표를 탐색할 때 써요.", 3),
  },
};

/** 지표 11종 한 줄(3.3 M1~M11). Primary·Secondary·Guardrail 세 칸에 같이 쓴다. 어느 칸에 넣으라는 말은 하지 않는다. */
export const METRIC_WHY: Record<MetricKey, Why> = {
  abandon: w("장바구니 단계에서 주문 없이 떠난 비율이에요. 대조군 기준 일반 고객 약 63%예요.", 2),
  conv: w("유입부터 주문까지 퍼널 전체의 전환을 재요. 분자(주문한 사용자)와 분모(유입 사용자)가 정해진 지표예요.", 2),
  aov: w("주문 한 건의 평균 금액이에요(대조군 일반 고객 약 25,200원). 보조 지표 예시와 비즈니스 안정성 예시에 모두 나오는 지표예요.", 2),
  gmv: w("유입 사용자 1명당 평균 거래액이에요. 사용자당 값으로 잰 지표예요.", 2),
  near_min_share: w("최소주문금액 바로 위(+2천 원 이내)에서 끝난 주문의 비중이에요. 대조군 기준 일반 고객 약 18%예요.", "case"),
  bar_click: w("바를 누른 비율로, Treatment(바)에 가장 가까운 반응이에요.", 2),
  crash: w("앱이 비정상 종료된 비율로, 제품 안정성을 재는 지표예요. 대조군 기준 약 0.42%예요.", 2),
  load_time: w("화면이 뜨는 데 걸린 시간으로, 제품 안정성을 재는 지표예요.", 2),
  repurchase7: w("주문자 중 7일 안에 다시 주문한 비율로, 장기 가치와 이어지는 지표예요. 대조군 기준 약 21%예요.", 2),
  cs_rate: w("주문 대비 고객 문의 비율이에요. 이 사례는 협의 MDE 1%p를 둔 후보 지표로 재요.", "case"),
  min_reach: w("장바구니 사용자 중 최소주문금액(15,000원)을 채운 비율이에요. 이 사례는 협의 MDE 2%p를 둔 후보 지표로 재요.", "case"),
};

/** Phase 별로 다르게 말해야 할 때만 쓴다(이번 초안에는 없음, 설계 3.0). */
export const FIELD_WHY_BY_PHASE: Partial<Record<SimPhase, Record<string, Why>>> = {};

/** 결정 보기 한 줄(3.6 X1~X12). "어떤 결과일 때 고르는 결정인지"만 말한다. */
const DEPLOY_WHY = w("신뢰구간 전체가 개선 방향이고 크기도 의미 있을 때 고르는 결정이에요. 비용·리스크를 확인하고 단계적으로 내보내요.", 5);
export const DECISION_WHY: Record<SimPhase, Record<string, Why>> = {
  p1: {
    deploy: DEPLOY_WHY,
    no_deploy: w("구간이 0을 포함하지만 좁아, 효과가 있어도 MDE보다 작을 때 아이디어를 접는 결정이에요.", 5),
    extend_rerun: w("구간이 0을 포함하고 넓어 아직 판단할 수 없을 때, 표본·기간을 늘리거나 설계를 고쳐 다시 돌리는 결정이에요.", 5),
  },
  p2: {
    full_deploy: w("넓힌 범위의 결과가 배포 기준을 채울 때 모든 화면·OS에 내보내는 결정이에요. 전체 출시에서는 다른 사용자에게도 통하는지가 중요해요.", 5),
    no_deploy: w("구간이 0을 포함하지만 좁아, 효과가 있어도 MDE보다 작을 때 접는 결정이에요.", 5),
    deploy_followup: w("배포하면서, Secondary·Driver에서 찾은 패턴을 다음 가설로 삼아 실험을 이어가는 결정이에요.", 1),
  },
  p3: {
    rollback: w("효과가 없거나 나빠졌을 때 Treatment를 되돌리는 결정이에요. Feature Flag가 있으면 코드 배포 없이 바로 되돌려요.", 5),
    deploy: DEPLOY_WHY,
    expand_rerun: w("구간이 넓어 아직 판단할 수 없을 때, 설계를 고쳐 다시 확인하는 결정이에요.", 5),
  },
  p4: {
    deploy_b: w("B가 배포 기준(구간 전체가 개선 방향, 크기가 의미 있음)을 채울 때 고르는 결정이에요.", 5),
    deploy_c: w("C가 배포 기준(구간 전체가 개선 방향, 크기가 의미 있음)을 채울 때 고르는 결정이에요.", 5),
    none_learn: w("두 안 모두 배포 기준을 채우지 못할 때 접고, 배운 점을 기록해 다음 실험으로 넘기는 결정이에요.", 5),
  },
};

/** '결정한 근거' 글칸의 목적(3.6 X13) */
export const RATIONALE_WHY: Why = w("효과 크기(구간의 하한까지), 비용, 리스크를 함께 놓고 결정한 이유를 적어요.", 5);

/** Phase 다리 문장(2.2). '넣지 않음' 줄은 두지 않는다. P2·P3 는 s5 한 화면에 함께 보이므로 P2·P3 결과를 말하지 않는다. */
export const PHASE_INTRO: Record<string, PhaseIntro> = {
  diagnose: {
    lines: [
      w("장바구니에 담고도 주문하지 않고 떠나는 사용자가 많고, 최소주문금액은 15,000원이에요.", "case"),
      w("현상을 지표·구간까지 좁혀야 무엇을 바꿀지 보여요. 아래는 문제를 좁히는 관찰 데이터예요.", 2),
      w("이 데이터만으로 \"바를 보여 주면 이탈이 준다\"까지 말할 수 있는지 따져 봐요.", 1),
    ],
  },
  p1: {
    lines: [
      w("진단에서 좁힌 문제를 \"[대상]에게 [Treatment]를 적용하면 [이유] 때문에 [Metric]이 [방향]으로 변할 것\" 한 문장으로 옮겨요.", 2),
      w("폼은 이론의 순서를 따라요: 가설 → 지표 → 대조군·실험군 → 무작위 배정 단위, 그리고 표본·기간.", 1),
      w("지표와 판단 기준은 결과를 보기 전에 적어 둬요.", 2),
      w("무작위로 나누면 측정하지 못한 특성까지 두 그룹에 고르게 퍼져서, 두 그룹의 차이를 처치 효과와 우연으로 설명할 수 있어요.", 1),
    ],
  },
  p1_run: {
    lines: [
      w("본 실험 전에 같은 화면끼리 비교하는 A/A로 배정·노출·로깅·지표 계산이 정상인지 먼저 확인해요.", 3),
      w("α가 5%면 A/A에서도 100번 중 약 5번은 우연히 유의해요. 한 번 유의했다고 고장은 아니에요.", 3),
      w("본 실험은 제출한 기간과 중간 확인 규칙대로 돌아가요.", 1),
    ],
  },
  p1_readout: {
    lines: [
      w("결과를 믿기 전에 실험이 정상적으로 돌았는지부터 봐요.", 5),
      w("Primary로 핵심 가설을, Guardrail로 부작용을, Secondary·Driver로 이유를 읽어요.", 2),
      w("효과 크기 → 신뢰구간 → p-value 순서로 읽어요.", 3),
    ],
  },
  p1_decide: {
    lines: [
      w("'유의하다'에서 멈추지 말고 배포·접기·재실험 중 하나로 닫아요.", 5),
      w("데이터 품질이나 가드레일에 이상이 있으면 해석을 멈추고 원인을 고친 뒤 다시 돌려요.", 5),
      w("같은 '유의하지 않음'도 구간이 좁으면 접고, 넓으면 표본이 부족했던 것이니 다시 실험해요.", 5),
    ],
  },
  p2: {
    lines: [
      w("이번에는 탐색 화면 전체와 모든 OS로 범위를 넓혀 확인해요.", "case"),
      w("처음 효과를 검증할 때는 내적 타당성이, 전체 출시를 정할 때는 외적 타당성이 중요해서 단계적으로 넓혀요.", 1),
    ],
  },
  p2_readout: {
    lines: [
      w("Primary가 움직였다면 Secondary·Driver에서 \"또 무엇이 변했나, 왜 움직였나\"를 함께 봐요.", 2),
      w("읽는 순서는 P1과 같아요(데이터 품질 → 지표 층).", 2),
    ],
  },
  p2_decide: {
    lines: [
      w("적용 여부를 정하고, 필요하면 가설을 고쳐 다음 실험으로 이어가요.", 1),
      w("결과를 보고 찾은 패턴은 탐색적 결과로 구분하고, 다음 실험의 가설로 써요.", 2),
    ],
  },
  p3: {
    lines: [
      w("다음 가설은 Secondary·Driver 지표에서 길어 올려요. 이번엔 혜택을 안내하는 넛지 문구를 실험해요.", 1),
      w("이번 Primary는 커머스 주문전환율로 두고 시작해요(바꿀 수 있어요).", "case"),
      w("문구는 \"고허들 쿠폰 보유 + 최소금액 달성\" 조건을 채운 사람에게만 보여요. 누구를 분석할지 실험 전에 정해요.", 4),
    ],
  },
  p3_readout: {
    lines: [w("유의 여부만 보지 말고 신뢰구간의 폭까지 읽어요.", 3)],
  },
  p3_decide: {
    lines: [
      w("결정 규칙은 P1과 같아요: 구간이 좁으면 접고, 넓으면 다시 실험해요.", 5),
      w("효과 크기·비용·리스크를 함께 놓고 판단해요.", 5),
    ],
  },
  p4: {
    lines: [
      w("B(항상 노출)와 C(부족 금액 8천 원 이하만) 두 안을 대조군 A와 함께 한 실험에서 비교해요.", 1),
      w("실험군이 둘이면 비교가 늘어나니, 판단 규칙을 실험 전에 정해 둬요.", 2),
    ],
  },
  p4_readout: {
    lines: [w("Primary로 판단하고, Secondary·Driver는 이유를 찾는 데 써요.", 2)],
  },
  p4_decide: {
    lines: [
      w("효과 크기·비용·리스크로 B와 C를 각각 판단하고, 둘 다 기준에 못 미치면 접어요.", 5),
      w("실험은 성공·실패 이분법보다 다음 가설의 재료로 봐요.", 5),
    ],
  },
};

/** 실행 버튼 한 줄(3.7 R1~R3). R3 "결과 보기"는 readout Phase 네 곳(P1~P4)에 같이 쓴다. */
const READOUT_WHY = w("제출한 최신 설계로 실험을 돌린 결과를 보여 줘요. 실험이 정상적으로 돌았는지부터 읽어요.", 5);
export const ACTION_WHY: Record<string, Partial<Record<"aa" | "main", Why>>> = {
  p1_run: {
    aa: w("두 그룹에 같은 화면을 보여 줘요. 차이가 없는 상황에서 시스템이 차이를 만들지 않는지 먼저 확인해요.", 3),
    main: w("제출한 설계(기간·중간 확인 규칙)대로 B를 노출하고, 미리 정한 지표를 측정해요.", 1),
  },
  p1_readout: { main: READOUT_WHY },
  p2_readout: { main: READOUT_WHY },
  p3_readout: { main: READOUT_WHY },
  p4_readout: { main: READOUT_WHY },
};

/** Phase 가 없는 s7·s8 의 다리 문장(2.2). s7 은 처음부터 함정 학습이라 스포일러 검사 면제. */
export const STEP_INTRO: Partial<Record<StepIntroKey, PhaseIntro>> = {
  s7_lab: {
    lines: [w("Readout에서 스쳐 지나간 함정을 이름과 함께 직접 돌려 봐요. 증상과 처방을 이어 봐요.", 4)],
  },
  s8_share: {
    lines: [
      w("결정마다 효과 크기 × 비용 × 리스크로 말하고, 배운 점을 다른 사례 조와 나눠요.", 5),
      w("실험 기록을 쌓는 것은 다음 실험의 재료이자 조직의 기억이에요.", 5),
    ],
  },
};

/** 일부러 문장을 두지 않는 자리(사용자 결정 0장 1). 키는 'option:<name>:<value>'. */
export const WHY_NONE: ReadonlySet<string> = new Set([
  "option:causal_claim:yes",
  "option:causal_claim:no",
  "option:causal_claim:unsure",
  "option:analysis_mode:pooled",
]);

const METRIC_FIELDS = new Set(["metrics.primary", "metrics.secondary", "metrics.guardrails"]);
const BOOLEAN_OPTIONS: FieldOption[] = [{ value: true, label: "예" }, { value: false, label: "아니요" }];

/** 보기 한 줄 찾기: 지표 3칸은 METRIC_WHY, 나머지는 OPTION_WHY */
export function optionWhy(field: string, value: FieldOption["value"]): Why | undefined {
  if (METRIC_FIELDS.has(field)) return METRIC_WHY[value as MetricKey];
  return OPTION_WHY[field]?.[String(value)];
}

/** formMeta 에 입력란 목적(why)과 보기 한 줄(options[].why)을 붙인 사본을 만든다. 원본은 바꾸지 않는다. */
export function attachWhy(meta: Record<string, FieldMeta[]>): Record<string, FieldMeta[]> {
  const byPhase = FIELD_WHY_BY_PHASE as Partial<Record<string, Record<string, Why>>>;
  return Object.fromEntries(
    Object.entries(meta).map(([phase, list]) => [
      phase,
      list.map((f): FieldMeta => {
        const why = byPhase[phase]?.[f.name] ?? FIELD_WHY[f.name];
        const base = f.options ?? (f.type === "boolean" && OPTION_WHY[f.name] ? BOOLEAN_OPTIONS : undefined);
        const options = base?.map((o) => {
          const ow = optionWhy(f.name, o.value);
          return ow ? { ...o, why: ow } : { ...o };
        });
        return { ...f, ...(why ? { why } : {}), ...(options ? { options } : {}) };
      }),
    ]),
  );
}

/** 결정 보기 한 줄과 '결정한 근거' 목적을 붙인 사본 */
export function attachDecisionWhy(d: Record<string, DecisionDef>): Record<string, DecisionDef> {
  const byPhase = DECISION_WHY as Partial<Record<string, Record<string, Why>>>;
  return Object.fromEntries(
    Object.entries(d).map(([phase, def]) => [
      phase,
      {
        ...def,
        options: def.options.map((o) => {
          const why = byPhase[phase]?.[o.id];
          return why ? { ...o, why } : { ...o };
        }),
        rationaleWhy: RATIONALE_WHY,
      },
    ]),
  );
}

/** Phase 다리 문장과 실행 버튼 한 줄을 붙인 사본 */
export function attachPhaseIntro(p: PhaseDef[]): PhaseDef[] {
  return p.map((def) => {
    const intro: PhaseIntro | undefined = PHASE_INTRO[def.key];
    const actionWhy = ACTION_WHY[def.key];
    return { ...def, ...(intro ? { intro } : {}), ...(actionWhy ? { actionWhy } : {}) };
  });
}
```

- [ ] **Step 2: `lib/cases/baemin/ui.ts` import 추가**

old:
```ts
import { diagnoseSchema, p1Schema, p2Schema, p3Schema, p4Schema } from "./schema";
```
new:
```ts
import { diagnoseSchema, p1Schema, p2Schema, p3Schema, p4Schema } from "./schema";
import { attachDecisionWhy, attachPhaseIntro, attachWhy, STEP_INTRO } from "./why";
```

- [ ] **Step 3: `baeminClient`에 붙이기 (`phases` 배열 자체는 그대로 export 한다)**

old:
```ts
  phases,
  designSchema: { diagnose: diagnoseSchema, p1: p1Schema, p2: p2Schema, p3: p3Schema, p4: p4Schema },
  formMeta,
  decisions,
  defaultDesign,
```
new:
```ts
  phases: attachPhaseIntro(phases),
  designSchema: { diagnose: diagnoseSchema, p1: p1Schema, p2: p2Schema, p3: p3Schema, p4: p4Schema },
  formMeta: attachWhy(formMeta),
  decisions: attachDecisionWhy(decisions),
  stepIntro: STEP_INTRO,
  defaultDesign,
```

- [ ] **Step 4: 테스트 통과 확인**

Run: `npx vitest run lib/cases/baemin/__tests__/why.test.ts lib/__tests__/theory.test.ts`
Expected: `Test Files  2 passed (2)`, `Tests  40 passed (40)` (why 19 + theory 21).

- [ ] **Step 5: 문장 원문 대조 (설계 문서에 글자 그대로 있는지)**

Node 24의 TypeScript 타입 제거 기능으로 `why.ts`를 바로 읽어 모든 문장을 설계 문서와 대조한다(`ExperimentalWarning`·`Reparsing as ES module` 경고는 무시).

Run:
```bash
node -e "const fs=require('fs');const d=fs.readFileSync('docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md','utf8');import('./lib/cases/baemin/why.ts').then(m=>{const t=new Set();const walk=v=>{if(v&&typeof v==='object'){if(typeof v.text==='string'&&'src' in v)t.add(v.text);else Object.values(v).forEach(walk)}};walk([m.FIELD_WHY,m.OPTION_WHY,m.METRIC_WHY,m.DECISION_WHY,m.RATIONALE_WHY,m.PHASE_INTRO,m.ACTION_WHY,m.STEP_INTRO]);const miss=[...t].filter(x=>!d.includes(x));console.log('texts',t.size,'missing',miss.length);miss.forEach(x=>console.log(x))})"
```
Expected: `texts 117 missing 0`. `missing`이 0이 아니면 출력된 문장을 설계 표와 한 글자씩 대조해 고친다(새 문장을 만들지 않는다).

- [ ] **Step 6: 타입·회귀 확인**

Run: `npx tsc --noEmit && npx vitest run`
Expected: tsc 출력 없음. `Test Files  24 passed (24)`, `Tests  321 passed (321)`.

- [ ] **Step 7: 커밋**

```bash
git add lib/cases/baemin/why.ts lib/cases/baemin/ui.ts
git commit -m "feat: 배민 선택지 근거 한 줄과 Phase 다리 문장(why.ts)을 클라이언트 사례에 연결

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 공통 UI `WhyLine`·`PhaseIntro` (`components/ui.tsx`)

**Files:**
- Modify: `components/ui.tsx:1-2`, `components/ui.tsx:59` 앞

- [ ] **Step 1: import 교체 (1~2행)**

old:
```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { NEUTRAL_BADGE_TITLE, STEP_THEORY, TITLED_STEPS, theoryBadge, theoryLabel, theoryChapterOnly, type TheoryKey } from "@/lib/theory";
```
new:
```tsx
import type { ButtonHTMLAttributes, ReactNode } from "react";
import type { PhaseIntro as PhaseIntroDef, Why } from "@/lib/cases/types";
import { introTheoryLabel, NEUTRAL_BADGE_TITLE, STEP_THEORY, TITLED_STEPS, theoryBadge, theoryLabel, theoryChapterOnly, whyBadge, whyBadgeTitle, type TheoryKey } from "@/lib/theory";
```

- [ ] **Step 2: `TheoryNote` 주석 앞에 두 컴포넌트 추가**

old:
```tsx
/** 스텝 상단 한 줄: "이론 복습: Ch2 · 가설 문장 구조 · …" */
```
new:
```tsx
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
```

- [ ] **Step 3: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 출력 없음(종료 코드 0).

- [ ] **Step 4: 커밋**

```bash
git add components/ui.tsx
git commit -m "feat: WhyLine(근거 배지 한 줄)과 PhaseIntro(다리 문장) 공통 컴포넌트

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: AutoForm — "왜 묻나요" 줄, 접이식 보기 목록, boolean 보기 라벨

배치(설계 4.3): `label → help → why → 입력 → 선택지 설명 목록`. why가 있는 보기가 하나도 없으면 목록을 그리지 않고, `f.options`가 없는 boolean은 지금처럼 예/아니요를 그려 다른 사례 DOM이 그대로다.

**Files:**
- Modify(전체 교체): `components/form/AutoForm.tsx`

- [ ] **Step 1: `components/form/AutoForm.tsx` 전체를 아래로 교체**

```tsx
"use client";
import type { FieldMeta, FieldOption } from "@/lib/cases/types";
import { getPath, setPath } from "@/lib/lab/path";
import { FIELD_THEORY } from "@/lib/theory";
import { inputClass, TheoryBadge, WhyLine } from "../ui";

type Obj = Record<string, unknown>;

/**
 * designSchema + formMeta 로 입력란을 자동 렌더링한다. 사례 전용 로직은 없다.
 * 값은 중첩 객체이고 입력란 이름은 점 표기 경로("metrics.primary").
 */
export function AutoForm({ meta, value, onChange, disabled }: { meta: FieldMeta[]; value: Obj; onChange: (v: Obj) => void; disabled?: boolean }) {
  const set = (name: string, v: unknown) => onChange(setPath(value, name, v));
  return (
    <div className="space-y-4">
      {meta.map((f) => (
        <Field key={f.name} f={f} v={getPath(value, f.name)} set={(v) => set(f.name, v)} disabled={disabled} />
      ))}
    </div>
  );
}

function Field({ f, v, set, disabled }: { f: FieldMeta; v: unknown; set: (v: unknown) => void; disabled?: boolean }) {
  const id = `f-${f.name}`;
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {f.label}
        {FIELD_THEORY[f.name] && <TheoryBadge k={FIELD_THEORY[f.name]} />}
      </label>
      {f.help && <p className="mb-1.5 text-xs text-ink3">{f.help}</p>}
      {f.why && <WhyLine why={f.why} lead="왜 묻나요" className="mb-1.5" />}
      <Control id={id} f={f} v={v} set={set} disabled={disabled} />
      <OptionWhyList f={f} />
    </div>
  );
}

const same = (o: FieldOption, v: unknown) => o.value === v;

const BOOLEAN_OPTIONS: FieldOption[] = [{ label: "예", value: true }, { label: "아니요", value: false }];
/** boolean 은 사례가 options 를 주면 그 라벨을, 없으면 예/아니요를 쓴다 */
const optionsOf = (f: FieldMeta): FieldOption[] => f.options ?? (f.type === "boolean" ? BOOLEAN_OPTIONS : []);

/**
 * 보기마다 "왜 있나요?" 접이식 목록. 고르기 전에 보기를 나란히 비교할 수 있게 label — desc 와 한 줄을 함께 보여 준다.
 * why 가 있는 보기가 하나도 없으면 그리지 않는다(다른 사례 화면은 그대로).
 */
function OptionWhyList({ f }: { f: FieldMeta }) {
  const opts = optionsOf(f);
  if (!opts.some((o) => o.why)) return null;
  return (
    <details className="mt-1.5 rounded-lg border border-line px-3 py-2">
      <summary className="cursor-pointer text-xs font-semibold text-ink2">선택지마다 왜 있나요?</summary>
      <ul className="mt-2 space-y-2">
        {opts.map((o) => (
          <li key={String(o.value)}>
            <span className="block text-xs font-semibold text-ink">
              {o.label}
              {o.desc && <span className="font-normal text-ink3"> — {o.desc}</span>}
            </span>
            {o.why && <WhyLine why={o.why} />}
          </li>
        ))}
      </ul>
    </details>
  );
}

function Control({ id, f, v, set, disabled }: { id: string; f: FieldMeta; v: unknown; set: (v: unknown) => void; disabled?: boolean }) {
  switch (f.type) {
    case "text":
      return <input id={id} className={inputClass} value={(v as string) ?? ""} disabled={disabled} onChange={(e) => set(e.target.value)} />;
    case "textarea":
      return <textarea id={id} rows={2} className={inputClass} value={(v as string) ?? ""} disabled={disabled} onChange={(e) => set(e.target.value)} />;
    case "number":
      return (
        <div className="flex items-center gap-2">
          <input
            id={id} type="number" className={`${inputClass} max-w-40`} min={f.min} max={f.max} step={f.step}
            value={typeof v === "number" ? v : ""} disabled={disabled}
            onChange={(e) => set(e.target.value === "" ? undefined : Number(e.target.value))}
          />
          {f.unit && <span className="text-sm text-ink3">{f.unit}</span>}
        </div>
      );
    case "select": {
      const sel = f.options?.find((o) => same(o, v));
      return (
        <>
          <select
            id={id} className={inputClass} disabled={disabled} value={sel ? String(f.options!.indexOf(sel)) : ""}
            onChange={(e) => set(e.target.value === "" ? undefined : f.options![Number(e.target.value)].value)}
          >
            <option value="">선택해 주세요</option>
            {f.options?.map((o, i) => <option key={String(o.value)} value={i}>{o.label}</option>)}
          </select>
          {sel?.desc && <p className="mt-1 text-xs text-ink3">{sel.desc}</p>}
        </>
      );
    }
    case "boolean":
      return (
        <div role="radiogroup" id={id} className="flex gap-2">
          {optionsOf(f).map((o) => (
            <button
              key={String(o.value)} type="button" role="radio" aria-checked={v === o.value} disabled={disabled} onClick={() => set(o.value)}
              className={`rounded-lg border px-4 py-1.5 text-sm ${v === o.value ? "border-brand bg-brand-soft font-semibold text-ink" : "border-line bg-surface text-ink2 hover:bg-sunk"} disabled:opacity-60`}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
    case "multiselect": {
      const cur = Array.isArray(v) ? (v as unknown[]) : [];
      const toggle = (o: FieldOption) => set(cur.includes(o.value) ? cur.filter((x) => x !== o.value) : [...cur, o.value]);
      return (
        <div id={id} className="flex flex-wrap gap-2">
          {f.options?.map((o) => (
            <label
              key={String(o.value)} title={o.desc}
              className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${cur.includes(o.value) ? "border-brand bg-brand-soft" : "border-line bg-sunk"} ${disabled ? "opacity-60" : ""}`}
            >
              <input type="checkbox" checked={cur.includes(o.value)} disabled={disabled} onChange={() => toggle(o)} />
              {o.label}
            </label>
          ))}
        </div>
      );
    }
  }
}
```

- [ ] **Step 2: 타입·테스트 확인**

Run: `npx tsc --noEmit && npx vitest run lib/__tests__/theory.test.ts lib/lab`
Expected: tsc 출력 없음, 테스트 모두 통과(실패 0).

- [ ] **Step 3: 커밋**

```bash
git add components/form/AutoForm.tsx
git commit -m "feat: 폼 입력란에 '왜 묻나요' 줄과 보기별 근거 접이식 목록

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: StepView — Phase 다리 문장, 실행 버튼 줄, 결정 줄

**Files:**
- Modify: `components/StepView.tsx:11`, `:52-54`, `:156-172`, `:213`, `:218`

- [ ] **Step 1: import 교체 (11행)**

old:
```tsx
import { Badge, Button, Card, ErrorText, inputClass, TheoryNote } from "./ui";
```
new:
```tsx
import { Badge, Button, Card, ErrorText, inputClass, PhaseIntro, TheoryNote, WhyLine } from "./ui";
```

- [ ] **Step 2: Phase 카드 제목 아래 다리 문장 (52~54행)**

old:
```tsx
            <SavedBadge ctx={ctx} def={def} />
          </div>
          <Phase ctx={ctx} def={def} />
```
new:
```tsx
            <SavedBadge ctx={ctx} def={def} />
          </div>
          <PhaseIntro intro={def.intro} />
          <Phase ctx={ctx} def={def} />
```

- [ ] **Step 3: `RunPhase` 버튼 줄 아래 실행 버튼 한 줄 (171~172행)**

old:
```tsx
          </div>
        )}
      </div>
      {result && "error" in result && <ErrorText>{result.error}</ErrorText>}
```
new:
```tsx
          </div>
        )}
      </div>
      {modes.some((m) => def.actionWhy?.[m]) && (
        <div className="space-y-1">
          {modes.map((m) => {
            const why = def.actionWhy?.[m];
            return why ? <WhyLine key={m} why={why} lead={label(m)} /> : null;
          })}
        </div>
      )}
      {result && "error" in result && <ErrorText>{result.error}</ErrorText>}
```

- [ ] **Step 4: 결정 보기 desc 아래 "왜 이 선택지?" (213행)**

old:
```tsx
            <span><b className="block text-sm">{o.label}</b><span className="text-xs text-ink2">{o.desc}</span></span>
```
new:
```tsx
            <span>
              <b className="block text-sm">{o.label}</b>
              <span className="text-xs text-ink2">{o.desc}</span>
              {o.why && <WhyLine why={o.why} lead="왜 이 선택지?" className="mt-1" />}
            </span>
```

- [ ] **Step 5: '결정한 근거' 라벨 아래 목적 한 줄 (218행)**

old:
```tsx
        <label htmlFor={`rat-${sim}`} className="mb-1 block text-sm font-semibold">결정한 근거</label>
```
new:
```tsx
        <label htmlFor={`rat-${sim}`} className="mb-1 block text-sm font-semibold">결정한 근거</label>
        {def?.rationaleWhy && <WhyLine why={def.rationaleWhy} lead="왜 묻나요" className="mb-1.5" />}
```

- [ ] **Step 6: 타입 확인**

Run: `npx tsc --noEmit`
Expected: 출력 없음.

- [ ] **Step 7: 커밋**

```bash
git add components/StepView.tsx
git commit -m "feat: Phase 다리 문장, 실행 버튼·결정 보기 근거 줄 표시

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: TeamScreen — s7·s8 다리 문장

s7은 사례 확인 전에 그려지므로 `clientCase?.`로 읽는다. 사례에 `stepIntro`가 없으면 `PhaseIntro`가 `null`을 돌려 화면이 그대로다.

**Files:**
- Modify: `components/TeamScreen.tsx:16`, `:97`, `:105-107`

- [ ] **Step 1: import 교체 (16행)**

old:
```tsx
import { Badge, Button, Card, ErrorText } from "./ui";
```
new:
```tsx
import { Badge, Button, Card, ErrorText, PhaseIntro } from "./ui";
```

- [ ] **Step 2: s7 함정 연구소 위 (97행)**

old:
```tsx
                <TrapLab />
```
new:
```tsx
                <PhaseIntro intro={clientCase?.stepIntro?.s7_lab} />
                <TrapLab />
```

- [ ] **Step 3: s8 직소 공유 위 (105~107행)**

old:
```tsx
                {active === "s8_share" ? (
                  <ShareStep code={code} teamId={teamId} teamName={me.name} client={clientCase} status={steps.s8_share ?? "locked"} adapter={adapter} />
                ) : (
```
new:
```tsx
                {active === "s8_share" ? (
                  <>
                    <PhaseIntro intro={clientCase.stepIntro?.s8_share} />
                    <ShareStep code={code} teamId={teamId} teamName={me.name} client={clientCase} status={steps.s8_share ?? "locked"} adapter={adapter} />
                  </>
                ) : (
```

- [ ] **Step 4: 타입·린트 확인**

Run: `npx tsc --noEmit && npx eslint components lib`
Expected: 둘 다 출력 없음.

- [ ] **Step 5: 커밋**

```bash
git add components/TeamScreen.tsx
git commit -m "feat: s7·s8 공통 스텝에 사례별 다리 문장 표시

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8 (선택, 2단계): s7·s8 공통 화면 줄과 근거 없는 기존 문구 정리 (설계 5장 S-1~S-3)

> 설계 4.4에 따라 **별도 PR로 낼 수 있는 2단계**다. 공통 컴포넌트라 토스·당근·넷플릭스 조 화면도 함께 바뀐다. 1단계 PR에 넣지 않기로 하면 이 태스크 전체를 건너뛰고 Task 9로 간다(그때 Task 9의 기대 테스트 수는 1단계 값). 실행 전에 사용자에게 "2단계를 이 PR에 넣을지" 확인한다. S-1·S-2 바꿀 문장(정합 메모 R11)은 PR 설명에 따로 적어 리뷰를 받는다.

**Files:**
- Create: `lib/lab/lab-why.ts`
- Create: `lib/lab/__tests__/lab-why.test.ts`
- Modify: `components/lab/TrapLab.tsx:4-5`, `:33-34`, `:89-90`, `:129`, `:131-133`, `:148-153`
- Modify: `components/lab/ShareStep.tsx:4-5`, `:10`, `:59`, `:63`, `:74`

- [ ] **Step 1: 실패하는 테스트 작성 `lib/lab/__tests__/lab-why.test.ts` (새 파일, 전체)**

```ts
/** s7·s8 공통 화면의 선택지 근거 줄과 근거 없는 기존 문구 정리(설계 문서 3.8·3.9, 5장 S-1~S-3) */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Why } from "@/lib/cases/types";
import { SHARE_WHY, TRAP_LAB_WHY } from "../lab-why";

const trapLines = (): [string, Why][] => [
  ["peekingDays", TRAP_LAB_WHY.peekingDays],
  ...Object.entries(TRAP_LAB_WHY.peekingDayOptions).map(([d, why]): [string, Why] => [`peekingDay:${d}`, why]),
  ["peekingRun", TRAP_LAB_WHY.peekingRun],
  ["simpsonPool", TRAP_LAB_WHY.simpsonPool],
  ["simpsonSplit", TRAP_LAB_WHY.simpsonSplit],
  ["srmA", TRAP_LAB_WHY.srmA],
  ["srmB", TRAP_LAB_WHY.srmB],
  ["srmRatio", TRAP_LAB_WHY.srmRatio],
];
const shareLines = (): [string, Why][] => Object.entries(SHARE_WHY);

describe("s7·s8 선택지 근거 줄", () => {
  it("함정 연구소 입력·보기·버튼 10자리(L1~L10)와 공유 글칸 2자리(S1·S2)에 한 줄이 있다", () => {
    expect(trapLines()).toHaveLength(10);
    expect(Object.keys(TRAP_LAB_WHY.peekingDayOptions).sort()).toEqual(["14", "28", "7"]);
    expect(shareLines()).toHaveLength(2);
  });
  it("근거는 챕터(1~5)만, 한 줄은 90자 이하, 출처 표기가 없다", () => {
    for (const [k, why] of [...trapLines(), ...shareLines()]) {
      expect([1, 2, 3, 4, 5], k).toContain(why.src);
      expect(why.text.length, k).toBeLessThanOrEqual(90);
      for (const m of ["덱", "위키", "슬라이드", "편", "「", "」", "docs/", "§"]) expect(why.text.includes(m), `${k}: ${m}`).toBe(false);
    }
  });
  it("s8 줄에는 함정 이름·정오 힌트가 없다(s7 은 면제)", () => {
    const banned = ["SRM", "심슨", "Peeking", "위양성", "신규성", "정답", "오답", "틀린", "잘못", "올바른", "권장"];
    for (const [k, why] of shareLines()) for (const b of banned) expect(why.text.includes(b), `${k}: ${b}`).toBe(false);
  });
});

describe("근거 없는 기존 문구 정리(S-1, S-2)", () => {
  it("ShareStep 에서 '승률보다 학습률' 주장을 지웠다", () => {
    expect(readFileSync("components/lab/ShareStep.tsx", "utf8")).not.toContain("승률보다 학습률");
  });
  it("TrapLab 에서 'p < 0.001이면 SRM' 임계값 주장을 지웠다", () => {
    expect(readFileSync("components/lab/TrapLab.tsx", "utf8")).not.toContain("0.001이면");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/lab/__tests__/lab-why.test.ts`
Expected: FAIL — `Failed to resolve import "../lab-why" from "lib/lab/__tests__/lab-why.test.ts"`.

- [ ] **Step 3: `lib/lab/lab-why.ts` 작성 (새 파일, 전체. 설계 3.8 L1~L10, 3.9 S1·S2 그대로)**

```ts
/**
 * s7 함정 연구소·s8 직소 공유(공통 화면)의 "왜 이 선택지?" 한 줄.
 * 설계 문서(docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md) 3.8 L1~L10, 3.9 S1·S2 를 그대로 옮긴다.
 * s7 은 처음부터 함정을 이름으로 다루는 스텝이라 스포일러 검사에서 면제한다(작성 규칙은 같다).
 */
import type { Why } from "@/lib/cases/types";

const w = (text: string, src: Why["src"]): Why => ({ text, src });

/** L9 는 설계 표에서 "L8과 같아요"라서 L8 문장을 같이 쓴다 */
const SRM_COUNT_WHY = w("배정 단위(사용자)로 센 고유 사용자 수를 넣어요.", 4);

export const TRAP_LAB_WHY = {
  peekingDays: w("기간이 길수록 매일 확인하는 횟수가 늘어요. 확인 횟수에 따라 '유의'가 얼마나 자주 나오는지 비교해요.", 3),
  peekingDayOptions: {
    7: w("한 주 동안 7번 확인해요.", 3),
    14: w("이론 수업의 시뮬레이션과 같은 14일이에요.", 3),
    28: w("확인 횟수가 가장 많은 설정이에요.", 3),
  } as Record<7 | 14 | 28, Why>,
  peekingRun: w("효과가 전혀 없는 A/A를 여러 번 돌려야 '유의'가 얼마나 자주 나오는지 셀 수 있어요.", 3),
  simpsonPool: w("전체 결과예요. 기간별 결과와 방향이 같은지 비교하려고 둬요.", 4),
  simpsonSplit: w("배정 비율이 다른 기간을 나눠 봐요. 그룹 구성이 다르면 배정 문제의 신호예요.", 4),
  srmA: SRM_COUNT_WHY,
  srmB: SRM_COUNT_WHY,
  srmRatio: w("실험 전에 정한 배정 비율이 기대 비율이 돼요. 관측 비율이 이와 통계적으로 맞는지 봐요.", 4),
};

export const SHARE_WHY = {
  learned: w("결정마다 배운 점을 남기면 다음 실험의 재료가 돼요. 실험 기록이 쌓이면 조직의 기억이 돼요.", 5),
  lesson: w("같은 개념이 다른 회사 사례에서 어떻게 쓰였는지 서로 비교해요.", 5),
};
```

- [ ] **Step 4: `components/lab/TrapLab.tsx` import (4~5행)**

old:
```tsx
import { Button, Card, TheoryBadge, inputClass } from "@/components/ui";
import { peekingExperiment, simpsonRows, srmCheck, type PeekingResult } from "@/lib/lab/trap-lab";
```
new:
```tsx
import { Button, Card, TheoryBadge, WhyLine, inputClass } from "@/components/ui";
import type { Why } from "@/lib/cases/types";
import { TRAP_LAB_WHY } from "@/lib/lab/lab-why";
import { peekingExperiment, simpsonRows, srmCheck, type PeekingResult } from "@/lib/lab/trap-lab";
```

- [ ] **Step 5: Peeking 카드 — 기간·실행 버튼 줄과 기간 보기 목록 (33~34행)**

old:
```tsx
        <Button onClick={() => setRes(peekingExperiment(days))}>A/A 실험 400번 돌리기</Button>
      </div>
```
new:
```tsx
        <Button onClick={() => setRes(peekingExperiment(days))}>A/A 실험 400번 돌리기</Button>
      </div>
      <div className="mt-2 space-y-1">
        <WhyLine why={TRAP_LAB_WHY.peekingDays} lead="실험 기간" />
        <WhyLine why={TRAP_LAB_WHY.peekingRun} lead="A/A 실험 400번 돌리기" />
      </div>
      <details className="mt-1.5 rounded-lg border border-line px-3 py-2">
        <summary className="cursor-pointer text-xs font-semibold text-ink2">선택지마다 왜 있나요?</summary>
        <ul className="mt-2 space-y-1">
          {([7, 14, 28] as const).map((d) => <li key={d}><WhyLine why={TRAP_LAB_WHY.peekingDayOptions[d]} lead={`${d}일`} /></li>)}
        </ul>
      </details>
```

- [ ] **Step 6: 심슨 카드 — 두 버튼 줄 (89~90행)**

old:
```tsx
        <Button variant={view === "split" ? "primary" : "ghost"} onClick={() => setView("split")}>기간별로 보기</Button>
      </div>
```
new:
```tsx
        <Button variant={view === "split" ? "primary" : "ghost"} onClick={() => setView("split")}>기간별로 보기</Button>
      </div>
      <div className="mt-2 space-y-1">
        <WhyLine why={TRAP_LAB_WHY.simpsonPool} lead="전체 기간 합쳐 보기" />
        <WhyLine why={TRAP_LAB_WHY.simpsonSplit} lead="기간별로 보기" />
      </div>
```

- [ ] **Step 7: SRM 카드 설명 — 덱에 없는 임계값 주장 정리(S-2, 129행)**

시뮬레이터·`lib/lab/trap-lab.ts`의 판정 임계값과 그 코드 주석은 건드리지 않는다(설계 5장 S-2).

old:
```tsx
설계한 배정 비율과 실제 사용자 수가 우연 이상으로 다른지 확인해요. 실무에서는 p &lt; 0.001이면 SRM으로 보고 결과 해석을 멈춰요.
```
new:
```tsx
설계한 배정 비율과 실제 사용자 수가 우연 이상으로 다른지 확인해요. 우연으로 보기 어려운 차이면 결과 해석을 멈추고 원인을 찾아요.
```

- [ ] **Step 8: SRM 입력 3칸에 줄 (131~133행)**

old:
```tsx
        <Num label="A그룹 사용자 수" value={a} onChange={setA} />
        <Num label="B그룹 사용자 수" value={b} onChange={setB} />
        <Num label="설계한 A 비율 (%)" value={r} onChange={setR} />
```
new:
```tsx
        <Num label="A그룹 사용자 수" value={a} onChange={setA} why={TRAP_LAB_WHY.srmA} />
        <Num label="B그룹 사용자 수" value={b} onChange={setB} why={TRAP_LAB_WHY.srmB} />
        <Num label="설계한 A 비율 (%)" value={r} onChange={setR} why={TRAP_LAB_WHY.srmRatio} />
```

- [ ] **Step 9: `Num`이 줄을 받게 (148~153행)**

old:
```tsx
function Num({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-ink2">{label}</span>
      <input className={inputClass} type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
```
new:
```tsx
function Num({ label, value, onChange, why }: { label: string; value: string; onChange: (v: string) => void; why?: Why }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-xs font-semibold text-ink2">{label}</span>
      <input className={inputClass} type="number" value={value} onChange={(e) => onChange(e.target.value)} />
      {why && <WhyLine why={why} className="mt-1" />}
    </label>
```

- [ ] **Step 10: `components/lab/ShareStep.tsx` import (4~5행, 10행)**

old:
```tsx
import type { ClientCase } from "@/lib/cases/types";
import type { LabAdapter } from "@/lib/lab/adapter";
```
new:
```tsx
import type { ClientCase } from "@/lib/cases/types";
import type { LabAdapter } from "@/lib/lab/adapter";
import { SHARE_WHY } from "@/lib/lab/lab-why";
```

old:
```tsx
import { Badge, Button, Card, ErrorText, inputClass } from "../ui";
```
new:
```tsx
import { Badge, Button, Card, ErrorText, inputClass, WhyLine } from "../ui";
```

- [ ] **Step 11: 메모 글칸 두 개에 줄 (59행, 63행)**

old:
```tsx
          <span className="mb-1 block text-xs font-semibold text-ink2">오늘 가장 많이 배운 실험과 그 이유</span>
```
new:
```tsx
          <span className="mb-1 block text-xs font-semibold text-ink2">오늘 가장 많이 배운 실험과 그 이유</span>
          <WhyLine why={SHARE_WHY.learned} className="mb-1.5" />
```

old:
```tsx
          <span className="mb-1 block text-xs font-semibold text-ink2">다른 조(다른 사례)에게 전하고 싶은 한 가지</span>
```
new:
```tsx
          <span className="mb-1 block text-xs font-semibold text-ink2">다른 조(다른 사례)에게 전하고 싶은 한 가지</span>
          <WhyLine why={SHARE_WHY.lesson} className="mb-1.5" />
```

- [ ] **Step 12: '생각해 볼 질문' — 덱에 없는 '승률보다 학습률' 정리(S-1, 74행)**

old:
```tsx
오늘 결정한 실험 중 가장 많이 배운 실험은 무엇이었나요? 이론 수업의 &lsquo;승률보다 학습률&rsquo;과 연결해서 이야기해보세요.
```
new:
```tsx
오늘 결정한 실험 중 가장 많이 배운 실험은 무엇이었나요? 실험 기록이 다음 실험의 재료가 된다는 점과 연결해서 이야기해보세요.
```

- [ ] **Step 13: 테스트·타입 확인**

Run: `npx vitest run lib/lab && npx tsc --noEmit`
Expected: `lab-why.test.ts`의 `5 passed` 포함 `lib/lab` 테스트 모두 통과, tsc 출력 없음.

- [ ] **Step 14: 원문 대조**

Run:
```bash
node -e "const fs=require('fs');const d=fs.readFileSync('docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md','utf8');import('./lib/lab/lab-why.ts').then(m=>{const t=new Set();const walk=v=>{if(v&&typeof v==='object'){if(typeof v.text==='string'&&'src' in v)t.add(v.text);else Object.values(v).forEach(walk)}};walk([m.TRAP_LAB_WHY,m.SHARE_WHY]);const miss=[...t].filter(x=>!d.includes(x));console.log('texts',t.size,'missing',miss.length);miss.forEach(x=>console.log(x))})"
```
Expected: `texts 11 missing 0` (L9는 L8 문장을 공유해 12자리에 11문장).

- [ ] **Step 15: 커밋**

```bash
git add lib/lab/lab-why.ts lib/lab/__tests__/lab-why.test.ts components/lab/TrapLab.tsx components/lab/ShareStep.tsx
git commit -m "feat: 함정 연구소·직소 공유에 선택지 근거 줄, 덱에 없는 기존 문구 정리(S-1~S-3)

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 문서 갱신과 전체 검증

**Files:**
- Modify: `docs/sim-core.md` §5 (63행, 66행, 69행, 73행 부근)

- [ ] **Step 1: `docs/sim-core.md` §5 인터페이스에 선택 필드 반영**

old:
```text
  phases: { key: string; step: StepKey; title: string; kind: 'diagnose'|'design'|'run'|'readout'|'decide' }[]
```
new:
```text
  phases: { key: string; step: StepKey; title: string; kind: 'diagnose'|'design'|'run'|'readout'|'decide'
            intro?: PhaseIntro; actionWhy?: { aa?: Why; main?: Why } }[]   // 다리 문장, 실행 버튼 한 줄(선택)
```

old:
```text
  formMeta: Record<string, FieldMeta[]>                   // 라벨, 도움말, 선택지 설명(해요체)
```
new:
```text
  formMeta: Record<string, FieldMeta[]>                   // 라벨, 도움말, 선택지 설명(해요체), why?(입력란 목적)·options[].why?(보기 한 줄)
```

old:
```text
  decisions: Record<string, { options: { id; label; desc }[] }>
```
new:
```text
  decisions: Record<string, { options: { id; label; desc; why? }[]; rationaleWhy? }>
  stepIntro?: { s7_lab?: PhaseIntro; s8_share?: PhaseIntro }   // Phase 가 없는 공통 스텝의 다리 문장(선택)
```

old:
```text
- 폼은 `designSchema + formMeta`로 자동 렌더링(공통 컴포넌트). 사례 전용 시각화는 `components/cases/<case>/`.
```
new:
```text
- 폼은 `designSchema + formMeta`로 자동 렌더링(공통 컴포넌트). 사례 전용 시각화는 `components/cases/<case>/`.
- 선택지 근거: `Why = { text; src: 1~5 | 'case' }`, `PhaseIntro = { lines: Why[]; theory?: TheoryKey[] }`. 화면에는 문장과 챕터(`Ch3`) 또는 `사례` 배지만 보인다. 배민은 `lib/cases/baemin/why.ts`에 승인 문장을 모으고 `ui.ts`에서 붙인다(설계: `docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md`). why 데이터가 없는 사례는 화면이 그대로다.
```

- [ ] **Step 2: 타입 검사**

Run: `npx tsc --noEmit`
Expected: 출력 없음(종료 코드 0).

- [ ] **Step 3: 린트**

Run: `npm run lint`
Expected: `✖ 4 problems (4 errors, 0 warnings)`. 4개 모두 `docs/lecture/build/build.js` 2~5행의 `@typescript-eslint/no-require-imports`(이 작업 전부터 있던 오류). 그 밖의 파일에서 오류·경고가 나오면 고친다.

- [ ] **Step 4: 전체 테스트**

Run: `npx vitest run`
Expected: Task 8을 했으면 `Test Files  25 passed (25)`, `Tests  326 passed (326)`. Task 8을 건너뛰었으면 `Test Files  24 passed (24)`, `Tests  321 passed (321)`.

- [ ] **Step 5: 빌드**

Run: `npm run build`
Expected: `✓ Compiled successfully`, 라우트 표에 `/demo/[case]`, `/c/[code]/t/[teamId]`가 보이고 종료 코드 0.

- [ ] **Step 6: 브라우저 확인 (설계 6.5)**

Run: `npm run dev` (백그라운드) 후 브라우저에서 확인한다. 데모 페이지는 개발 모드에서 항상 열린다.
- `http://localhost:3000/demo/baemin`
  - 진단: 카드 제목 아래 다리 문장 3줄(첫 줄 배지 `사례`, 둘째 `Ch2`, 셋째 `Ch1`). `causal_claim`에 "왜 묻나요" 줄이 있고 "선택지마다 왜 있나요?" 목록은 **없다**(세 보기 모두 줄 없음).
  - 설계: 다리 문장 4줄. 각 입력란에 "왜 묻나요" 줄. "실험 단위" 아래 "선택지마다 왜 있나요?"를 펼치면 사용자·세션·페이지뷰가 `라벨 — desc`와 한 줄(`Ch2`)로 보인다. "분석 방식" 목록에서 "전체 기간을 합쳐서 분석"은 줄 없이 라벨만 보인다.
  - 실행: "A/A 실행"·"본 실험 실행" 머리말이 붙은 줄 두 개.
  - 결과 읽기: "결과 보기" 줄, 결정 보기마다 "왜 이 선택지?" 줄, "결정한 근거" 아래 "왜 묻나요" 줄.
  - 심화: P3 "트리거 조건 로깅" 예·아니요 버튼이 그대로 있고, 목록에 예·아니요 줄(`Ch3`)이 있다.
- `http://localhost:3000/demo/toss`, `/demo/daangn`, `/demo/netflix`: 각 한 화면씩 열어 다리 문장·"왜 묻나요"·"선택지마다 왜 있나요?"가 **없고** 이전과 같은지 본다.
- Task 8을 했으면 `http://localhost:3000/demo/lab`: 기간·실행 버튼 줄, 기간 보기 목록, 심슨 두 버튼 줄, SRM 입력 3칸 줄, 바뀐 SRM 설명 문장.
- s7·s8 다리 문장은 수업 화면(`/c/<code>/t/<teamId>`)에서만 보인다. Supabase 환경이 있으면 배민 조로 s7·s8을 열어 확인하고, 없으면 tsc·빌드 통과로 갈음했다고 PR 설명에 적는다.

- [ ] **Step 7: 커밋**

```bash
git add docs/sim-core.md
git commit -m "docs: 플러그인 인터페이스에 선택지 근거·다리 문장 필드 반영

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

## Self-Review

**1. 설계 커버리지**

| 설계 항목 | 태스크 |
|---|---|
| 0장 1 근거 없으면 줄 없음(`pooled`, 진단 보기 3) | Task 3 `WHY_NONE`, Task 1 테스트 "WHY_NONE 은 … 정확히 같다" |
| 0장 2 사례 고유 지표·§0 설계 사실 | Task 3 `METRIC_WHY.cs_rate/min_reach`, P3·P4·P2 다리 문장(`"case"`) |
| 0장 3 챕터만, 출처 파일·원문 일치 테스트 없음 | Task 2 `Why.src`, Task 1 "근거 표시" describe, 출처 파일 없음 |
| 0장 4 기존 맥락 문구 유지 + 허용 목록 | Task 3(원본 미변경), Task 1 "허용 목록" describe + "원본 … 바꾸지 않는다" |
| 1.1 모든 선택에 한 줄(입력란·보기·결정·진단·실행 버튼) | Task 3 데이터, Task 5(입력란·보기), Task 6(결정·실행 버튼) |
| 1.1 Phase 다리 문장 16개 | Task 3 `PHASE_INTRO` 14 + `STEP_INTRO` 2, Task 6·7 표시 |
| 1.3-3 스포일러 금지 | Task 1 "스포일러(새 문장)" |
| 1.3-6 배지 `Ch`/`사례`, 개념 라벨 `theoryLabel`/`theoryChapterOnly` | Task 2 `whyBadge`·`introTheoryLabel`, Task 4 `WhyLine`·`PhaseIntro` |
| 1.3-7 기존 theory 테스트 확장 | Task 1 Step 3~4 |
| 3.1~3.7 전수 목록 | Task 3 (117개 호출, 원문 대조 Step 5) |
| 3.8·3.9, 5장 S-1~S-3 | Task 8(선택) |
| 4.1 타입 | Task 2 |
| 4.2 `why.ts`, attach 함수, `ui.ts` 연결 | Task 3 |
| 4.3 ui·AutoForm·StepView·TeamScreen | Task 4·5·6·7 |
| 6.1 커버리지(양방향, 길이) | Task 1 "커버리지" describe |
| 6.2 근거 표시 | Task 1 "근거 표시" describe |
| 6.3 스포일러 + 허용 목록 | Task 1 "스포일러" describe 두 개 |
| 6.4 이론 라벨 | Task 1 Step 3~4 |
| 6.5 화면 확인 | Task 9 Step 6 |
| 7장 진행 순서(테스트 먼저 → 타입 → why.ts → 화면 → 확인 → 2단계) | Task 1 → 2 → 3 → 4~7 → 8(선택) → 9 |

빠진 항목 없음. 설계 7장 1(사용자 검토)과 2(별도 PR)는 구현 범위 밖이라 태스크를 두지 않았다(브랜치·PR 규칙은 머리말에 둠).

**2. 플레이스홀더 검사:** 모든 코드 단계에 완성 코드 또는 정확한 old/new 문자열이 있다. "TBD/TODO/나중에/비슷하게" 없음. 문장은 설계에서 그대로 옮겼고 Task 3 Step 5·Task 8 Step 14가 글자 단위로 대조한다.

**3. 타입·이름 일관성:** `Why`, `PhaseIntro`(타입) / `PhaseIntro`(컴포넌트, `ui.tsx`에서 타입은 `PhaseIntroDef`로 별칭), `StepIntroKey`, `FIELD_WHY`, `OPTION_WHY`, `METRIC_WHY`, `FIELD_WHY_BY_PHASE`, `DECISION_WHY`, `RATIONALE_WHY`, `PHASE_INTRO`, `ACTION_WHY`, `STEP_INTRO`, `WHY_NONE`, `attachWhy`, `attachDecisionWhy`, `attachPhaseIntro`, `optionWhy`, `whyBadge`, `whyBadgeTitle`, `CASE_BADGE_TITLE`, `introTheoryLabel`, `WhyLine`, `TRAP_LAB_WHY`, `SHARE_WHY`가 정의한 태스크와 쓰는 태스크에서 같은 이름·시그니처다. 이 계획의 코드는 별도 작업 트리에서 Task 1~9 순서로 적용해 tsc·lint(기존 4개만)·vitest(321 / 2단계 포함 326)·build 통과를 확인했다.

