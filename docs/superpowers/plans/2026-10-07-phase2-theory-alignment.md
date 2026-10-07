# Phase 2 이론 연결 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 실습 앱의 용어·화면·정답 공개를 이론 덱·위키와 이어지게 만든다. 저장 필드와 zod 스키마는 바꾸지 않는다.

**Architecture:** `lib/theory.ts`가 개념 키 → 챕터·슬라이드·위키 표와 헬퍼를 한 곳에서 제공한다. 입력란 배지는 `FIELD_THEORY`(필드명 → 개념 키)로 연결해 4개 사례 `formMeta`를 건드리지 않는다. 라벨 정렬은 문자열 치환이다. 서버 전용 모듈은 import하지 않아 클라이언트 번들에 안전하다.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind v4, Vitest (node 환경, DOM 테스트 없음 → 순수 함수와 구조 테스트 위주).

**Spec:** `docs/superpowers/specs/2026-10-07-phase2-theory-alignment-design.md`

**사전 준비:** `git checkout -b phase2-theory-alignment` 후 시작한다. 시작 전 `git pull` 로 덱·위키 변경을 받고, 슬라이드 번호(Task 1 표)가 덱과 같은지 한 번 더 대조한다. 기준선은 `npm test` 224개 통과다.

---

## 파일 구조

| 파일 | 역할 |
|---|---|
| `lib/theory.ts` (새) | 개념 표, 배지·라벨·위키 링크 헬퍼, `FIELD_THEORY`, `STEP_THEORY`, `TRAP_LAB_THEORY` |
| `lib/__tests__/theory.test.ts` (새) | 표 무결성, 필드·사례 연결 검증 |
| `components/ui.tsx` (수정) | `TheoryBadge`, `TheoryNote` 컴포넌트 추가 |
| `components/form/AutoForm.tsx` (수정) | 라벨 옆 배지 |
| `components/StepView.tsx` (수정) | 스텝 상단 "이론 복습" 줄 |
| `components/lab/TrapLab.tsx` (수정) | 실험 3개 제목 옆 슬라이드 표시 |
| `components/review/RevealCard.tsx` + `components/TeamScreen.tsx` (수정) | "오늘 쓴 개념 ↔ 덱" 표 |
| `lib/cases/types.ts`, `lib/cases/*/ui.ts` (수정) | `meta.theory: TheoryKey[]` |
| `lib/cases/*/formMeta.ts`, `lib/cases/*/schema.ts`, `components/admin/LiveBoard.tsx`, 루브릭·프롬프트 (수정) | 용어 치환 |

---

### Task 1: `lib/theory.ts` 개념 표

**Files:**
- Create: `lib/theory.ts`
- Test: `lib/__tests__/theory.test.ts`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
import { describe, expect, it } from "vitest";
import { THEORY, theoryBadge, theoryLabel, wikiHref, type TheoryKey } from "../theory";

describe("이론 개념 표", () => {
  it("모든 항목에 챕터(2~4)와 슬라이드 표기가 있다", () => {
    for (const [k, e] of Object.entries(THEORY)) {
      expect([2, 3, 4], k).toContain(e.chapter);
      expect(e.slides, k).toMatch(/^\d+(~\d+)?$/);
      expect(e.title.length, k).toBeGreaterThan(0);
    }
  });
  it("배지는 챕터·슬라이드만 보여 주고 개념 이름은 담지 않는다", () => {
    expect(theoryBadge("peeking")).toBe("Ch3·48");
    expect(theoryBadge("metric_layers")).toBe("Ch2·22~26");
  });
  it("라벨은 이름과 덱 슬라이드를 함께 보여 준다", () => {
    expect(theoryLabel("hypothesis")).toBe("Ch2 · 가설 문장 구조 (덱 17장)");
    expect(theoryLabel("metric_layers")).toBe("Ch2 · 지표 층 (덱 22~26장)");
  });
  it("위키가 있는 개념만 링크를 준다", () => {
    expect(wikiHref("hypothesis")).toMatch(/docs\/ab-testing\/02-hypothesis\.md$/);
    expect(wikiHref("peeking")).toBeUndefined();
  });
  it("키 타입이 표와 일치한다", () => {
    const k: TheoryKey = "srm";
    expect(THEORY[k].chapter).toBe(4);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/__tests__/theory.test.ts`
Expected: FAIL (`../theory` 없음)

- [ ] **Step 3: 구현**

```ts
/**
 * 이론 수업(덱 docs/lecture/ab-testing-theory.pptx, 위키 docs/ab-testing/*.md)과 실습을 잇는 개념 표.
 * 클라이언트 번들에 들어가므로 숨긴 효과·플래그 이름·루브릭을 담지 않는다. 덱이 바뀌면 이 파일만 고친다.
 */
export type TheoryEntry = { title: string; chapter: 2 | 3 | 4; slides: string; wiki?: string };

const e = (title: string, chapter: 2 | 3 | 4, slides: string, wiki?: string): TheoryEntry => ({ title, chapter, slides, wiki });

export const THEORY = {
  hypothesis: e("가설 문장 구조", 2, "17", "02-hypothesis"),
  tails: e("단측·양측 검정", 2, "20", "02-hypothesis"),
  non_inferiority: e("비열등성 검정", 2, "21", "02-hypothesis"),
  metric_layers: e("지표 층", 2, "22~26", "03-metrics"),
  goodhart: e("Goodhart의 법칙", 2, "27", "03-metrics"),
  predefine: e("사전 정의", 2, "28", "03-metrics"),
  unit: e("실험 단위", 2, "30", "04-experimental-unit"),
  trigger: e("트리거 분석", 2, "32"),
  error_power: e("1·2종 오류와 검정력", 2, "33~34"),
  randomization: e("무작위 배정과 SUTVA", 2, "35~36", "01-why-ab-testing"),
  aa_test: e("A/A 테스트", 3, "39"),
  duration: e("실험 기간", 3, "40"),
  analysis_unit: e("배정 단위와 분석 단위", 3, "42", "04-experimental-unit"),
  inference: e("p-value·신뢰구간·효과 크기", 3, "43~45"),
  cuped: e("CUPED", 3, "46"),
  multiple_testing: e("다중검정", 3, "47"),
  peeking: e("Peeking", 3, "48"),
  novelty: e("Novelty·Primacy 효과", 3, "49"),
  repeat_exposure: e("반복 노출", 3, "51", "04-experimental-unit"),
  sequential: e("Sequential Testing", 4, "53"),
  simpson: e("심슨의 역설", 4, "54"),
  srm: e("Sample Ratio Mismatch", 4, "55"),
  contamination: e("그 밖의 오염 신호", 4, "56"),
} as const satisfies Record<string, TheoryEntry>;

export type TheoryKey = keyof typeof THEORY;

const WIKI_BASE = "https://github.com/kkamret/quickmart-lab-rats/blob/main/docs/ab-testing/";

/** 입력란·경고 옆 작은 배지. 개념 이름은 빼고 챕터·슬라이드만 보여 준다(정답 공개 전 함정 이름을 숨기는 규칙). */
export const theoryBadge = (k: TheoryKey) => `Ch${THEORY[k].chapter}·${THEORY[k].slides}`;

/** "Ch2 · 가설 문장 구조 (덱 17장)" */
export const theoryLabel = (k: TheoryKey) => `Ch${THEORY[k].chapter} · ${THEORY[k].title} (덱 ${THEORY[k].slides}장)`;

export const wikiHref = (k: TheoryKey): string | undefined => {
  const w = THEORY[k].wiki;
  return w ? `${WIKI_BASE}${w}.md` : undefined;
};

/** 폼 입력란 이름 → 개념. 사례마다 formMeta 를 고치지 않고 AutoForm 이 이 표로 배지를 붙인다. */
export const FIELD_THEORY: Record<string, TheoryKey> = {
  "hypothesis.action": "hypothesis", "hypothesis.behavior": "hypothesis", "hypothesis.impact": "hypothesis",
  hypothesis_type: "tails", "hypothesis_type.push_ctr": "tails", "hypothesis_type.clicks_per_user": "non_inferiority", "hypothesis_type.app_open_au": "non_inferiority",
  ni_margin_pct: "non_inferiority",
  "metrics.primary": "metric_layers", "metrics.guardrails": "metric_layers", "metrics.secondary": "metric_layers",
  primary: "metric_layers", guardrails: "metric_layers", secondary: "metric_layers", abn_primary: "metric_layers",
  metric_definition: "metric_layers", primary_metric_definition: "metric_layers",
  unit: "unit", randomization_unit: "unit", assignment_key: "unit",
  ctr_analysis_unit: "analysis_unit", analysis_population: "trigger", assignment_timing: "trigger",
  alpha: "error_power", power: "error_power", mde_pp: "error_power", mde_pct: "error_power",
  duration_days: "duration", duration_weeks: "duration", il_days: "duration", abn_weeks: "duration",
  stopping: "peeking", ramp: "novelty", exclude_first_week: "novelty", include_ramp_days: "novelty",
  cuped: "cuped", correction: "multiple_testing",
  run_aa_first: "aa_test", rerun_aa: "aa_test", aa_days: "aa_test",
  count_basis: "trigger", data_source: "contamination",
};

/** 스텝 상단 "이론 복습" 줄. 함정 이름이 드러나지 않는 개념만 둔다(s7 은 처음부터 함정 학습이라 예외). */
export const STEP_THEORY: Partial<Record<string, TheoryKey[]>> = {
  s1_diagnose: ["hypothesis"],
  s2_design: ["hypothesis", "metric_layers", "unit", "error_power", "predefine"],
  s3_run: ["duration", "randomization"],
  s4_readout: ["inference", "analysis_unit"],
  s6_final: ["predefine", "inference"],
  s7_lab: ["peeking", "simpson", "srm"],
};
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/__tests__/theory.test.ts`
Expected: PASS (5개)

- [ ] **Step 5: 커밋**

```bash
git add lib/theory.ts lib/__tests__/theory.test.ts
git commit -m "feat(theory): 이론 개념 표와 배지·라벨 헬퍼

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: 매핑 무결성 테스트 (FIELD_THEORY·STEP_THEORY)

**Files:**
- Modify: `lib/__tests__/theory.test.ts`

- [ ] **Step 1: 테스트 추가**

```ts
import { FIELD_THEORY, STEP_THEORY } from "../theory";
import { STEP_KEYS } from "../steps";
import { getClientCase } from "../cases/client-registry";
import { CASE_KEYS } from "../cases";

describe("이론 연결 매핑", () => {
  it("FIELD_THEORY·STEP_THEORY 의 값은 모두 개념 표에 있다", () => {
    for (const [f, k] of Object.entries(FIELD_THEORY)) expect(THEORY[k], f).toBeDefined();
    for (const [s, ks] of Object.entries(STEP_THEORY)) {
      expect(STEP_KEYS as readonly string[], s).toContain(s);
      for (const k of ks!) expect(THEORY[k], `${s}:${k}`).toBeDefined();
    }
  });
  it("FIELD_THEORY 의 키는 실제 formMeta 입력란 이름이다 (오타 방지)", () => {
    const names = new Set<string>();
    for (const c of CASE_KEYS) for (const list of Object.values(getClientCase(c)!.formMeta)) for (const f of list) names.add(f.name);
    for (const k of Object.keys(FIELD_THEORY)) expect(names.has(k), k).toBe(true);
  });
});
```

- [ ] **Step 2: 실행**

Run: `npx vitest run lib/__tests__/theory.test.ts`
Expected: 처음엔 오타 있는 키(예: `abn_primary` 가 없다면)로 FAIL 가능. 실패한 키는 `FIELD_THEORY`에서 지우거나 실제 이름으로 고친다. (`CASE_KEYS` 가 `lib/cases.ts` 에 없으면 `import { CASE_KEYS } from "../cases"` 를 실제 export 이름으로 맞춘다.)

- [ ] **Step 3: 통과 확인 후 커밋**

Run: `npx vitest run lib/__tests__/theory.test.ts` → PASS

```bash
git add lib/theory.ts lib/__tests__/theory.test.ts
git commit -m "test(theory): 필드·스텝 매핑 무결성

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: 배지·이론 복습 컴포넌트와 폼 연결

**Files:**
- Modify: `components/ui.tsx` (끝에 추가)
- Modify: `components/form/AutoForm.tsx` (Field)
- Modify: `components/StepView.tsx` (단계 Card 목록 위)

- [ ] **Step 1: `components/ui.tsx` 끝에 추가**

```tsx
import { STEP_THEORY, theoryBadge, theoryLabel, wikiHref, type TheoryKey } from "@/lib/theory";

/** 입력란·경고 옆 회색 소형 배지: "Ch2·17" */
export function TheoryBadge({ k }: { k: TheoryKey }) {
  return <span title={theoryLabel(k)} className="ml-1.5 rounded bg-sunk px-1.5 py-0.5 align-middle text-[10px] font-medium text-ink3">{theoryBadge(k)}</span>;
}

/** 스텝 상단 한 줄: "이론 복습: Ch2 · 가설 문장 구조 (덱 17장) · …". 위키가 있으면 링크. */
export function TheoryNote({ step }: { step: string }) {
  const keys = STEP_THEORY[step];
  if (!keys?.length) return null;
  return (
    <p className="rounded-lg bg-sunk px-3 py-2 text-xs text-ink2">
      <strong className="mr-1.5">이론 복습</strong>
      {keys.map((k, i) => {
        const href = wikiHref(k);
        return (
          <span key={k}>
            {i > 0 && " · "}
            {href ? <a href={href} target="_blank" rel="noreferrer" className="underline">{theoryLabel(k)}</a> : theoryLabel(k)}
          </span>
        );
      })}
    </p>
  );
}
```

(이미 파일 상단에 `@/lib/theory` import 를 둘 수 있으면 상단으로 올린다. `ui.tsx` 에 `"use client"` 가 없어도 이 컴포넌트들은 상태가 없어 괜찮다.)

- [ ] **Step 2: AutoForm 라벨 옆 배지**

`components/form/AutoForm.tsx` 상단 import 에 추가:

```tsx
import { FIELD_THEORY } from "@/lib/theory";
import { inputClass, TheoryBadge } from "../ui";
```
(기존 `import { inputClass } from "../ui";` 를 위 줄로 교체)

`Field` 안의 label 줄을 교체:

```tsx
      <label htmlFor={id} className="mb-1 block text-sm font-semibold">
        {f.label}
        {FIELD_THEORY[f.name] && <TheoryBadge k={FIELD_THEORY[f.name]} />}
      </label>
```

- [ ] **Step 3: StepView 상단 한 줄**

`components/StepView.tsx` 의 `import { Badge, Button, Card, ErrorText, inputClass } from "./ui";` 에 `TheoryNote` 추가하고, 반환 JSX 의 `<div className="space-y-5">` 바로 아래(락 안내 앞)에 삽입:

```tsx
      <TheoryNote step={step} />
```

- [ ] **Step 4: 타입체크·린트·테스트**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: 모두 통과 (224 + 신규).

- [ ] **Step 5: 브라우저 확인**

`npm run dev` 후 데모 페이지(`/demo`)에서 s2 설계 화면의 가설·지표 라벨 옆에 `Ch2·17` 배지, 스텝 상단에 "이론 복습" 줄이 보이는지 확인한다. 모바일 폭(375px)에서 줄바꿈이 어색하지 않은지 본다.

- [ ] **Step 6: 커밋**

```bash
git add components/ui.tsx components/form/AutoForm.tsx components/StepView.tsx
git commit -m "feat(ui): 입력란 이론 배지와 스텝 이론 복습 줄

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: 용어 정렬 — 가설 라벨

**Files:**
- Modify: `lib/cases/{baemin,toss,daangn}/formMeta.ts` (넷플릭스는 가설 입력란 없음)
- Modify: `lib/cases/{baemin,toss,daangn}/schema.ts` (오류 메시지)

필드명(`hypothesis.action/behavior/impact`)과 zod 키는 그대로 둔다.

- [ ] **Step 1: 치환 스크립트 (Git Bash)**

```bash
cd /c/ab-lab/quickmart-lab-rats
for c in baemin toss daangn; do
  sed -i \
    -e 's/label: "Action: 무엇을 바꾸나요?"/label: "대상과 Treatment: 누구에게 무엇을 적용하나요?"/' \
    -e 's/label: "Behavior: 사용자 행동이 어떻게 달라지나요?"/label: "이유: 그래서 사용자 행동이 어떻게 달라지나요?"/' \
    -e 's/label: "Impact: 어떤 지표가 어느 방향으로 움직이나요?"/label: "Metric·방향·변화 크기: 어떤 지표가 얼마나 움직이나요?"/' \
    lib/cases/$c/formMeta.ts
  sed -i \
    -e 's/"Action 을 적어주세요"/"대상과 Treatment 를 적어주세요"/' \
    -e 's/"Behavior 를 적어주세요"/"이유(사용자 행동 변화)를 적어주세요"/' \
    -e 's/"Impact 를 적어주세요"/"Metric·방향·변화 크기를 적어주세요"/' \
    lib/cases/$c/schema.ts
done
grep -rn "Action:\|Behavior:\|Impact:\|Action 을\|Behavior 를\|Impact 를" lib/cases/*/formMeta.ts lib/cases/*/schema.ts
```
Expected: 마지막 grep 결과 없음.

- [ ] **Step 2: help 문구 보강 (baemin, toss)**

두 파일의 `hypothesis.action` 줄 `help` 를 다음으로 바꾼다 (Edit 도구로 해당 줄의 help 값만 교체):
`help: "[대상]에게 [Treatment]를 적용하면… 의 앞부분이에요. 바꾸는 것은 한 가지로 좁혀요."`

- [ ] **Step 3: 테스트에서 옛 문구를 보는 곳 확인·수정**

Run: `npm test`
Expected: PASS. 옛 라벨을 단정하는 테스트(`lib/lab/__tests__/lab.test.ts` 등)가 FAIL 하면 새 라벨로 고친다.

- [ ] **Step 4: 커밋**

```bash
git add lib/cases
git commit -m "feat(copy): 가설 입력란 라벨을 덱 17장 문장 구조로 정렬

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: 용어 정렬 — 지표 층 (Primary / Secondary·Driver / Guardrail)

**Files:**
- Modify: `lib/cases/*/formMeta.ts`, `components/admin/LiveBoard.tsx`, `components/readout/{MetricTable,ReadoutView}.tsx` (주석·헤더)

- [ ] **Step 1: 라벨 치환**

```bash
cd /c/ab-lab/quickmart-lab-rats
sed -i \
  -e 's/메인 지표/Primary 지표/g' \
  -e 's/보조 지표/Secondary·Driver 지표/g' \
  -e 's/가드레일 지표/Guardrail 지표/g' \
  lib/cases/*/formMeta.ts components/admin/LiveBoard.tsx
git diff --stat
```

- [ ] **Step 2: 입력란 순서 맞추기**

각 `formMeta.ts` 에서 Primary → Secondary·Driver → Guardrail 순서로 `primary`, `secondary`, `guardrails` 항목을 옮긴다. 현재 baemin 은 `metrics.primary → metrics.guardrails → metrics.secondary` 이므로 `metrics.secondary` 줄을 `metrics.guardrails` 줄 앞으로 옮긴다. toss 는 `primary → guardrails → secondary`(69~84행 근처)이므로 같은 방식으로 `secondary` 블록을 `guardrails` 블록 앞으로 옮긴다. daangn·netflix 는 `secondary` 입력란이 없으면 건너뛴다. 필드 순서만 바뀌고 필드명은 그대로다.

- [ ] **Step 3: OEC 도움말 추가**

`primary` 입력란(`metrics.primary`, toss `primary`, daangn `primary`·`metric_definition`, netflix `primary`)의 `help` 끝에 한 문장 붙인다:
` 실험 전체가 좋은 변화인지 보는 OEC와 가까운 지표를 고르면 좋아요.`
(이미 `help` 가 없으면 이 문장만 `help` 로 추가한다.)

- [ ] **Step 4: 용어 주석·화면 문구**

`components/readout/MetricTable.tsx:8`, `components/readout/ReadoutView.tsx:10` 의 주석 "메인 → 가드레일 → 보조"를 "Primary → Secondary·Driver → Guardrail 읽기"가 아니라 실제 표시 순서에 맞게 둔다. **표시 순서는 바꾸지 않는다**(Readout 읽는 순서는 CLAUDE.md 화면 규칙 고정). 주석만 `Primary → Guardrail → Secondary·Driver` 로 용어를 바꾼다.

- [ ] **Step 5: 검증**

Run: `npx tsc --noEmit && npm run lint && npm test`
Expected: PASS. 라벨을 단정하는 테스트가 실패하면 새 용어로 고친다.

- [ ] **Step 6: 커밋**

```bash
git add -A lib components
git commit -m "feat(copy): 지표 용어를 덱 Primary/Secondary·Driver/Guardrail로 통일

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 용어 정렬 — 실험 단위·검정·A/A 표기

**Files:**
- Modify: `lib/cases/{baemin,daangn}/formMeta.ts` 등

- [ ] **Step 1: 표기 치환**

```bash
cd /c/ab-lab/quickmart-lab-rats
sed -i \
  -e 's/label: "실험 단위", help: "무엇 단위로 A\/B 를 나누나요?"/label: "실험 단위 (Randomization Unit)", help: "무엇 단위로 무작위 배정하나요?"/' \
  -e 's/label: "배정 단위"/label: "실험 단위 (Randomization Unit)"/' \
  lib/cases/*/formMeta.ts
sed -i -e 's/label: "CTR 분석 단위"/label: "CTR 분석 단위 (Analysis Unit)"/' lib/cases/toss/formMeta.ts
grep -n "Randomization Unit\|Analysis Unit" lib/cases/*/formMeta.ts
```
Expected: baemin 1개, daangn 1개, toss 1개(Analysis Unit)가 나온다.

- [ ] **Step 2: 나머지 표기 점검**

```bash
grep -n "label: \"단측\|label: \"양측\|비열등성\|label: \"A/A\|label: \"최소 검출" lib/cases/*/formMeta.ts
```
덱 표기와 다르면 Edit 로 맞춘다: 비열등성 → "비열등성 검정", 최소 검출 효과 → "최소 검출 효과(MDE)" 유지.

- [ ] **Step 3: 검증과 커밋**

Run: `npx tsc --noEmit && npm test` → PASS

```bash
git add lib/cases
git commit -m "feat(copy): 실험 단위·분석 단위 표기를 덱 용어로 정렬

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 사례별 개념 연결(`meta.theory`)과 정답 공개 표

**Files:**
- Modify: `lib/cases/types.ts` (meta 에 `theory: TheoryKey[]`)
- Modify: `lib/cases/{baemin,toss,daangn,netflix}/ui.ts`
- Modify: `components/review/RevealCard.tsx`, `components/TeamScreen.tsx`
- Test: `lib/__tests__/theory.test.ts`

- [ ] **Step 1: 실패하는 테스트**

```ts
  it("모든 사례 meta.theory 가 비어 있지 않고 중복이 없다", () => {
    for (const c of CASE_KEYS) {
      const t = getClientCase(c)!.meta.theory;
      expect(t.length, c).toBeGreaterThan(0);
      expect(new Set(t).size, c).toBe(t.length);
      for (const k of t) expect(THEORY[k], `${c}:${k}`).toBeDefined();
    }
  });
```
Run: `npx vitest run lib/__tests__/theory.test.ts` → FAIL (`theory` 없음)

- [ ] **Step 2: 타입 추가**

`lib/cases/types.ts` 상단에 `import type { TheoryKey } from "../theory";`, `meta` 안 `concepts: string[];` 아래에 추가:

```ts
    /** 이 사례에서 쓰는 이론 개념 (정답 공개 때 "오늘 쓴 개념 ↔ 덱" 표에 쓴다) */
    theory: TheoryKey[];
```

- [ ] **Step 3: 사례별 값**

각 `ui.ts` 의 meta 객체 `concepts: [...]` 뒤에 추가:

- baemin: `theory: ["hypothesis", "metric_layers", "unit", "error_power", "duration", "novelty", "peeking", "srm", "trigger", "multiple_testing"] as TheoryKey[],`
- toss: `theory: ["hypothesis", "non_inferiority", "metric_layers", "analysis_unit", "cuped", "multiple_testing", "novelty", "predefine"] as TheoryKey[],`
- daangn: `theory: ["hypothesis", "trigger", "aa_test", "srm", "goodhart", "unit", "analysis_unit", "contamination"] as TheoryKey[],`
- netflix: `theory: ["error_power", "goodhart", "cuped", "multiple_testing", "novelty", "peeking", "metric_layers"] as TheoryKey[],`

각 파일 상단에 `import type { TheoryKey } from "../../theory";` 를 추가한다.

- [ ] **Step 4: RevealCard 표**

`RevealCard` 의 props 에 `theory: TheoryKey[]` 를 추가하고, Card 맨 아래(`items.map` 뒤)에 렌더링:

```tsx
      {theory.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">오늘 쓴 개념 ↔ 이론 슬라이드</h3>
          <ul className="mt-1 space-y-0.5 text-sm text-ink2">
            {theory.map((k) => <li key={k}>{theoryLabel(k)}</li>)}
          </ul>
        </div>
      )}
```
import: `import { theoryLabel, type TheoryKey } from "@/lib/theory";`

`TeamScreen.tsx:111` 의 호출을 `<RevealCard key={active} code={code} teamId={teamId} step={active} theory={clientCase.meta.theory} />` 로 바꾼다. 표는 스텝마다 반복되지 않도록 `active === "s6_final"` 일 때만 `theory` 를 넘기고 그 외는 `[]` 를 넘긴다.

- [ ] **Step 5: 검증**

Run: `npx tsc --noEmit && npm run lint && npm test` → PASS (client-bundle 테스트 포함: `lib/theory.ts` 는 서버 전용 모듈을 import 하지 않는다).

- [ ] **Step 6: 커밋**

```bash
git add lib components
git commit -m "feat(reveal): 정답 공개에 오늘 쓴 개념 ↔ 덱 슬라이드 표

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 함정 연구소 슬라이드 표시

**Files:**
- Modify: `components/lab/TrapLab.tsx` (제목 3곳: 24, 85, 128행 근처)

- [ ] **Step 1: 제목 옆 배지**

`TrapLab.tsx` import 에 `import { TheoryBadge } from "../ui";`(이미 ui import 가 있으면 합친다)를 추가하고 세 제목을 수정:

```tsx
<h2 className="text-xl font-bold">Peeking: 매일 확인하다 유의하면 멈추면?<TheoryBadge k="peeking" /></h2>
<h2 className="text-xl font-bold">심슨의 역설: 램프업 중 비율을 바꿨다면<TheoryBadge k="simpson" /></h2>
<h2 className="text-xl font-bold">SRM 계산기<TheoryBadge k="srm" /></h2>
```

- [ ] **Step 2: SRM 스트립 배지**

`components/readout/SrmStrip.tsx` 상단에 `import { TheoryBadge } from "../ui";` 를 추가하고 제목 줄을 바꾼다 (판정은 하지 않는 기존 동작 유지):

```tsx
        <b>데이터 품질 · 배정 비율<TheoryBadge k="srm" /></b>
```

- [ ] **Step 3: 검증과 커밋**

Run: `npx tsc --noEmit && npm run lint && npm test` → PASS

```bash
git add components/lab/TrapLab.tsx components/readout/SrmStrip.tsx
git commit -m "feat(lab): 함정 연구소 실험에 덱 슬라이드 배지

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: 리뷰·루브릭·직소 공유 용어

**Files:**
- Modify: `lib/review/prompts.ts` (COMMON, sharePrompt)
- Modify: `lib/cases/*/rubric.ts` (용어만)
- Test: `lib/review/__tests__/review.test.ts`

- [ ] **Step 1: 실패하는 테스트**

`lib/review/__tests__/review.test.ts` 에 추가 (이 파일의 기존 import 와 입력 픽스처를 따른다. `sharePrompt` 와 `teamPrompt` 의 `system` 문자열만 검사한다):

```ts
  it("프롬프트가 덱 용어를 쓰라고 안내한다", () => {
    const { system } = teamPrompt(teamInputFixture);
    expect(system).toContain("Primary");
    expect(system).toContain("Guardrail");
    expect(sharePrompt(shareInputFixture).system).toContain("Primary");
  });
```
(`teamInputFixture`, `shareInputFixture` 는 이 테스트 파일에 이미 있는 입력 객체를 쓰거나, 없으면 같은 파일의 기존 `teamPrompt`/`sharePrompt` 호출에 쓴 인자를 변수로 뽑아 재사용한다.)

Run: `npx vitest run lib/review` → FAIL

- [ ] **Step 2: COMMON 에 한 줄 추가**

`lib/review/prompts.ts` 의 `COMMON` 끝에 이어 붙인다:
` 용어는 이론 수업과 같게 쓰세요: Primary 지표, Secondary·Driver 지표, Guardrail 지표, 실험 단위(Randomization Unit), 비열등성 검정, 트리거 분석.`

`COMMON` 은 team·class·share 프롬프트에 모두 쓰이므로 세 프롬프트가 같이 적용된다. 정답 공개 전에는 플래그 이름을 말하지 않는 기존 규칙은 그대로 둔다.

- [ ] **Step 3: 루브릭 용어 치환**

```bash
cd /c/ab-lab/quickmart-lab-rats
sed -i -e 's/메인 지표/Primary 지표/g' -e 's/보조 지표/Secondary·Driver 지표/g' -e 's/가드레일 지표/Guardrail 지표/g' lib/cases/*/rubric.ts
sed -i -e 's/메인을/Primary를/g' -e 's/메인이/Primary가/g' lib/cases/*/rubric.ts
git diff --stat lib/cases/*/rubric.ts
```
점수 로직은 건드리지 않고 문자열만 바뀐다.

- [ ] **Step 4: 검증과 커밋**

Run: `npm test` → PASS

```bash
git add lib
git commit -m "feat(review): 리뷰·루브릭 용어를 덱과 통일

Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 최종 검증과 PR

- [ ] **Step 1: 전체 검증**

Run: `npm test && npx tsc --noEmit && npm run lint && npm run build`
Expected: 모두 통과.

- [ ] **Step 2: 화면 확인**

`npm run dev` 후 `/demo` 에서 사례 4개 모두 s2 설계 폼의 라벨·배지, 스텝 상단 "이론 복습" 줄, s7 배지, 375px 모바일 폭을 확인한다. 라벨이 길어 어색하면 `help` 로 옮긴다.

- [ ] **Step 3: 덱 번호 재대조**

`git pull` 로 덱이 바뀌었는지 확인하고, 바뀌었으면 `lib/theory.ts` 표의 슬라이드 번호를 다시 맞춘다.

- [ ] **Step 4: 푸시와 PR (사용자 확인 후)**

```bash
git push -u origin phase2-theory-alignment
gh pr create --repo kkamret/quickmart-lab-rats --base main --title "feat: Phase 2 이론 수업 연결 (용어 정렬 + 이론 배지)" --body "docs/superpowers/specs/2026-10-07-phase2-theory-alignment-design.md 구현. 저장 필드·스키마 불변.

🤖 Generated with [Claude Code](https://claude.com/claude-code)"
```
PR 은 사용자가 "푸시해줘/PR 올려줘" 라고 한 뒤에 만든다.

---

## 자체 점검 (spec 대조)

| spec 항목 | task |
|---|---|
| 3.1 가설 라벨 | 4 |
| 3.2 지표 용어·순서·OEC 도움말 | 5 |
| 3.3 실험 단위 | 6 |
| 3.4 그 밖의 라벨 | 6 (Step 2 점검) |
| 3.5 Readout 순서·문구 | 5 (표시 순서는 고정 규칙에 따라 유지, 용어만 변경) |
| 3.6 루브릭·리뷰 문구 | 9 |
| 4.1 `lib/theory.ts` | 1, 2 |
| 4.2 스텝 헤더·입력란 배지·s7 | 3, 8 |
| 4.2 Readout 경고 옆 배지 | 8 (플래그는 조 화면에 없으므로 항상 보이는 SRM 데이터 품질 줄에만 붙인다) |
| 4.3 공개 표·share 프롬프트 | 7, 9 |
| 5 테스트 | 1, 2, 7, 9, 10 |
