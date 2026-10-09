# 배민 판정 로직 이론 정렬 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 배민 사례의 시뮬레이터 플래그, 결정 판정, 정답 공개 해설이 덱·위키의 문장에서 도출되도록 로직 자체를 바꾼다. 라벨 병기나 "이론 밖" 표시로 덮지 않는다.

**Architecture:** (1) 시뮬레이터 규칙을 이론 조건으로 교체(`analysis_mode` 층화 분석, 램프업 연결 P2 버그, 플래그 3종, FLICKER 삭제). (2) 새 순수 함수 `judgeBaemin`이 조의 실제 Readout으로 결정 옵션을 `correct|partial|wrong`과 근거 문장(숫자 + 이론 챕터명)으로 판정한다. (3) 판정과 플래그 설명(`why`)을 정답 공개 카드와 AI 리뷰 입력에 연결한다. 숨김 정보는 기존처럼 `_` 패널·`flags`로만 두어 `toTeamView`가 제거한다(CLAUDE.md 절대 규칙 3).

**Tech Stack:** Next.js 15, TypeScript strict, zod 4, Vitest, Tailwind v4. 설계 문서: `docs/superpowers/specs/2026-10-09-baemin-theory-logic-design.md`.

**작업 브랜치:** `feat/baemin-theory-logic` (이미 존재, 설계 문서 커밋 7651548 위). PR·푸시·머지는 사용자가 말할 때만 한다. 커밋은 태스크마다 한다.

**전체 규칙**
- 테스트 실행: `npx vitest run <경로>`, 전체는 `npx vitest run`. 타입: `npx tsc --noEmit`. 린트: `npm run lint`.
- 커밋 메시지 끝에 항상 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` 줄을 둔다.
- 앱 문구는 해요체, 슬라이드 번호·위키 링크는 쓰지 않고 챕터 라벨(`theoryLabel`)만 쓴다.
- 기대값이 틀려 테스트가 실패하면 기대값을 몰래 고치지 말고 실패 출력을 사용자에게 보고한다.

---

## 파일 구조

| 파일 | 변경 | 책임 |
|---|---|---|
| `docs/superpowers/specs/2026-10-09-baemin-theory-logic-design.md` | 수정 | B·F·A 규칙 확정본 반영 |
| `lib/sim/core/stats.ts` | 수정 | `combineStrata` (역분산 가중 층화 합산) |
| `lib/sim/core/flags.ts` | 수정 | `FLICKER` 삭제 |
| `lib/cases/baemin/schema.ts` | 수정 | `include_ramp_days` → `analysis_mode`, `qa_old_ios` 삭제 |
| `lib/cases/baemin/formMeta.ts` | 수정 | 폼 필드 교체·삭제 |
| `lib/cases/baemin/defaults.ts` | 수정 | 초기값 |
| `lib/cases/baemin/effects.ts` | 수정 | 주석 |
| `lib/cases/baemin/simulate.ts` | 수정 | 층화 분석, 램프 연결 버그, 플래그 규칙, `_why`·`_notes` |
| `lib/cases/baemin/judge.ts` | 신규 | 결정 판정 순수 함수 |
| `lib/cases/baemin/rubric.ts` | 수정 | LLM 루브릭을 규칙 기반으로, reveal 문구 |
| `lib/cases/baemin/index.ts` | 수정 | 플러그인에 `judge` 연결 |
| `lib/cases/types.ts` | 수정 | `Verdict`, `Judgement`, `CasePlugin.judge` |
| `lib/theory.ts` | 수정 | `decision` 개념, `analysis_mode` 매핑 |
| `lib/reveal.ts` | 수정 | `judgeDecisions`, `latestDecisionPicks`, 플래그 `why`·`notes` |
| `app/api/reveal/route.ts` | 수정 | 결정 제출 조회 |
| `components/review/RevealCard.tsx` | 수정 | 판정·설명 표시 |
| `lib/review/{prompts,service}.ts` | 수정 | `decision_checks` 입력 |
| `docs/cases/baemin.md`, `lib/cases/baemin/CALIBRATION.md`, `docs/theory-coverage.md` | 수정 | 진실의 원천·근거표 |
| 테스트 | 수정·신규 | `baemin.test.ts`, `judge.test.ts`(신규), `strata.test.ts`(신규), `reveal.test.ts`, `lab.test.ts`, `board.test.ts`, `review.test.ts` |

---

### Task 0: 작업 트리 정리

설계 단계에서 만든 임시 초안이 작업 트리에 남아 있다(`defaults.ts`, `schema.ts`, `types.ts`, `theory.ts`의 일부 수정과 미추적 `judge.ts`). 이 계획이 각 파일의 최종 내용을 정의하므로 초안은 버리고 깨끗한 상태에서 시작한다.

**Files:** 없음(작업 트리만 정리)

- [ ] **Step 1: 브랜치와 상태 확인**

Run: `git branch --show-current && git status --short`
Expected: 브랜치 `feat/baemin-theory-logic`. 변경 목록에 `lib/cases/baemin/judge.ts`(미추적)와 위 수정 파일들 정도만 있다. 그 밖의 파일이 보이면 멈추고 사용자에게 보고한다.

- [ ] **Step 2: 초안 폐기**

Run:
```bash
git restore lib/cases/baemin/defaults.ts lib/cases/baemin/schema.ts lib/cases/types.ts lib/theory.ts
rm -f lib/cases/baemin/judge.ts
rm -rf tmp_probe lib/zzprobe
git status --short
```
Expected: 출력이 비어 있다.

- [ ] **Step 3: 기준선 확인**

Run: `npx vitest run 2>&1 | tail -8` 와 `npx tsc --noEmit`
Expected: 테스트 전체 통과, tsc 오류 없음. 실패가 있으면 이 계획과 무관한 기존 실패이므로 목록을 기록해 두고 이후 태스크의 "전체 통과" 기준을 그 목록 제외로 해석한다(사용자에게 알린다).

---

### Task 1: 설계 문서 확정본 반영

구현 중 검증으로 바뀐 규칙 세 가지(기간 3번 기준, 다중검정 기준, P3 환산)를 설계 문서에 먼저 고쳐 문서와 코드가 어긋나지 않게 한다.

**Files:** Modify `docs/superpowers/specs/2026-10-09-baemin-theory-logic-design.md`

- [ ] **Step 1: A 표의 마지막 보정 행 수정**

Edit — old:
```
| 보정 | 분석 구간에서 초기 시간 효과가 지배(B의 3번 기준 불충족) | 기간을 늘린 재실험이 자연스러움 | 덱 「초반 반응은 오래 가지 않을 수 있다」 |
```
new:
```
| 보정 | 2번이지만 분석 구간이 7일 이하(첫 주만 본 설계) | 기간을 늘린 재실험이 자연스러움(신기효과 가능성) | 덱 「초반 반응은 오래 가지 않을 수 있다」, 「최소 1~2주, 요일과 신기효과를 넘겨서」 |
```

- [ ] **Step 2: A 설명에 P3 환산 문단 추가**

Edit — old:
```
판정은 `correct | partial | wrong` 세 값과
```
new:
```
P3는 쿠폰 조건을 채운 트리거 사용자만 문구를 본다. 그래서 전체 지표 차이와 신뢰구간을 `B 트리거 사용자 수 / B 전체 사용자 수`로 나눠 트리거 사용자 기준으로 환산한 뒤 위 표의 분류를 적용한다(근거: 덱 「효과를 받을 수 있는 사람만 분석에 넣는다」). MDE 비교와 "구간이 MDE보다 좁다"는 판단도 환산한 값으로 한다.

판정은 `correct | partial | wrong` 세 값과
```

- [ ] **Step 3: B 절 본문 교체**

Edit — old (B 절의 `` `SHORT_DURATION`의 조건 `` 로 시작하는 줄부터 "구현 단계에서 일별 시계열 데이터로 검증한다." 줄까지 전부):
```
`SHORT_DURATION`의 조건 `분석 일수 < 14`를 덱 「최소 1~2주, 요일과 신기효과를 넘겨서」의 판단 기준으로 바꾼다. 플래그 이름은 `SHORT_DURATION`을 유지하고 아래 중 하나라도 해당하면 붙인다.

1. 필요 표본 미달: 분석한 그룹당 사용자 수가 `planned`보다 작다.
2. 요일 주기 불완전: 분석 일수가 7의 배수가 아니다(조기 종료한 조는 제외: 조기 종료는 PEEKED 또는 순차 검정의 규칙으로 따로 다룬다).
3. 초기 시간 효과 지배: 분석 구간의 처음 3일이 전체 일수의 25% 이상이고, 그 3일의 효과 추정이 나머지 일수의 추정보다 개선 방향으로 크다(신기효과 모양).

세 번째 기준에서 25%는 임의값이므로 **"처음 3일 평균 효과가 이후 평균 효과의 신뢰구간 밖"** 으로 바꿔 쓴다(통계적 정의). 구현 단계에서 일별 시계열 데이터로 검증한다.
```
new:
```
`SHORT_DURATION`의 조건 `분석 일수 < 14`를 덱 「최소 1~2주, 요일과 신기효과를 넘겨서」의 판단 기준으로 바꾼다. 플래그 이름은 `SHORT_DURATION`을 유지하고 아래 중 하나라도 해당하면 붙인다.

1. 필요 표본 미달: 분석한 대조군(A) 사용자 수가 `planned.nPerArm`보다 작다(근거: 덱 「α와 Power」의 필요 표본, 위키 05편 4.1~4.2). `planned`는 진짜 효과 계산과 함께 만들어지므로 `withTruth` 실행에서만 판단한다.
2. 요일 주기 불완전: 중간 확인으로 일찍 멈추지 않은 설계에서 분석 일수가 7의 배수가 아니다(근거: 덱 「최소 1~2주, 요일과 신기효과를 넘겨서」, 위키 09편 1.2.2). 일찍 멈춘 설계는 PEEKED·순차 검정 규칙으로 따로 다룬다.
3. 첫 주만 본 설계: 분석 일수가 7일 이하다(근거: 덱 「초반 반응은 오래 가지 않을 수 있다」, 위키 09편 1.2.3).

통계적 정의("처음 3일 평균 효과가 이후 구간 밖")는 쓰지 않는다. 시뮬레이터에서 검증해 보니 7일 설계에서도 그 기준이 일관되게 켜지지 않았고, 덱의 문장("첫 주만 보면 과대평가")이 일수 기준이기 때문이다.
```

- [ ] **Step 4: F 표의 MULTIPLE_TESTING 행 교체**

Edit — old:
```
| `MULTIPLE_TESTING` | 보정 없음 + 비교 10개 이상 | 보정 없음이면서, 비-Primary 비교 중 **보정 전엔 유의하고 BH 보정 후엔 유의하지 않은 것**이 있음 | 덱 「지표 20개를 보면 하나쯤은 우연히 걸린다」, 위키 09편 1.4.2~1.4.4 |
```
new:
```
| `MULTIPLE_TESTING` | 보정 없음 + 비교 10개 이상 | 보정 없음이면서, Primary가 아닌 비교 m개를 모두 효과가 없다고 가정했을 때 하나라도 유의하게 나올 확률 `1−(1−α)^m`이 0.5를 넘음. 이론이 개수를 정하지 않으므로 "걸릴 확률이 안 걸릴 확률보다 크다"는 의미 있는 경계를 쓴다(α=0.05면 m≥14) | 덱 「지표 20개를 보면 하나쯤은 우연히 걸린다」, 위키 09편 1.4.2~1.4.4 |
```

- [ ] **Step 5: 영향 범위에 정답 공개 연결 추가**

Edit — old:
```
- 코드: `lib/cases/baemin/{schema,formMeta,defaults,simulate,effects,rubric,decisions,ui}.ts`, 새 `judge.ts`, `lib/sim/core/flags.ts`(FLICKER 삭제), `lib/reveal.ts`·`lib/review/prompts.ts`(판정 근거 문장 연결).
```
new:
```
- 코드: `lib/cases/baemin/{schema,formMeta,defaults,simulate,effects,rubric,index,ui}.ts`, 새 `judge.ts`, `lib/sim/core/{flags,stats}.ts`(FLICKER 삭제, `combineStrata` 추가), `lib/cases/types.ts`(`judge`), `lib/theory.ts`(`decision`), `lib/reveal.ts`·`app/api/reveal/route.ts`·`components/review/RevealCard.tsx`(판정·플래그 설명 표시), `lib/review/{prompts,service}.ts`(`decision_checks`).
- 강사 전용 `_why`(플래그 설명)·`_notes`(P2 램프업 안내)는 `panels`의 `_` 키로 저장해 `toTeamView`가 조 화면에서 제거한다.
```

- [ ] **Step 6: 커밋**

```bash
git add docs/superpowers/specs/2026-10-09-baemin-theory-logic-design.md docs/superpowers/plans/2026-10-09-baemin-theory-logic.md
git commit -m "docs: 배민 판정 로직 설계 확정본과 구현 계획" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: `combineStrata` (층화 합산)

**Files:**
- Modify: `lib/sim/core/stats.ts` (`meanTest` 함수 바로 뒤, `srm` 함수 앞)
- Create: `lib/sim/core/__tests__/strata.test.ts`

`lib/sim/core/index.ts`는 `export * from "./stats"`를 이미 하므로 따로 내보낼 것이 없다.

- [ ] **Step 1: 실패하는 테스트 작성**

`lib/sim/core/__tests__/strata.test.ts`:
```ts
import { describe, expect, it } from "vitest";
import { combineStrata, compareDiff } from "../stats";

describe("combineStrata (역분산 가중 층화 합산)", () => {
  it("층이 하나면 그대로 돌려준다", () => {
    const one = compareDiff(0.5, 0.49, 0.01);
    expect(combineStrata([one])).toBe(one);
  });

  it("같은 효과·같은 SE 의 두 층: 효과는 같고 SE 는 1/√2 로 줄어든다", () => {
    const a = compareDiff(0.5, 0.49, 0.01);
    const out = combineStrata([a, a]);
    expect(out.vA).toBeCloseTo(0.5, 10);
    expect(out.d).toBeCloseTo(-0.01, 10);
    expect(out.se).toBeCloseTo(0.01 / Math.sqrt(2), 10);
    expect(out.ci[1] - out.ci[0]).toBeLessThan(a.ci[1] - a.ci[0]);
  });

  it("SE 가 작은 층에 더 큰 가중을 준다", () => {
    const noisy = compareDiff(0.5, 0.4, 0.05); // d=-0.10, 큰 SE
    const sharp = compareDiff(0.5, 0.49, 0.005); // d=-0.01, 작은 SE
    const out = combineStrata([noisy, sharp]);
    // 가중: 1/0.05² = 400, 1/0.005² = 40000 → 합친 d 는 sharp 쪽에 훨씬 가깝다
    expect(out.d).toBeGreaterThan(-0.011);
    expect(out.d).toBeLessThan(-0.01);
    expect(out.se).toBeLessThan(0.005);
  });

  it("층마다 대조군 값이 다르면 가중 평균을 vA 로 둔다", () => {
    const out = combineStrata([compareDiff(0.4, 0.38, 0.01), compareDiff(0.6, 0.58, 0.01)]);
    expect(out.vA).toBeCloseTo(0.5, 10);
    expect(out.vB).toBeCloseTo(0.48, 10);
  });

  it("층이 없으면 던진다", () => {
    expect(() => combineStrata([])).toThrow();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/sim/core/__tests__/strata.test.ts`
Expected: FAIL (`combineStrata` is not exported / not a function).

- [ ] **Step 3: 구현**

`lib/sim/core/stats.ts`에서 `meanTest` 함수가 끝나는 `}` 다음, `export function srm(` 위에 추가:
```ts
/**
 * 층별 비교를 역분산 가중으로 합친다(층화 분석). 층 안에서는 배정 비율이 같아서 합산 왜곡이 없고,
 * 합친 효과는 SE 가 작은 층에 더 큰 가중을 준다. 층이 하나면 그대로 돌려준다.
 */
export function combineStrata(parts: CompareResult[], alpha = 0.05): CompareResult {
  if (parts.length === 0) throw new Error("합칠 층이 없어요.");
  if (parts.length === 1) return parts[0];
  let w = 0;
  let dSum = 0;
  let aSum = 0;
  for (const p of parts) {
    const wi = 1 / (p.se * p.se);
    w += wi;
    dSum += wi * p.d;
    aSum += wi * p.vA;
  }
  const vA = aSum / w;
  return compareDiff(vA, vA + dSum / w, 1 / Math.sqrt(w), alpha);
}
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/sim/core/__tests__/strata.test.ts && npx tsc --noEmit`
Expected: 5 passed, tsc 오류 없음.

- [ ] **Step 5: 커밋**

```bash
git add lib/sim/core/stats.ts lib/sim/core/__tests__/strata.test.ts
git commit -m "feat: 층화 분석용 combineStrata (역분산 가중)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: FLICKER 삭제

**Files:**
- Modify: `lib/sim/core/flags.ts`, `lib/cases/baemin/simulate.ts`
- Test: `lib/cases/baemin/__tests__/baemin.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`baemin.test.ts`의 import 줄을 바꾼다 — old:
```ts
import { toTeamView, type Readout } from "@/lib/sim/core";
```
new:
```ts
import { ALL_FLAGS, toTeamView, type Readout } from "@/lib/sim/core";
```
파일 맨 끝에 새 describe 추가:
```ts
describe("페이지뷰 단위", () => {
  it("깜빡임(FLICKER) 장치는 없다: 페이지뷰는 UNIT_MISMATCH 만 붙는다", () => {
    expect(ALL_FLAGS as readonly string[]).not.toContain("FLICKER");
    const r = simulateBaemin(p1({ unit: "pageview" }));
    expect(r.flags).toContain("UNIT_MISMATCH");
    expect(r.flags as string[]).not.toContain("FLICKER");
  });

  it("페이지뷰 단위가 크래시율을 따로 올리지 않는다(이론 근거 없음)", () => {
    const user = simulateBaemin(p1({ unit: "user" }), { withTruth: false });
    const pv = simulateBaemin(p1({ unit: "pageview" }), { withTruth: false });
    const crashRate = (r: Readout) => {
      const m = metric(r, "crash");
      return (m.arms.B!.x ?? 0) / m.arms.B!.n;
    };
    // 단위가 효과를 줄이는 것(×0.3)과 별개로, 이전 구현의 +0.1%p 가산은 없어야 한다(차이 < 0.05%p)
    expect(crashRate(pv)).toBeCloseTo(crashRate(user), 3);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/cases/baemin/__tests__/baemin.test.ts -t "페이지뷰 단위"`
Expected: FAIL (ALL_FLAGS 에 FLICKER 가 있고, 페이지뷰 크래시율이 +0.001 높다).

- [ ] **Step 3: 구현**

`lib/sim/core/flags.ts` — old:
```ts
/** 사례 문서에서 따로 정의한 플래그: 배민 FLICKER, 당근 GOODHART(+넷플릭스 공용) · CARRYOVER */
export const CASE_FLAGS = ["FLICKER", "GOODHART", "CARRYOVER", "STAKEHOLDER_EVENT"] as const;
```
new:
```ts
/** 사례 문서에서 따로 정의한 플래그: 당근 GOODHART(+넷플릭스 공용) · CARRYOVER */
export const CASE_FLAGS = ["GOODHART", "CARRYOVER", "STAKEHOLDER_EVENT"] as const;
```
같은 파일 — old: `  FLICKER: "깜빡임 렌더링",\n` → new: (삭제, 빈 문자열).

`lib/cases/baemin/simulate.ts` — old:
```ts
        let crashP = CRASH[seg.os] + eff.crash + (d.unit === "pageview" && arm !== "A" ? 0.001 : 0);
```
new:
```ts
        let crashP = CRASH[seg.os] + eff.crash;
```
old: `  if (d.unit === "pageview") flags.push("FLICKER");\n` → new: (삭제).

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib/cases/baemin lib/sim && npx tsc --noEmit`
Expected: 전체 통과. (`FLICKER` 참조가 남아 있으면 tsc 가 알려준다: `grep -rn FLICKER lib app components`로 확인하고 코드 참조는 모두 지운다. docs/CALIBRATION 문구는 Task 11 에서 고친다.)

- [ ] **Step 5: 커밋**

```bash
git add lib/sim/core/flags.ts lib/cases/baemin/simulate.ts lib/cases/baemin/__tests__/baemin.test.ts
git commit -m "refactor: 이론 근거 없는 FLICKER 플래그와 페이지뷰 크래시 효과 삭제" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `analysis_mode` (층화 분석) — 램프 구간 제외 삭제

`include_ramp_days`(불리언)를 `analysis_mode`(`pooled`|`stratified`)로 바꾼다. 램프 일수를 빼던 동작은 사라진다(모든 일차를 분석에 쓴다).

**Files:**
- Modify: `lib/cases/baemin/{schema,formMeta,defaults,simulate}.ts`, `lib/theory.ts`
- Test: `lib/cases/baemin/__tests__/baemin.test.ts`, `lib/admin/__tests__/board.test.ts`, `lib/review/__tests__/review.test.ts`

- [ ] **Step 1: 기존 테스트 fixture 갱신 + 새 테스트 작성**

기계적 치환(세 파일):
```bash
sed -i 's/include_ramp_days: true/analysis_mode: "pooled"/g' lib/cases/baemin/__tests__/baemin.test.ts lib/admin/__tests__/board.test.ts lib/review/__tests__/review.test.ts
grep -n "include_ramp_days" lib/cases/baemin/__tests__/baemin.test.ts lib/admin/__tests__/board.test.ts lib/review/__tests__/review.test.ts
```
Expected: `baemin.test.ts` 의 램프 제외 테스트(`include_ramp_days: true/false` 가 같은 줄에 `ramp: "10_50_100"`과 함께 있는 두 줄) 외에는 남지 않는다. 남은 건 다음 단계에서 교체한다.

`baemin.test.ts` 의 "램프업 구간 제외 옵션은 1~2일을 분석에서 뺀다" 테스트 전체를 교체 — old:
```ts
  it("램프업 구간 제외 옵션은 1~2일을 분석에서 뺀다", () => {
    const incl = simulateBaemin(p1({ ramp: "10_50_100", include_ramp_days: true }));
    const excl = simulateBaemin(p1({ ramp: "10_50_100", include_ramp_days: false }));
    expect(excl.srm!.counts[0]).toBeLessThan(incl.srm!.counts[0]);
    // 1일차는 B 효과가 10% 만 보이므로 포함하면 효과가 희석돼 보인다
    expect(Math.abs(cmp(excl, "abandon").d)).toBeGreaterThan(Math.abs(cmp(incl, "abandon").d) * 0.9);
  });
```
new:
```ts
  it("램프업 일차를 분석에서 빼는 옵션은 없다: 분석 방식과 상관없이 모든 일차를 쓴다", () => {
    const pooled = simulateBaemin(p1({ ramp: "10_50_100", analysis_mode: "pooled" }));
    const strat = simulateBaemin(p1({ ramp: "10_50_100", analysis_mode: "stratified" }));
    expect(pooled.srm!.counts).toEqual(strat.srm!.counts);
    expect(pooled.periods).toHaveLength(14);
    expect(pooled.stoppedAt).toBe(14);
  });
```
파일 끝에 새 describe 추가:
```ts
describe("분석 방식(analysis_mode)", () => {
  const simpsonDesign = (mode: "pooled" | "stratified") =>
    p1({ ramp: "10_week1_50_week2", analysis_mode: mode, metrics: { primary: "conv", guardrails: ["abandon"], secondary: [] } });

  it("배정 비율이 바뀌는 램프: 합쳐서 분석하면 B 우세, 같은 비율끼리 나눠 합치면 주차별 방향(B 열세)과 같다", () => {
    const pooled = simulateBaemin(simpsonDesign("pooled"), { mode: "simpson_demo" });
    const strat = simulateBaemin(simpsonDesign("stratified"), { mode: "simpson_demo" });
    expect(cmp(pooled, "conv").d).toBeGreaterThan(0);
    expect(cmp(strat, "conv").d).toBeLessThan(0);
    expect(cmp(strat, "conv").method).toContain("층화");
    expect(cmp(pooled, "conv").method).not.toContain("층화");
  });

  it("SIMPSON_RISK 는 배정 비율이 달라진 기간을 합쳐서 분석했을 때만 붙는다", () => {
    const pooled = simulateBaemin(simpsonDesign("pooled"), { mode: "simpson_demo" });
    const strat = simulateBaemin(simpsonDesign("stratified"), { mode: "simpson_demo" });
    expect(pooled.flags).toContain("SIMPSON_RISK");
    expect(strat.flags).not.toContain("SIMPSON_RISK");
    // 7일이면 한 주(층 하나)뿐이라 합산 왜곡이 없다
    const week1 = simulateBaemin(p1({ ramp: "10_week1_50_week2", duration_days: 7, analysis_mode: "pooled" }), { mode: "simpson_demo" });
    expect(week1.flags).not.toContain("SIMPSON_RISK");
  });

  it("배정 비율이 일정한 램프(none, 10_50_100)에서는 두 방식의 결과가 같다", () => {
    for (const ramp of ["none", "10_50_100"]) {
      const a = simulateBaemin(p1({ ramp, analysis_mode: "pooled" }), { withTruth: false });
      const b = simulateBaemin(p1({ ramp, analysis_mode: "stratified" }), { withTruth: false });
      expect(JSON.stringify(b.metrics)).toBe(JSON.stringify(a.metrics));
      expect(b.flags).toEqual(a.flags);
    }
  });

  it("analysis_mode 를 생략하면 pooled 로 읽는다(이전 제출 호환)", () => {
    const d = p1();
    delete (d as Record<string, unknown>).analysis_mode;
    const v = validateDesign(d);
    expect(v.ok).toBe(true);
    if (v.ok) expect(v.design.analysis_mode).toBe("pooled");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/cases/baemin/__tests__/baemin.test.ts -t "분석 방식|램프업 일차"`
Expected: FAIL (층화 분석이 없어 stratified 의 d 가 양수, `design.analysis_mode` 가 undefined).

- [ ] **Step 3: 스키마·기본값·폼·이론 매핑**

`lib/cases/baemin/schema.ts` — old:
```ts
  include_ramp_days: z.boolean(),
```
new:
```ts
  /** pooled: 기간을 합쳐서 분석 / stratified: 배정 비율이 같은 기간(층)별로 비교한 뒤 합쳐서 분석 */
  analysis_mode: z.enum(["pooled", "stratified"]).default("pooled"),
```

`lib/cases/baemin/defaults.ts` — old: `  include_ramp_days: true,\n` → new: `  analysis_mode: "pooled",\n`

`lib/cases/baemin/formMeta.ts` — old:
```ts
  { name: "include_ramp_days", label: "램프업 기간도 분석에 포함", help: "끄면 램프업 구간을 빼고 분석해요.", type: "boolean" },
```
new:
```ts
  {
    name: "analysis_mode", label: "분석 방식", help: "램프업처럼 기간마다 A:B 배정 비율이 달라질 수 있어요. 기간을 합쳐서 볼지, 배정 비율이 같은 기간끼리 나눠 본 뒤 합칠지 골라요.", type: "select",
    options: [
      { value: "pooled", label: "전체 기간을 합쳐서 분석" },
      { value: "stratified", label: "배정 비율이 같은 기간끼리 나눠 비교한 뒤 합쳐서 분석" },
    ],
  },
```

`lib/theory.ts` — old: `exclude_first_week: "novelty", include_ramp_days: "ramp_up",` → new: `exclude_first_week: "novelty", analysis_mode: "simpson",`

- [ ] **Step 4: 시뮬레이터**

`lib/cases/baemin/simulate.ts` 편집 (순서대로):

(a) import — old:
```ts
  binomialCount, crnZ, designHash, groupMean, meanTest, obfBoundary, powerMean, powerProp, propTest, sigFlags, srm,
```
new:
```ts
  binomialCount, combineStrata, crnZ, designHash, groupMean, meanTest, obfBoundary, powerMean, powerProp, propTest, sigFlags, srm,
```

(b) `excludedDays` 함수 삭제 — old (주석 포함 전체):
```ts
/** 램프 구간으로 분석에서 뺄 일차들 */
function excludedDays(d: Design): (day: number) => boolean {
  if (d.include_ramp_days) return () => false;
  if (d.ramp === "10_50_100") return (day) => day <= 2;
  if (d.ramp === "10_week1_50_week2" && d.duration_days > 7) return (day) => day <= 7;
  return () => false;
}
```
new:
```ts
const sameShares = (a: Record<string, number>, b: Record<string, number>) =>
  Object.keys(a).length === Object.keys(b).length && Object.keys(a).every((k) => k in b && Math.abs(a[k] - b[k]) < 1e-9);

/** 계획 배정비가 같은 연속 일차끼리 묶는다(층). 층화 분석과 SIMPSON_RISK 판단에 쓴다. */
export function strataOf(shares: Record<string, number>[], days: number[]): number[][] {
  const out: number[][] = [];
  let prev: Record<string, number> | null = null;
  for (const day of days) {
    const cur = shares[day - 1];
    if (prev && sameShares(prev, cur)) out[out.length - 1].push(day);
    else out.push([day]);
    prev = cur;
  }
  return out;
}
```

(c) 분석 구간 — old:
```ts
  const skip = excludedDays(d);
  let included = Array.from({ length: d.duration_days }, (_, i) => i + 1).filter((day) => !skip(day));
  if (included.length === 0) included = Array.from({ length: d.duration_days }, (_, i) => i + 1);
  const K = included.length;
```
new:
```ts
  const included = Array.from({ length: d.duration_days }, (_, i) => i + 1);
  const K = included.length;
```

(d) 비교 루프 — old:
```ts
  // 비교(처치군 vs 대조군)와 다중검정 보정
  type Pending = { mi: number; arm: Arm; r: ReturnType<typeof compare> };
  const pending: Pending[] = [];
  metricList.forEach((m, mi) => {
    const sa = m.stats.A;
    for (const arm of treat) {
      const sb = m.stats[arm];
      if (!sa || !sb || sa.n === 0 || sb.n === 0) continue;
      pending.push({ mi, arm, r: compare(m.key, sa, sb, alpha, seScale) });
    }
  });
```
new:
```ts
  // 층: 계획 배정비가 같은 연속 일차. stratified 이고 층이 둘 이상일 때만 층별로 비교해 합친다.
  const strata = strataOf(data.shares, win);
  const useStrata = d.analysis_mode === "stratified" && strata.length > 1;
  const stratifiedCompare = (key: MetricKey, arm: Arm) => {
    const parts = strata.flatMap((days) => {
      const sa = statOf(key, armAgg("A", "all", days));
      const sb = statOf(key, armAgg(arm, "all", days));
      return sa.n === 0 || sb.n === 0 ? [] : [compare(key, sa, sb, alpha, seScale)];
    });
    return parts.length ? combineStrata(parts, alpha) : null;
  };

  // 비교(처치군 vs 대조군)와 다중검정 보정
  type Pending = { mi: number; arm: Arm; r: ReturnType<typeof compare> };
  const pending: Pending[] = [];
  metricList.forEach((m, mi) => {
    const sa = m.stats.A;
    for (const arm of treat) {
      const sb = m.stats[arm];
      if (!sa || !sb || sa.n === 0 || sb.n === 0) continue;
      const r = useStrata ? stratifiedCompare(m.key, arm) : compare(m.key, sa, sb, alpha, seScale);
      if (r) pending.push({ mi, arm, r });
    }
  });
```

(e) 방법 문자열 — old:
```ts
${d.unit !== "user" ? ` · ${d.unit} 단위 SE` : ""}`;
```
new:
```ts
${d.unit !== "user" ? ` · ${d.unit} 단위 SE` : ""}${useStrata ? " · 층화(배정 비율이 같은 기간별) 합산" : ""}`;
```

(f) SIMPSON 플래그 — old:
```ts
  if (d.ramp === "10_week1_50_week2" && d.include_ramp_days) flags.push("SIMPSON_RISK");
```
new:
```ts
  if (d.ramp === "10_week1_50_week2" && d.analysis_mode === "pooled" && strata.length > 1) flags.push("SIMPSON_RISK");
```

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run lib/cases/baemin lib/admin lib/review lib/__tests__/theory.test.ts && npx tsc --noEmit`
Expected: 모두 통과. `grep -rn "include_ramp_days" lib components app` 가 아무것도 출력하지 않는다.
특히 기존 `#12`(simpson_demo, pooled)가 그대로 통과해야 한다(fixture 치환만 했다).

- [ ] **Step 6: 커밋**

```bash
git add -A lib
git commit -m "feat: 램프 구간 제외 대신 층화 분석 선택(analysis_mode)" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: P2 iOS 구버전 버그를 램프업 선택에 연결

`qa_old_ios` 필드를 삭제한다. 버그는 `phase === "p2" && ramp === "none"`일 때만 본 실험에 들어간다. 램프업(`10_50_100`, `10_week1_50_week2`)을 쓰면 램프 초기 크래시 가드레일에서 버그가 먼저 드러나 고친 뒤 시작한 것으로 보고 본 실험에는 버그가 없다(근거: 덱 「A/A로 점검하고, 조금씩 늘리고, 충분히 돌린다」, 위키 09편 1.2.1).

**Files:**
- Modify: `lib/cases/baemin/{schema,formMeta,defaults,effects,simulate}.ts`
- Test: `lib/cases/baemin/__tests__/baemin.test.ts`, `lib/lab/__tests__/lab.test.ts`

- [ ] **Step 1: 테스트 갱신·추가**

`baemin.test.ts` 편집:

(a) p2 팩토리 — old: `    phase: "p2", qa_old_ios: true, scope: { os: "all", surface: "all" },` → new: `    phase: "p2", scope: { os: "all", surface: "all" },`

(b) #6 — old:
```ts
  it("#6 P2 전체, 노출 기준, qa_old_ios=false: SRM, B 사용자 약 7천 명 부족", () => {
    const r = simulateBaemin(p2({ qa_old_ios: false, count_basis: "exposure" }));
```
new:
```ts
  it("#6 P2 전체, 노출 기준, 램프업 없음: SRM, B 사용자 약 7천 명 부족", () => {
    const r = simulateBaemin(p2({ count_basis: "exposure" }));
```

(c) #7 — old:
```ts
  it("#7 P2 전체, 배정 기준, qa_old_ios=true: SRM 없음, 이탈·전환 개선, aov 악화, gmv 차이 없음, first_order 이탈 악화", () => {
    const r = simulateBaemin(p2());
```
new:
```ts
  it("#7 P2 전체, 램프업으로 시작(버그 없음): SRM 없음, 이탈·전환 개선, aov 악화, gmv 차이 없음, first_order 이탈 악화", () => {
    const r = simulateBaemin(p2({ ramp: "10_50_100" }));
```

(d) #13 — old:
```ts
    expect(JSON.stringify(simulateBaemin(p2({ qa_old_ios: false, count_basis: "exposure" })))).toBe(
      JSON.stringify(simulateBaemin(p2({ qa_old_ios: false, count_basis: "exposure" }))),
    );
```
new:
```ts
    expect(JSON.stringify(simulateBaemin(p2({ count_basis: "exposure" })))).toBe(
      JSON.stringify(simulateBaemin(p2({ count_basis: "exposure" }))),
    );
```

(e) 파일 끝에 추가:
```ts
describe("P2 iOS 구버전 버그와 램프업", () => {
  it("램프업 없음(ramp none)이면 노출 기준에서 SRM, 배정 기준에서는 SRM 없이 크래시가 오른다", () => {
    const exposure = simulateBaemin(p2({ count_basis: "exposure" }));
    expect(exposure.flags).toContain("SRM");
    const assignment = simulateBaemin(p2({ count_basis: "assignment" }));
    expect(assignment.flags).not.toContain("SRM");
    expect(cmp(assignment, "crash").d).toBeGreaterThan(0.03);
    expect(cmp(assignment, "crash").significant).toBe(true);
  });

  it("램프업으로 시작하면 집계 기준이 exposure 여도 버그가 없다", () => {
    for (const ramp of ["10_50_100", "10_week1_50_week2"]) {
      const r = simulateBaemin(p2({ ramp, count_basis: "exposure" }));
      expect(r.flags, ramp).not.toContain("SRM");
      expect(cmp(r, "crash").significant, ramp).toBe(false);
    }
  });

  it("램프업을 쓴 P2 는 강사 전용 안내(_notes)가 붙고, 조 화면에는 보이지 않는다", () => {
    const r = simulateBaemin(p2({ ramp: "10_50_100" }));
    const notes = r.panels._notes as string[];
    expect(notes).toHaveLength(1);
    expect(notes[0]).toContain("램프업");
    expect(toTeamView(r).panels._notes).toBeUndefined();
    expect(simulateBaemin(p2()).panels._notes).toBeUndefined();
    expect(simulateBaemin(p1({ ramp: "10_50_100" })).panels._notes).toBeUndefined();
  });

  it("p2 스키마에는 qa_old_ios 가 없다", () => {
    expect(baeminPlugin.formMeta.p2.map((f) => f.name)).not.toContain("qa_old_ios");
    const v = validateDesign(p2());
    expect(v.ok).toBe(true);
    if (v.ok) expect("qa_old_ios" in v.design).toBe(false);
  });
});
```

`lib/lab/__tests__/lab.test.ts` — old:
```ts
  it("앞 Phase 설계를 이어받는다: P2 는 P1 의 메인 지표·가설을 유지하되 qa_old_ios=false 로 시작", () => {
```
new:
```ts
  it("앞 Phase 설계를 이어받는다: P2 는 P1 의 메인 지표·가설을 유지하되 집계 기준은 exposure 로 시작", () => {
```
old: `    expect(p2.qa_old_ios).toBe(false);` → new:
```ts
    expect(p2.qa_old_ios).toBeUndefined();
    expect(p2.count_basis).toBe("exposure");
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/cases/baemin lib/lab -t "P2|#6|#7|앞 Phase"`
Expected: FAIL (qa_old_ios 필드가 아직 있고, 버그가 `!d.qa_old_ios`로 결정돼서 ramp 와 무관).

- [ ] **Step 3: 구현**

`schema.ts` — old: `export const p2Schema = z.object({ phase: z.literal("p2"), ...common, qa_old_ios: z.boolean() });` → new: `export const p2Schema = z.object({ phase: z.literal("p2"), ...common });`

`defaults.ts` — old: `scope: { os: "all", surface: "all" }, qa_old_ios: false, count_basis: "exposure" }` → new: `scope: { os: "all", surface: "all" }, count_basis: "exposure" }`

`formMeta.ts` — old:
```ts
  p2: [
    ...common,
    { name: "qa_old_ios", label: "iOS 구버전에서 사전 QA를 했나요?", help: "하지 않았다면 구버전에서 문제가 생길 수 있어요.", type: "boolean" },
  ],
```
new:
```ts
  p2: common,
```

`effects.ts` — old: `    /** iOS 구버전 버그 (qa_old_ios=false) */` → new: `    /** iOS 구버전 버그 (P2 에서 램프업 없이 시작했을 때만 본 실험에 들어간다) */`

`simulate.ts` — old:
```ts
  const bug = d.phase === "p2" && !d.qa_old_ios && !aa;
```
new:
```ts
  // 램프업(점진 노출)으로 시작했다면 초기 단계의 크래시 가드레일에서 버그가 먼저 드러나 고친 뒤 시작한 것으로 본다.
  const bug = d.phase === "p2" && d.ramp === "none" && !aa;
```
`panels` 에 안내 추가 — old:
```ts
  if (truth) panels._truth = truth;
```
new:
```ts
  if (truth) panels._truth = truth;
  if (d.phase === "p2" && d.aa !== true && d.ramp !== "none") {
    panels._notes = ["램프업 초기 단계의 크래시 가드레일에서 iOS 구버전 버그가 먼저 드러나, 고친 뒤 다시 시작한 것으로 본다. 그래서 이 실험에는 버그가 없다."];
  }
```

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib && npx tsc --noEmit`
Expected: 전체 통과. 만약 "#7" 의 기대값이 ramp `10_50_100` 에서 실패하면 멈추고 실패 출력을 보고한다(설계 단계 탐침에서는 abandon -0.0199 유의, conv +0.0070 유의, aov -1,120원 유의, gmv 비유의, first_order 이탈 +0.0067 로 모두 충족했다).
`grep -rn "qa_old_ios" lib components app` 는 `lab.test.ts` 의 `toBeUndefined` 한 줄만 보여야 한다.

- [ ] **Step 5: 커밋**

```bash
git add -A lib
git commit -m "feat: P2 iOS 구버전 버그를 사전 QA 체크박스 대신 램프업 선택에 연결" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: 플래그 규칙을 이론 조건으로 + 플래그 설명(`_why`)

SHORT_DURATION(필요 표본 / 완전한 주 / 첫 주만), UNDERPOWERED(설계 검정력 기준), MULTIPLE_TESTING(가족 오류율 > 0.5), 그리고 임계값이 있는 SRM·SIMPSON_RISK 의 근거 문장을 `panels._why`에 남긴다.

**Files:**
- Modify: `lib/cases/baemin/simulate.ts`
- Test: `lib/cases/baemin/__tests__/baemin.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`baemin.test.ts` 끝에 추가:
```ts
describe("플래그 규칙(이론 근거)", () => {
  const why = (r: Readout) => (r.panels._why ?? {}) as Record<string, string>;

  it("SHORT_DURATION: 완전한 주(7의 배수)가 아니면 붙는다", () => {
    const r10 = simulateBaemin(p1({ duration_days: 10 }));
    expect(r10.flags).toContain("SHORT_DURATION");
    expect(why(r10).SHORT_DURATION).toContain("요일 주기");
    for (const days of [14, 21, 28]) expect(simulateBaemin(p1({ duration_days: days })).flags, `${days}일`).not.toContain("SHORT_DURATION");
  });

  it("SHORT_DURATION: 첫 주만 본 7일 설계에는 신기효과 문구가 붙는다", () => {
    const r7 = simulateBaemin(p1({ duration_days: 7 }));
    expect(r7.flags).toContain("SHORT_DURATION");
    expect(why(r7).SHORT_DURATION).toContain("첫 주");
  });

  it("SHORT_DURATION: 분석한 사용자 수가 필요 표본에 못 미치면 붙는다", () => {
    const r = simulateBaemin(p1({ duration_days: 14, mde_pp: 0.5 }));
    expect(r.flags).toContain("SHORT_DURATION");
    expect(why(r).SHORT_DURATION).toContain("필요 표본");
    // 14일은 완전한 주이고 표본이 충분한 기본 설계에는 붙지 않는다
    expect(simulateBaemin(p1()).flags).not.toContain("SHORT_DURATION");
  });

  it("SHORT_DURATION: 중간 확인으로 일찍 멈춘 설계는 요일 주기 규칙 대상이 아니다", () => {
    const peek = simulateBaemin(p1({ stopping: "peek_stop", duration_days: 28 }));
    expect(peek.stoppedAt!).toBeLessThan(28);
    if (peek.stoppedAt! > 7) {
      // 8일 이후에 멈췄다면 요일 주기 문구는 없어야 한다
      expect(why(peek).SHORT_DURATION ?? "").not.toContain("요일 주기");
    }
  });

  it("UNDERPOWERED: 달성 검정력이 설계에서 정한 검정력보다 낮을 때 붙는다", () => {
    const a = simulateBaemin(p3({ coupon_ops: "high" })).achievedPower!;
    for (const power of [0.7, 0.8, 0.9]) {
      const r = simulateBaemin(p3({ coupon_ops: "high", power }));
      expect(r.achievedPower, `power ${power}`).toBeCloseTo(a, 10);
      expect(r.flags.includes("UNDERPOWERED"), `power ${power}`).toBe(a < power);
    }
    expect(why(simulateBaemin(p3())).UNDERPOWERED).toContain("검정력");
  });

  it("MULTIPLE_TESTING: 보정 없이 Primary 가 아닌 비교가 14개 이상(가족 오류율 > 0.5, α=0.05)일 때 붙는다", () => {
    const secondary14 = ["aov", "gmv", "repurchase7", "cs_rate", "near_min_share"]; // 가드레일 2 + 보조 5 = 7개 지표 × 처치군 2 = 14
    const r14 = simulateBaemin(p4({ metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: secondary14 } }));
    expect(r14.flags).toContain("MULTIPLE_TESTING");
    expect(why(r14).MULTIPLE_TESTING).toContain("다중검정");
    // 가드레일 2 + 보조 4 = 6개 지표 × 처치군 2 = 12개: 1-0.95^12 ≈ 0.46
    const r12 = simulateBaemin(p4({ metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: secondary14.slice(0, 4) } }));
    expect(r12.flags).not.toContain("MULTIPLE_TESTING");
    // 보정하면 14개여도 붙지 않는다
    const bh = simulateBaemin(p4({ correction: "bh", metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: secondary14 } }));
    expect(bh.flags).not.toContain("MULTIPLE_TESTING");
    // P1 기본 설계(비교 3개)에는 붙지 않는다
    expect(simulateBaemin(p1()).flags).not.toContain("MULTIPLE_TESTING");
  });

  it("SRM 과 SIMPSON_RISK 에도 근거 문장이 붙고, 조 화면에는 _why 가 보이지 않는다", () => {
    const srm = simulateBaemin(p2({ count_basis: "exposure" }));
    expect(why(srm).SRM).toContain("0.001");
    const simpson = simulateBaemin(p1({ ramp: "10_week1_50_week2", metrics: { primary: "conv", guardrails: ["abandon"], secondary: [] } }), { mode: "simpson_demo" });
    expect(why(simpson).SIMPSON_RISK).toContain("심슨");
    expect(toTeamView(srm).panels._why).toBeUndefined();
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/cases/baemin/__tests__/baemin.test.ts -t "플래그 규칙"`
Expected: FAIL (`_why` 가 없고 10일 설계에 SHORT_DURATION 이 붙지 않는 등).

- [ ] **Step 3: 구현**

`simulate.ts` import 추가 — old: `import { designUnion, type Design, type MetricKey, type SimPhase } from "./schema";` → new:
```ts
import { theoryLabel } from "@/lib/theory";
import { designUnion, type Design, type MetricKey, type SimPhase } from "./schema";
```

플래그 블록 전체 교체 — old:
```ts
  // ── 플래그 (조 화면에는 내려보내지 않는다) ──
  const flags: Flag[] = [];
  if (srmRes.p < 0.001) flags.push("SRM");
  if (d.unit !== "user") flags.push("UNIT_MISMATCH");
  if (win.length < 14) flags.push("SHORT_DURATION");
  if (achievedPower !== undefined && achievedPower < 0.5) flags.push("UNDERPOWERED");
  if (d.stopping === "peek_stop") flags.push("PEEKED");
  if (d.ramp === "10_week1_50_week2" && d.analysis_mode === "pooled" && strata.length > 1) flags.push("SIMPSON_RISK");
  if (correction === "none" && pending.length >= 10) flags.push("MULTIPLE_TESTING");
  if (d.phase === "p3" && !d.trigger_logging) flags.push("SELECTION_BIAS");
```
new:
```ts
  // ── 플래그 (조 화면에는 내려보내지 않는다). 임계값이 있는 플래그는 이유를 _why 에 남긴다(강사·정답 공개 전용). ──
  const flags: Flag[] = [];
  const why: Partial<Record<Flag, string>> = {};
  const raise = (f: Flag, reason?: string) => {
    flags.push(f);
    if (reason) why[f] = reason;
  };
  const num = (x: number) => Math.round(x).toLocaleString("ko-KR");
  const label = (...k: Parameters<typeof theoryLabel>[0][]) => `[근거: ${k.map(theoryLabel).join(", ")}]`;

  if (srmRes.p < 0.001) {
    raise("SRM", `그룹별 사용자 수의 배정 비율 검정 p=${srmRes.p.toExponential(1)}로, 우연으로 보기 어려운 어긋남이에요. 이 앱은 업계 관례인 0.001을 기준으로 해요. ${label("srm")}`);
  }
  if (d.unit !== "user") raise("UNIT_MISMATCH");

  const shortReasons: string[] = [];
  const analysedA = armAgg("A").users;
  if (planned && analysedA < planned.nPerArm) {
    shortReasons.push(`분석한 그룹당 사용자가 ${num(analysedA)}명으로, 설계한 α·검정력·MDE에 필요한 ${num(planned.nPerArm)}명보다 적어요. ${label("alpha_power", "mde")}`);
  }
  if (stopIdx === K - 1 && win.length % 7 !== 0) {
    shortReasons.push(`분석 구간 ${win.length}일이 요일 주기(7일)의 배수가 아니라 요일별 패턴이 한쪽으로 치우쳐요. ${label("duration")}`);
  }
  if (win.length <= 7) {
    shortReasons.push(`분석 구간이 ${win.length}일로 첫 주에 그쳐서 신기효과가 섞였을 수 있어요. ${label("duration", "novelty")}`);
  }
  if (shortReasons.length) raise("SHORT_DURATION", shortReasons.join(" "));

  if (achievedPower !== undefined && achievedPower < d.power) {
    raise("UNDERPOWERED", `달성 검정력 ${Math.round(achievedPower * 100)}%가 설계에서 정한 ${Math.round(d.power * 100)}%보다 낮아요. ${label("error_power")}`);
  }
  if (d.stopping === "peek_stop") raise("PEEKED");
  if (d.ramp === "10_week1_50_week2" && d.analysis_mode === "pooled" && strata.length > 1) {
    raise("SIMPSON_RISK", `기간마다 A:B 배정 비율이 달라졌는데(${strata.length}개 구간) 합쳐서 분석했어요. 같은 비율끼리 나눠 비교하면 결론이 달라질 수 있어요. ${label("simpson")}`);
  }
  const familyM = pending.filter((p) => metricList[p.mi].role !== "P").length;
  const familyError = 1 - (1 - alpha) ** familyM;
  if (correction === "none" && familyError > 0.5) {
    raise("MULTIPLE_TESTING", `보정 없이 Primary가 아닌 비교 ${familyM}개를 보면, 효과가 전혀 없어도 하나라도 유의하게 나올 확률이 ${Math.round(familyError * 100)}%예요. ${label("multiple_testing")}`);
  }
  if (d.phase === "p3" && !d.trigger_logging) raise("SELECTION_BIAS");
  if (Object.keys(why).length) panels._why = why;
```
주의: `panels._why` 는 `return` 전에 설정되므로 위 위치(플래그 블록 끝)가 맞다. `planned` 변수는 `withTruth` 블록에서 만들어지며 블록 밖(`let planned`)에 선언돼 있어 이 시점에 접근 가능하다. `stopIdx`, `K`, `win`, `strata`, `pending`, `metricList`, `alpha`, `correction` 도 모두 앞에서 정의돼 있다.

- [ ] **Step 4: 통과 확인**

Run: `npx vitest run lib && npx tsc --noEmit`
Expected: 전체 통과. 기존 `#2`(7일 SHORT_DURATION, 14일은 없음), `#8`(UNDERPOWERED), `#11`(MULTIPLE_TESTING, 비교 16개), 보정 시 사라짐, `board.test`(7일 SHORT_DURATION), 진짜 효과 0 설계 not UNDERPOWERED 가 모두 유지돼야 한다. 실패하면 멈추고 보고한다.

- [ ] **Step 5: 커밋**

```bash
git add -A lib
git commit -m "feat: SHORT_DURATION·UNDERPOWERED·MULTIPLE_TESTING 을 이론 조건으로 바꾸고 플래그 설명(_why) 추가" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 7: 결정 판정 `judge.ts`

조의 실제 Readout 으로 결정 옵션을 판정하는 순수 함수. 먼저 타입과 이론 개념을 추가한다.

**Files:**
- Modify: `lib/cases/types.ts`, `lib/theory.ts`
- Create: `lib/cases/baemin/judge.ts`, `lib/cases/baemin/__tests__/judge.test.ts`

- [ ] **Step 1: 타입과 `decision` 개념 추가**

`lib/cases/types.ts` — old (파일 끝의 마지막 doc 주석 줄과 클래스 사이):
```ts
/** 시뮬레이션을 돌릴 수 없는 설계. 메시지는 조 화면에 그대로 보여준다. */
export class SimulationRejected extends Error {
```
new:
```ts
/** 결정 옵션의 판정. 근거 문장(reason)은 정답 공개 뒤에만 조에게 보인다. */
export type Verdict = "correct" | "partial" | "wrong";
export type Judgement = { verdict: Verdict; reason: string };

/** 시뮬레이션을 돌릴 수 없는 설계. 메시지는 조 화면에 그대로 보여준다. */
export class SimulationRejected extends Error {
```
같은 파일 `CasePlugin` 인터페이스 — old:
```ts
  rubric: Record<string, string>;
  reveal: Record<string, string>;
}
```
new:
```ts
  rubric: Record<string, string>;
  reveal: Record<string, string>;
  /** 서버 전용: 조가 고른 결정 옵션을 그 조의 실제 결과(Readout)로 판정한다. 알 수 없는 옵션이면 null. */
  judge?(phase: string, optionId: string, run: { design: Record<string, unknown>; result: Readout }): Judgement | null;
}
```
같은 파일 — old: `export type ClientCase = Omit<CasePlugin, "simulate" | "rubric" | "reveal">;` → new: `export type ClientCase = Omit<CasePlugin, "simulate" | "rubric" | "reveal" | "judge">;`

`lib/theory.ts` — `THEORY` 표의 `data_informed` 줄 바로 앞에 추가:
```ts
  decision: e("배포·접기·재실험 결정", 5, { note: "신뢰구간 전체가 0보다 위이고 크기도 의미 있으면 배포하되, 비용과 리스크를 확인하고 단계적으로 출시해요." }),
```
(old: `  data_informed: e("데이터 기반 의사결정", 5,` → new: 위 줄 + 줄바꿈 + 같은 `  data_informed: e("데이터 기반 의사결정", 5,`. 편집 도구에서 old 는 이 줄의 앞부분만 쓴다.)

`STEP_THEORY.s6_final` — old: `  s6_final: ["predefine", "inference", "ethics"],` → new: `  s6_final: ["predefine", "inference", "decision", "ethics"],`

배민 `meta.theory` — `lib/cases/baemin/ui.ts` old: `"sequential", "ab_n"] as TheoryKey[],` → new: `"sequential", "ab_n", "decision"] as TheoryKey[],`

Run: `npx vitest run lib/__tests__/theory.test.ts && npx tsc --noEmit`
Expected: 통과(`decision` 이 고아가 아니고 note ≤120자, 폼 문구에 note 문장 없음).

- [ ] **Step 2: 실패하는 판정 테스트 작성**

`lib/cases/baemin/__tests__/judge.test.ts`:
```ts
/**
 * 결정 판정 (설계 문서 A). 분류 로직은 손으로 만든 최소 Readout 으로 검증하고,
 * 실제 시뮬레이터 결과로는 사례 문서의 교육 시나리오가 의도한 정답이 나오는지 확인한다.
 */
import { describe, expect, it } from "vitest";
import type { Comparison, Readout } from "@/lib/sim/core";
import { baeminPlugin, simulateBaemin } from "../index";
import { judgeBaemin } from "../judge";

const hyp = { action: "가게홈에서 최소금액 달성 여부를 안내해요", behavior: "장바구니를 오가지 않고 바로 주문해요", impact: "장바구니 이탈률이 줄어요" };
type D = Record<string, unknown>;

const base = (over: D = {}): D => ({
  phase: "p1", hypothesis: hyp, scope: { os: "android", surface: "store_home" }, unit: "user",
  metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov"] },
  alpha: 0.05, power: 0.8, mde_pp: 2, duration_days: 14, allocation: 1, ramp: "none", analysis_mode: "pooled",
  stopping: "fixed", count_basis: "assignment", ...over,
});
const p2 = (over: D = {}) => base({ phase: "p2", scope: { os: "all", surface: "all" }, metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov", "gmv", "near_min_share"] }, ...over });
const p3 = (over: D = {}) => base({ phase: "p3", trigger_logging: true, coupon_ops: "low", scope: { os: "all", surface: "all" }, metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: ["aov"] }, ...over });
const p4 = (over: D = {}) => base({ phase: "p4", arms: ["A", "B"], correction: "none", scope: { os: "all", surface: "all" }, metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: ["aov"] }, ...over });

// ── 손으로 만든 Readout ──
const cmpOf = (arm: string, d: number, ci: [number, number], significant: boolean): Comparison =>
  ({ vs: "A", arm, d, ci, rel: d, relCi: ci, p: significant ? 0.001 : 0.5, win: 0.5, significant, method: "test" }) as Comparison;
type M = { key: string; role: "P" | "G" | "S"; type: "prop" | "mean"; label: string; cmps: Comparison[] };
const prop = (key: string, label: string, role: M["role"], cmps: Comparison[]): M => ({ key, label, role, type: "prop", cmps });
const readout = (metrics: M[], over: Partial<Readout> = {}): Readout =>
  ({
    caseKey: "baemin", phase: "p1", designHash: "h", periods: [], stoppedAt: 14,
    srm: { counts: [1000, 1000], ratios: [0.5, 0.5], p: 0.9 },
    metrics: metrics.map((m) => ({ key: m.key, label: m.label, role: m.role, type: m.type, arms: {}, comparisons: m.cmps })),
    panels: {}, flags: [], ...over,
  }) as unknown as Readout;
const judge = (design: D, result: Readout, option: string) => {
  const phase = design.phase as string;
  return judgeBaemin(phase, option, { design, result })!;
};
const verdicts = (design: D, result: Readout, options: string[]) => Object.fromEntries(options.map((o) => [o, judge(design, result, o).verdict]));
const P1_OPTS = ["deploy", "no_deploy", "extend_rerun"];

describe("judgeBaemin: 분류", () => {
  it("구간 전체가 0 바깥이고 효과가 MDE 이상(가드레일 이상 없음): 배포가 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "correct", no_deploy: "wrong", extend_rerun: "partial" });
    expect(judge(base(), r, "deploy").reason).toContain("MDE");
    expect(judge(base(), r, "deploy").reason).toMatch(/Ch\d · /);
  });

  it("유의하지만 효과가 MDE 보다 작음: 배포·접기는 부분, 재실험은 오답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.012, [-0.02, -0.004], true)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "partial", no_deploy: "partial", extend_rerun: "wrong" });
  });

  it("구간이 0 을 포함하고 ±MDE 안에 들어감: 접는 게 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.002, [-0.01, 0.006], false)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "wrong", no_deploy: "correct", extend_rerun: "partial" });
  });

  it("구간이 0 을 포함하고 MDE 보다 넓음: 재실험이 정답, 접는 건 성급", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.01, [-0.04, 0.02], false)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "wrong", no_deploy: "wrong", extend_rerun: "correct" });
  });

  it("Primary 가 유의하게 나빠짐: 배포 안 함이 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", 0.02, [0.01, 0.03], true)])]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "wrong", no_deploy: "correct", extend_rerun: "partial" });
  });

  it("분석 구간이 7일 이하이면 효과가 커도 기간을 늘린 재실험이 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])], { stoppedAt: 7 });
    expect(verdicts(base({ duration_days: 7 }), r, P1_OPTS)).toEqual({ deploy: "partial", no_deploy: "wrong", extend_rerun: "correct" });
    expect(judge(base({ duration_days: 7 }), r, "extend_rerun").reason).toContain("신기효과");
  });

  it("시스템 가드레일(크래시)이 유의하게 나빠짐: 중단 후 원인을 고쳐 재실험", () => {
    const r = readout([
      prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)]),
      prop("crash", "앱 크래시율", "G", [cmpOf("B", 0.002, [0.001, 0.003], true)]),
    ]);
    expect(verdicts(base(), r, P1_OPTS)).toEqual({ deploy: "wrong", no_deploy: "partial", extend_rerun: "correct" });
  });

  it("SRM 이 있으면 효과가 좋아 보여도 중단. 재실험 선택지가 없는 P2 에서는 배포 안 함이 정답", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])], { flags: ["SRM"] });
    expect(verdicts(p2(), r, ["full_deploy", "no_deploy", "deploy_followup"])).toEqual({ full_deploy: "wrong", no_deploy: "correct", deploy_followup: "wrong" });
    expect(judge(p2(), r, "no_deploy").reason).toContain("배정 비율");
  });

  it("Primary 는 좋아졌지만 비즈니스 가드레일(평균주문금액)이 유의하게 나빠짐: 배포하되 후속 실험", () => {
    const aov = { key: "aov", label: "평균주문금액(원)", role: "S" as const, type: "mean" as const, cmps: [cmpOf("B", -1100, [-1500, -700], true)] };
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)]), aov]);
    expect(verdicts(p2(), r, ["full_deploy", "no_deploy", "deploy_followup"])).toEqual({ full_deploy: "partial", no_deploy: "wrong", deploy_followup: "correct" });
    expect(judge(p2(), r, "deploy_followup").reason).toContain("평균주문금액");
  });

  it("고객 유형 하나에서 Primary 가 반대로 유의하게 나빠져도 같은 위험으로 본다 (P2)", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])], {
      panels: { segments: { first_order: { abandon: { d: 0.02, significant: true } }, general: { abandon: { d: -0.03, significant: true } } } },
    });
    expect(judge(p2(), r, "deploy_followup").verdict).toBe("correct");
    expect(judge(p2(), r, "deploy_followup").reason).toContain("첫 주문 혜택");
  });

  it("P3: 문구를 보는 트리거 사용자 비율로 효과를 환산해서 분류한다", () => {
    // 전체 conv 차이 +0.2%p, 구간 [-0.2, +0.6]%p: 그대로면 ±MDE(2%p) 안이지만, B 의 10%만 문구를 봤으므로 10배로 환산하면 MDE 보다 넓다.
    const r = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.002, [-0.002, 0.006], false)])], {
      srm: { counts: [1000, 1000], ratios: [0.5, 0.5], p: 0.9 },
      panels: { trigger: { biased: { exposed: { n: 100 } } } },
    });
    expect(verdicts(p3(), r, ["rollback", "deploy", "expand_rerun"])).toEqual({ rollback: "wrong", deploy: "wrong", expand_rerun: "correct" });
    expect(judge(p3(), r, "expand_rerun").reason).toContain("트리거 사용자 기준");
    // 트리거 정보가 없으면(환산 없음) 같은 숫자는 접는 쪽이 정답
    const plain = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.002, [-0.002, 0.006], false)])]);
    expect(judge(p3(), plain, "rollback").verdict).toBe("correct");
  });

  it("P4: 두 안 모두 효과가 확인되지 않으면 둘 다 배포 안 함이 정답, 한 안이 좋으면 그 안 배포가 정답", () => {
    const nothing = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.001, [-0.003, 0.005], false), cmpOf("C", 0.0, [-0.004, 0.004], false)])]);
    const d = p4({ arms: ["A", "B", "C"] });
    expect(verdicts(d, nothing, ["deploy_b", "deploy_c", "none_learn"])).toEqual({ deploy_b: "wrong", deploy_c: "wrong", none_learn: "correct" });
    const bWins = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.03, [0.02, 0.04], true), cmpOf("C", 0.0, [-0.004, 0.004], false)])]);
    expect(verdicts(d, bWins, ["deploy_b", "deploy_c", "none_learn"])).toEqual({ deploy_b: "correct", deploy_c: "wrong", none_learn: "wrong" });
  });

  it("실험에 넣지 않은 그룹(C)의 배포는 오답이다", () => {
    const r = readout([prop("conv", "커머스 주문전환율", "P", [cmpOf("B", 0.001, [-0.003, 0.005], false)])]);
    const j = judge(p4(), r, "deploy_c");
    expect(j.verdict).toBe("wrong");
    expect(j.reason).toContain("C 그룹");
  });

  it("알 수 없는 Phase·옵션이거나 설계가 잘못되면 null", () => {
    const r = readout([prop("abandon", "장바구니 이탈률", "P", [cmpOf("B", -0.03, [-0.04, -0.02], true)])]);
    expect(judgeBaemin("p9", "deploy", { design: base(), result: r })).toBeNull();
    expect(judgeBaemin("p1", "nope", { design: base(), result: r })).toBeNull();
    expect(judgeBaemin("p1", "deploy", { design: { phase: "p1" }, result: r })).toBeNull();
  });
});

describe("judgeBaemin: 실제 시뮬레이터 결과", () => {
  const run = (design: D) => ({ design, result: simulateBaemin(design) });
  const pick = (design: D, options: string[]) => {
    const rr = run(design);
    return Object.fromEntries(options.map((o) => [o, judgeBaemin(design.phase as string, o, rr)!.verdict]));
  };

  it("P1 14일: 배포가 정답, 7일: 기간 연장 재실험이 정답", () => {
    expect(pick(base(), P1_OPTS)).toEqual({ deploy: "correct", no_deploy: "wrong", extend_rerun: "partial" });
    expect(pick(base({ duration_days: 7 }), P1_OPTS)).toEqual({ deploy: "partial", no_deploy: "wrong", extend_rerun: "correct" });
  });

  it("P2 노출 기준·램프업 없음(SRM): 배포 안 함이 정답", () => {
    expect(pick(p2({ count_basis: "exposure" }), ["full_deploy", "no_deploy", "deploy_followup"])).toEqual({ full_deploy: "wrong", no_deploy: "correct", deploy_followup: "wrong" });
  });

  it("P2 램프업으로 시작: 평균주문금액 악화 때문에 후속 실험을 붙인 배포가 정답", () => {
    expect(pick(p2({ ramp: "10_50_100" }), ["full_deploy", "no_deploy", "deploy_followup"])).toEqual({ full_deploy: "partial", no_deploy: "wrong", deploy_followup: "correct" });
  });

  it("P3 쿠폰 운영 low: 노출 조건을 넓혀 재실험이 정답, 롤백은 오답", () => {
    const v = pick(p3(), ["rollback", "deploy", "expand_rerun"]);
    expect(v.expand_rerun).toBe("correct");
    expect(v.rollback).toBe("wrong");
    expect(v.deploy).toBe("wrong");
  });

  it("P4 기본(A/B/C, 보정 없음): 둘 다 배포 안 함이 정답", () => {
    const d = p4({ arms: ["A", "B", "C"], metrics: { primary: "conv", guardrails: ["abandon", "crash"], secondary: ["aov", "gmv", "repurchase7", "cs_rate", "near_min_share", "min_reach"] } });
    expect(pick(d, ["deploy_b", "deploy_c", "none_learn"])).toEqual({ deploy_b: "wrong", deploy_c: "wrong", none_learn: "correct" });
  });

  it("플러그인에 judge 가 연결돼 있다", () => {
    expect(typeof baeminPlugin.judge).toBe("function");
  });
});
```

- [ ] **Step 3: 실패 확인**

Run: `npx vitest run lib/cases/baemin/__tests__/judge.test.ts`
Expected: FAIL (`../judge` 모듈 없음).

- [ ] **Step 4: `judge.ts` 구현**

`lib/cases/baemin/judge.ts`:
```ts
/**
 * 결정 판정 (docs/superpowers/specs/2026-10-09-baemin-theory-logic-design.md 의 A).
 * 옵션마다 정답을 고정해 두지 않고, 조가 실제로 본 결과(Readout)를 덱 「'유의하다'에서 멈추지 말고 결정으로 닫는다」의
 * 네 갈래(중단 / 배포 / 접기 / 재실험)와 「효과 크기 × 비용 × 리스크」에 비추어 판정한다. 순수 함수이며 서버에서만 쓴다.
 */
import type { Comparison, MetricResult, Readout } from "@/lib/sim/core";
import { theoryLabel, type TheoryKey } from "@/lib/theory";
import type { Judgement, Verdict } from "../types";
import { designUnion, type Design, type MetricKey } from "./schema";

type Action = "deploy" | "followup" | "stop" | "rerun";
type State = "halt" | "deploy_clean" | "deploy_risk" | "deploy_novelty" | "small_sig" | "null_narrow" | "null_wide" | "bad";

/** Phase 별 결정 옵션이 가리키는 행동. P4 의 deploy_b / deploy_c 는 각각 B / C 그룹의 deploy 다. */
const ACTIONS: Record<string, Record<string, Action>> = {
  p1: { deploy: "deploy", no_deploy: "stop", extend_rerun: "rerun" },
  p2: { full_deploy: "deploy", no_deploy: "stop", deploy_followup: "followup" },
  p3: { deploy: "deploy", rollback: "stop", expand_rerun: "rerun" },
  p4: { deploy_b: "deploy", deploy_c: "deploy", none_learn: "stop" },
};
/** 결정 선택지에 "다시 실험"이 있는 Phase. 없으면 중단·재실험이 필요한 상황에서 "배포 안 함"이 가장 가까운 선택이다. */
const HAS_RERUN: Record<string, boolean> = { p1: true, p2: false, p3: true, p4: false };
const OPTION_ARM: Record<string, "B" | "C"> = { deploy_b: "B", deploy_c: "C" };

const LOWER_IS_BETTER = new Set<MetricKey>(["abandon", "crash", "load_time", "cs_rate"]);
const SYSTEM = new Set<MetricKey>(["crash", "load_time"]);
const BUSINESS = new Set<MetricKey>(["conv", "aov", "gmv"]);

type Row = { verdict: Verdict; tail: string };
const r = (verdict: Verdict, tail: string): Row => ({ verdict, tail });

const TABLE: Record<State, Record<Action, Row>> = {
  halt: {
    deploy: r("wrong", "그래서 이 결과로 배포하면 안 돼요."),
    followup: r("wrong", "그래서 이 결과로 배포하면 안 돼요."),
    stop: r("partial", "배포하지 않는 건 맞지만, 원인을 고쳐 다시 실험하는 편이 더 좋아요."),
    rerun: r("correct", "원인을 고쳐 다시 실험하는 게 맞아요."),
  },
  deploy_clean: {
    deploy: r("correct", "그래서 배포가 맞아요. 비용과 리스크를 확인하면서 단계적으로 출시하세요."),
    followup: r("correct", "배포하면서 Secondary·Driver 지표에서 다음 가설을 찾는 방향이 맞아요."),
    stop: r("wrong", "접을 근거가 없어요."),
    rerun: r("partial", "구간이 이미 0 바깥이라 재실험이 꼭 필요하진 않아요. 시간과 비용을 더 쓰는 선택이에요."),
  },
  deploy_risk: {
    deploy: r("partial", "배포하더라도 위 악화를 확인하고 단계적으로 출시해야 해서, 바로 전면 배포하기엔 부족해요."),
    followup: r("correct", "배포하면서 위 악화를 다음 실험의 재료로 삼는 게 맞아요."),
    stop: r("wrong", "Primary 개선까지 버리게 돼요."),
    rerun: r("partial", "악화 원인을 확인하는 재실험도 가능하지만 Primary 개선은 이미 확인됐어요."),
  },
  deploy_novelty: {
    deploy: r("partial", "분석 기간이 짧아 효과가 부풀었을 수 있어서, 바로 배포하기엔 근거가 부족해요."),
    followup: r("partial", "분석 기간이 짧아 효과가 부풀었을 수 있어서, 먼저 기간을 늘려 확인하는 편이 좋아요."),
    stop: r("wrong", "Primary 개선까지 버리게 돼요."),
    rerun: r("correct", "기간을 늘려 효과가 안정되는지 보는 게 맞아요."),
  },
  small_sig: {
    deploy: r("partial", "구현·유지 비용이 이 효과를 넘는지 확인한 근거가 필요해요."),
    followup: r("partial", "구현·유지 비용이 이 효과를 넘는지 확인한 근거가 필요해요."),
    stop: r("partial", "비용이 효과보다 크다면 접는 것도 방법이에요."),
    rerun: r("wrong", "구간이 이미 좁아서 재실험으로 알게 될 것이 적어요."),
  },
  null_narrow: {
    deploy: r("wrong", "효과가 있어도 MDE보다 작은 변화에 배포 비용을 쓰는 셈이에요."),
    followup: r("wrong", "효과가 있어도 MDE보다 작은 변화에 배포 비용을 쓰는 셈이에요."),
    stop: r("correct", "그래서 접는 게 맞아요. 이번 실험에서 배운 점을 정리해 다음 가설로 이어가세요."),
    rerun: r("partial", "구간이 이미 좁아서 재실험의 가치가 낮아요."),
  },
  null_wide: {
    deploy: r("wrong", "효과가 확인되지 않은 채 배포하는 셈이에요."),
    followup: r("wrong", "효과가 확인되지 않은 채 배포하는 셈이에요."),
    stop: r("wrong", "효과가 없다는 걸 확인한 게 아니라 아직 모르는 상태라서, 접는 건 성급해요."),
    rerun: r("correct", "그래서 표본·기간을 늘리거나 설계를 고쳐 다시 실험하는 게 맞아요."),
  },
  bad: {
    deploy: r("wrong", "Primary가 나빠졌는데 배포하는 셈이에요."),
    followup: r("wrong", "Primary가 나빠졌는데 배포하는 셈이에요."),
    stop: r("correct", "그래서 배포하지 않는 게 맞아요."),
    rerun: r("partial", "원인을 확인하는 재실험은 가능하지만 이 결과로 배포해선 안 돼요."),
  },
};

/** 선택지에 재실험이 없는 Phase 에서는 중단·재실험이 필요한 상황의 "배포 안 함"을 가장 가까운 정답으로 본다. */
function rowFor(phase: string, state: State, action: Action): Row {
  if (action === "stop" && !HAS_RERUN[phase]) {
    if (state === "halt") return r("correct", "그래서 이 결과로 배포하지 말고, 원인을 고친 뒤 다시 실험해야 해요.");
    if (state === "null_wide") return r("partial", "재실험이 필요한 상황이지만 이 단계에는 재실험 선택지가 없어서 '배포 안 함'이 가장 가까워요.");
  }
  return TABLE[state][action];
}

const cite = (...keys: TheoryKey[]) => `[근거: ${keys.map(theoryLabel).join(", ")}]`;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const signed = (x: number, digits: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(digits)}`;

type Kind = "good_big" | "good_small" | "bad" | "null_narrow" | "null_wide";

/** 한 그룹(arm)의 Primary 비교를 덱의 기준으로 분류한다. share 가 있으면 트리거 사용자 기준으로 환산한다(P3). */
function classify(m: MetricResult, c: Comparison, mde: number, share: number | null): { kind: Kind; text: string } {
  const key = m.key as MetricKey;
  const isProp = m.type === "prop";
  const scale = share && share > 0 ? 1 / share : 1;
  const effect = (isProp ? c.d : c.rel) * scale;
  const [lo0, hi0] = isProp ? c.ci : c.relCi;
  const lo = lo0 * scale;
  const hi = hi0 * scale;
  const dir = LOWER_IS_BETTER.has(key) ? -1 : 1;
  const gEff = dir * effect;
  const gLo = dir > 0 ? lo : -hi;
  const gHi = dir > 0 ? hi : -lo;
  const unit = isProp ? "%p" : "%";
  const digits = isProp ? 2 : 1;
  const scope = scale !== 1 ? "트리거 사용자 기준으로 환산한 " : "";
  const base = `Primary(${m.label})의 ${scope}차이는 ${signed(effect, digits)}${unit}, 95% 구간은 [${signed(lo, digits)}${unit}, ${signed(hi, digits)}${unit}]이고 MDE는 ${(mde * 100).toFixed(1)}${unit}예요.`;
  if (c.significant) {
    if (gEff < 0) return { kind: "bad", text: `${base} 유의하게 나빠졌어요.` };
    return gEff >= mde
      ? { kind: "good_big", text: `${base} 구간 전체가 0 바깥이고 효과가 MDE 이상이에요.` }
      : { kind: "good_small", text: `${base} 유의하지만 효과가 MDE보다 작아요.` };
  }
  if (gLo > -mde && gHi < mde) return { kind: "null_narrow", text: `${base} 구간이 0을 포함하고 ±MDE 안에 들어 있어서, 효과가 있어도 MDE보다 작아요.` };
  return { kind: "null_wide", text: `${base} 구간이 0을 포함하고 MDE보다 넓어서, 효과가 있는지 없는지 아직 알 수 없어요.` };
}

/** Primary 가 아닌 지표 중 유의하게 나빠진 시스템·비즈니스 지표 이름 */
function harms(readout: Readout, arm: string, primary: MetricKey): { system: string[]; business: string[] } {
  const system: string[] = [];
  const business: string[] = [];
  for (const m of readout.metrics) {
    const key = m.key as MetricKey;
    if (key === primary) continue;
    const c = m.comparisons.find((x) => x.arm === arm);
    if (!c || !c.significant) continue;
    const dir = LOWER_IS_BETTER.has(key) ? -1 : 1;
    if (dir * (m.type === "prop" ? c.d : c.rel) >= 0) continue;
    if (SYSTEM.has(key)) system.push(m.label);
    else if (BUSINESS.has(key)) business.push(m.label);
  }
  return { system, business };
}

/** 고객 유형별 표에서 Primary 가 반대로 유의하게 나빠진 유형 (P2 의 세그먼트 패널) */
function segmentHarm(readout: Readout, primary: MetricKey): string | null {
  const seg = readout.panels.segments as Record<string, Record<string, { d?: number; significant?: boolean }>> | undefined;
  if (!seg) return null;
  const dir = LOWER_IS_BETTER.has(primary) ? -1 : 1;
  const names: Record<string, string> = { general: "일반", first_order: "첫 주문 혜택", member: "멤버십" };
  const out: string[] = [];
  for (const [type, row] of Object.entries(seg)) {
    const cell = row?.[primary];
    if (cell?.significant && typeof cell.d === "number" && dir * cell.d < 0) out.push(names[type] ?? type);
  }
  return out.length ? `${out.join("·")} 고객에서는 Primary가 반대로 유의하게 나빠졌어요.` : null;
}

type ArmState = { arm: string; state: State; text: string };

function stateOf(phase: string, readout: Readout, design: Design, arm: string): ArmState {
  const primary = design.metrics.primary;
  const m = readout.metrics.find((x) => x.key === primary);
  const c = m?.comparisons.find((x) => x.arm === arm);
  const mde = design.mde_pp / 100;
  const h = harms(readout, arm, primary);
  const stoppedAt = readout.stoppedAt ?? design.duration_days;

  const srm = readout.flags.includes("SRM");
  if (srm || h.system.length) {
    const why = srm ? "그룹별 사용자 수가 계획한 배정 비율과 어긋나요" : `${h.system.join("·")}이(가) 유의하게 나빠졌어요`;
    return { arm, state: "halt", text: `${why}. 결과를 해석하기 전에 원인부터 찾아 고쳐야 해요. ${srm ? cite("srm", "decision") : cite("metric_layers", "decision")}` };
  }
  if (!m || !c) return { arm, state: "null_wide", text: "Primary 지표를 비교할 데이터가 없어서 효과를 알 수 없어요." };

  let share: number | null = null;
  if (phase === "p3") {
    const trig = readout.panels.trigger as { biased?: { exposed?: { n?: number } } } | undefined;
    const exposed = trig?.biased?.exposed?.n ?? 0;
    const bUsers = readout.srm?.counts?.[1] ?? 0;
    share = exposed > 0 && bUsers > 0 ? exposed / bUsers : null;
  }
  const p = classify(m, c, mde, share);
  const dilution = share ? ` 문구를 보는 사용자가 B의 ${pct(share)}뿐이라 전체 지표는 효과가 희석돼요. ${cite("trigger")}` : "";
  const risks: string[] = [];
  if (h.business.length) risks.push(`${h.business.join("·")}이(가) 유의하게 나빠졌어요.`);
  const seg = phase === "p2" ? segmentHarm(readout, primary) : null;
  if (seg) risks.push(seg);
  const riskText = risks.length ? ` 다만 ${risks.join(" ")}` : "";

  switch (p.kind) {
    case "bad":
      return { arm, state: "bad", text: `${p.text}${riskText} ${cite("decision")}` };
    case "good_big":
      if (risks.length) return { arm, state: "deploy_risk", text: `${p.text}${riskText} ${cite("decision")}` };
      if (stoppedAt <= 7) {
        return { arm, state: "deploy_novelty", text: `${p.text} 하지만 분석 구간이 ${stoppedAt}일로 첫 주에 그쳐서 신기효과가 섞였을 수 있어요. ${cite("duration", "novelty")}` };
      }
      return { arm, state: "deploy_clean", text: `${p.text} 가드레일에도 이상이 없어요. ${cite("decision")}` };
    case "good_small":
      return { arm, state: "small_sig", text: `${p.text}${riskText} ${cite("decision", "mde")}` };
    case "null_narrow":
      return { arm, state: "null_narrow", text: `${p.text}${dilution}${riskText} ${cite("decision")}` };
    default:
      return { arm, state: "null_wide", text: `${p.text}${dilution}${riskText} ${cite("decision", "inference")}` };
  }
}

const SEVERITY: Record<Verdict, number> = { correct: 0, partial: 1, wrong: 2 };

/** 결정 옵션을 조의 실제 결과로 판정한다. 알 수 없는 Phase·옵션이거나 설계를 읽을 수 없으면 null. */
export function judgeBaemin(phase: string, optionId: string, run: { design: Record<string, unknown>; result: Readout }): Judgement | null {
  const action = ACTIONS[phase]?.[optionId];
  if (!action) return null;
  const parsed = designUnion.safeParse(run.design);
  if (!parsed.success) return null;
  const design = parsed.data;
  const readout = run.result;

  if (phase === "p4") {
    const arms = ["B", "C"].filter((a) => readout.metrics.some((m) => m.comparisons.some((c) => c.arm === a)));
    const states = arms.map((a) => stateOf(phase, readout, design, a));
    if (optionId === "none_learn") {
      if (states.length === 0) return null;
      // 둘 다 배포하지 않는 선택은 가장 나쁜 그룹 기준으로 판정한다(한 그룹이라도 배포할 만하면 접는 건 틀린다).
      let worst = states[0];
      for (const s of states.slice(1)) {
        if (SEVERITY[rowFor(phase, s.state, "stop").verdict] > SEVERITY[rowFor(phase, worst.state, "stop").verdict]) worst = s;
      }
      const row = rowFor(phase, worst.state, "stop");
      return { verdict: row.verdict, reason: `${states.map((s) => `${s.arm} 그룹: ${s.text}`).join(" ")} ${row.tail}` };
    }
    const arm = OPTION_ARM[optionId];
    const s = states.find((x) => x.arm === arm);
    if (!s) return { verdict: "wrong", reason: `${arm} 그룹을 실험에 넣지 않아서 배포를 판단할 근거가 없어요.` };
    const row = rowFor(phase, s.state, action);
    return { verdict: row.verdict, reason: `${arm} 그룹: ${s.text} ${row.tail}` };
  }

  const s = stateOf(phase, readout, design, "B");
  const row = rowFor(phase, s.state, action);
  return { verdict: row.verdict, reason: `${s.text} ${row.tail}` };
}
```

- [ ] **Step 5: 플러그인에 연결 (테스트의 마지막 항목 통과용)**

`lib/cases/baemin/index.ts` — old: `import { rubric, reveal } from "./rubric";` → new:
```ts
import { judgeBaemin } from "./judge";
import { rubric, reveal } from "./rubric";
```
old:
```ts
  rubric,
  reveal,
};
```
new:
```ts
  rubric,
  reveal,
  judge: judgeBaemin,
};
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run lib/cases/baemin/__tests__/judge.test.ts && npx tsc --noEmit`
Expected: 모두 통과. 실제 시뮬레이터 항목이 실패하면 기대값을 고치지 말고 `console.log(judgeBaemin(...))` 로 상태와 근거를 확인해 보고한다(설계 단계 탐침에서는 P1 14일 deploy=correct, 7일 extend_rerun=correct, P2 SRM no_deploy=correct, P2 램프업 deploy_followup=correct·full_deploy=partial, P3 expand_rerun=correct·rollback=wrong, P4 none_learn=correct 였다).

- [ ] **Step 7: 커밋**

```bash
git add -A lib
git commit -m "feat: 결과 기반 결정 판정(judgeBaemin)과 decision 이론 개념" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 8: 정답 공개 연결 (reveal 파이프라인·API·카드)

판정과 플래그 설명을 정답 공개 카드에 보여 준다. 조 화면에는 정답 공개 전에 아무것도 내려가지 않는다(기존 `/api/reveal` 가드 유지).

**Files:**
- Modify: `lib/reveal.ts`, `app/api/reveal/route.ts`, `components/review/RevealCard.tsx`
- Test: `lib/__tests__/reveal.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`lib/__tests__/reveal.test.ts` — import 줄 old:
```ts
import { buildReveal, latestRunPerPhase, type RunRow } from "../reveal";
```
new:
```ts
import { simulateBaemin } from "@/lib/cases/baemin";
import { buildReveal, latestDecisionPicks, latestRunPerPhase, type RunRow } from "../reveal";
```
`describe("직소 브리핑", ...)` 바로 앞에 추가:
```ts
describe("정답 공개: 결정 판정과 플래그 설명", () => {
  const hyp = { action: "a", behavior: "b", impact: "i" };
  const design = {
    phase: "p1", hypothesis: hyp, scope: { os: "android", surface: "store_home" }, unit: "user",
    metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov"] },
    alpha: 0.05, power: 0.8, mde_pp: 2, duration_days: 14, allocation: 1, ramp: "none", analysis_mode: "pooled", stopping: "fixed", count_basis: "assignment",
  };
  const realRun = (d: Record<string, unknown>, at = "2026-01-02"): RunRow => ({ team_id: "t1", phase: "p1", design: d, result: simulateBaemin(d), created_at: at });

  it("결정 제출 중 Phase 별 최신 버전의 옵션만 고른다", () => {
    const picks = latestDecisionPicks([
      { phase: "p1", version: 1, payload: { option: "no_deploy" } },
      { phase: "p1", version: 2, payload: { option: "deploy" } },
      { phase: "p2", version: 1, payload: { option: 3 } }, // 문자열이 아니면 무시
      { phase: "p3", version: 1, payload: {} },
    ]);
    expect(picks).toEqual({ p1: "deploy" });
  });

  it("조의 결정을 실제 결과로 판정해 결정 스텝에 붙인다", () => {
    const out = buildReveal(baeminPlugin, [realRun(design)], "t1", { p1: "deploy" });
    expect(out.decisions).toHaveLength(1);
    const dec = out.decisions[0];
    expect(dec.step).toBe("s4_readout");
    expect(dec.option).toBe("배포");
    expect(dec.verdict).toBe("correct");
    expect(dec.reason).toContain("MDE");
  });

  it("결정이 없거나 실행 결과가 없으면 판정을 만들지 않는다", () => {
    expect(buildReveal(baeminPlugin, [realRun(design)], "t1").decisions).toEqual([]);
    expect(buildReveal(baeminPlugin, [], "t1", { p1: "deploy" }).decisions).toEqual([]);
    expect(buildReveal(baeminPlugin, [realRun(design)], "t1", { p1: "nope" }).decisions).toEqual([]);
  });

  it("플래그에 설명(why)과 안내(notes)가 따라온다", () => {
    const short = buildReveal(baeminPlugin, [realRun({ ...design, duration_days: 10 })], "t1");
    const sd = short.flags[0].flags.find((f) => f.code === "SHORT_DURATION");
    expect(sd?.why).toContain("요일 주기");
    expect(short.flags[0].notes).toEqual([]);
  });
});
```
(`baeminPlugin` 는 이 파일이 이미 import 하고 있다.)

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/__tests__/reveal.test.ts`
Expected: FAIL (`latestDecisionPicks` 없음).

- [ ] **Step 3: `reveal.ts` 구현**

파일 전체를 다음으로 교체:
```ts
/** 정답 공개 이후 조에게 내려가는 정보를 만든다 (순수 함수). 공개 전에는 이 함수의 결과를 API 가 내려보내지 않는다(규칙 3). */
import type { CasePlugin, Verdict } from "./cases/types";
import { simPhaseOf } from "./lab/phase";
import { FLAG_LABELS, type Flag } from "./sim/core/flags";
import type { Readout } from "./sim/core/readout";

export type RunRow = { team_id: string; phase: string; design: Record<string, unknown>; result: Readout; created_at: string };

/** 조의 시뮬레이션 Phase 별 최신 본 실험(A/A 제외) 결과 */
export function latestRunPerPhase(runs: RunRow[], teamId: string): Map<string, RunRow> {
  const best = new Map<string, RunRow>();
  for (const r of runs) {
    if (r.team_id !== teamId || (r.design as { aa?: boolean }).aa) continue;
    const cur = best.get(r.phase);
    if (!cur || r.created_at > cur.created_at) best.set(r.phase, r);
  }
  return best;
}

/** 결정 제출(kind=decision)에서 Phase 별 최신 버전의 선택지 id */
export function latestDecisionPicks(rows: { phase: string; version: number; payload: Record<string, unknown> }[]): Record<string, string> {
  const best = new Map<string, { version: number; option: string }>();
  for (const r of rows) {
    const option = r.payload?.option;
    if (typeof option !== "string") continue;
    const cur = best.get(r.phase);
    if (!cur || r.version > cur.version) best.set(r.phase, { version: r.version, option });
  }
  return Object.fromEntries([...best.entries()].map(([phase, v]) => [phase, v.option]));
}

export type RevealItem = { step: string; phase: string; title: string; text: string };
export type RevealFlag = { code: Flag; label: string; why?: string };
export type RevealFlags = { step: string; phase: string; title: string; flags: RevealFlag[]; notes: string[]; achievedPower: number | null };
export type RevealDecision = { step: string; phase: string; title: string; option: string; verdict: Verdict; reason: string };
export type RevealPayload = { items: RevealItem[]; flags: RevealFlags[]; decisions: RevealDecision[] };

type Plugin = Pick<CasePlugin, "phases" | "reveal" | "decisions" | "judge">;

/** 조가 고른 결정 옵션을 그 조의 최신 본 실험 결과로 판정한다. 판정 함수가 없는 사례·실행 결과가 없는 Phase 는 건너뛴다. */
export function judgeDecisions(plugin: Pick<Plugin, "phases" | "decisions" | "judge">, runs: RunRow[], teamId: string, picks: Record<string, string>): RevealDecision[] {
  if (!plugin.judge) return [];
  const latest = latestRunPerPhase(runs, teamId);
  const out: RevealDecision[] = [];
  for (const [phase, option] of Object.entries(picks).sort(([a], [b]) => a.localeCompare(b))) {
    const def = plugin.phases.find((p) => p.kind === "decide" && simPhaseOf(p.key) === phase);
    const run = latest.get(phase);
    if (!def || !run) continue;
    const j = plugin.judge(phase, option, { design: run.design, result: run.result });
    if (!j) continue;
    const label = plugin.decisions[phase]?.options.find((o) => o.id === option)?.label ?? option;
    out.push({ step: def.step, phase, title: def.title, option: label, verdict: j.verdict, reason: j.reason });
  }
  return out;
}

export function buildReveal(plugin: Plugin, runs: RunRow[], teamId: string, picks: Record<string, string> = {}): RevealPayload {
  const defOf = (sim: string) => plugin.phases.find((p) => simPhaseOf(p.key) === sim);
  const items: RevealItem[] = [];
  for (const [phase, text] of Object.entries(plugin.reveal)) {
    const def = defOf(phase);
    if (def && text) items.push({ step: def.step, phase, title: def.title, text });
  }
  const flags: RevealFlags[] = [];
  for (const [phase, run] of latestRunPerPhase(runs, teamId)) {
    const def = defOf(phase);
    if (!def) continue;
    const why = (run.result.panels?._why ?? {}) as Partial<Record<Flag, string>>;
    const notes = run.result.panels?._notes;
    flags.push({
      step: def.step, phase, title: def.title,
      flags: (run.result.flags ?? []).map((code) => ({ code, label: FLAG_LABELS[code], ...(why[code] ? { why: why[code] } : {}) })),
      notes: Array.isArray(notes) ? notes.filter((n): n is string => typeof n === "string") : [],
      achievedPower: run.result.achievedPower ?? null,
    });
  }
  return { items, flags, decisions: judgeDecisions(plugin, runs, teamId, picks) };
}
```
`RevealPayload` 를 쓰는 다른 곳이 있는지 확인: `grep -rn "RevealPayload\|RevealFlags\|buildReveal" lib app components`. `RevealCard` 외에 쓰는 곳이 있으면 `decisions`·`notes` 필드 추가에 맞춰 같이 고친다(타입 오류가 알려준다).

- [ ] **Step 4: 라우트**

`app/api/reveal/route.ts` — import 줄 old: `import { buildReveal, type RunRow } from "@/lib/reveal";` → new: `import { buildReveal, latestDecisionPicks, type RunRow } from "@/lib/reveal";`
old:
```ts
  const { data: runs } = await db.from("sim_runs").select("team_id, phase, design, result, created_at").eq("team_id", team.id);
  return NextResponse.json(buildReveal(plugin, (runs ?? []) as RunRow[], team.id));
```
new:
```ts
  const [{ data: runs }, { data: subs }] = await Promise.all([
    db.from("sim_runs").select("team_id, phase, design, result, created_at").eq("team_id", team.id),
    db.from("submissions").select("phase, version, payload").eq("team_id", team.id).eq("kind", "decision"),
  ]);
  const picks = latestDecisionPicks((subs ?? []) as { phase: string; version: number; payload: Record<string, unknown> }[]);
  return NextResponse.json(buildReveal(plugin, (runs ?? []) as RunRow[], team.id, picks));
```

- [ ] **Step 5: 카드**

`components/review/RevealCard.tsx` 편집:

(a) 판정 표시용 상수 — `export function RevealCard` 바로 위에 추가:
```tsx
const VERDICT_BADGE = { correct: { tone: "done", label: "정답" }, partial: { tone: "warn", label: "부분 정답" }, wrong: { tone: "bad", label: "오답" } } as const;
```

(b) 필터 줄 — old:
```tsx
  const flags = data?.flags.filter((f) => f.step === step) ?? [];
  if (!err && items.length === 0 && flags.length === 0) return null;
```
new:
```tsx
  const flags = data?.flags.filter((f) => f.step === step) ?? [];
  const decisions = data?.decisions.filter((d) => d.step === step) ?? [];
  if (!err && items.length === 0 && flags.length === 0 && decisions.length === 0) return null;
```

(c) 플래그 목록 — old:
```tsx
          {f.flags.length === 0 ? (
            <p className="mt-1 text-sm text-ink2">이 설계에서는 걸린 함정이 없었어요.</p>
          ) : (
            <div className="mt-1 flex flex-wrap gap-1.5">{f.flags.map((x) => <Badge key={x.code} tone="warn">{x.label}</Badge>)}</div>
          )}
```
new:
```tsx
          {f.flags.length === 0 ? (
            <p className="mt-1 text-sm text-ink2">이 설계에서는 걸린 함정이 없었어요.</p>
          ) : (
            <ul className="mt-1 space-y-1.5">
              {f.flags.map((x) => (
                <li key={x.code}>
                  <Badge tone="warn">{x.label}</Badge>
                  {x.why && <span className="mt-0.5 block text-sm text-ink2">{x.why}</span>}
                </li>
              ))}
            </ul>
          )}
          {f.notes.map((n) => <p key={n} className="mt-1 text-sm text-ink2">{n}</p>)}
```

(d) 원문 비교 블록(`{items.map(...)}`) 바로 앞에 결정 판정 블록 추가:
```tsx
      {decisions.map((d) => (
        <div key={d.phase} className="mt-3">
          <h3 className="text-sm font-semibold">{d.title}: 우리 조의 결정을 이론에 비춰 보면</h3>
          <p className="mt-1 text-sm">
            <span className="text-ink2">선택: </span><b>{d.option}</b>{" "}
            <Badge tone={VERDICT_BADGE[d.verdict].tone}>{VERDICT_BADGE[d.verdict].label}</Badge>
          </p>
          <p className="mt-1 text-sm text-ink2">{d.reason}</p>
        </div>
      ))}
```

- [ ] **Step 6: 통과 확인**

Run: `npx vitest run lib/__tests__/reveal.test.ts && npx tsc --noEmit && npm run lint`
Expected: 통과, 오류·경고 없음.

- [ ] **Step 7: 커밋**

```bash
git add -A lib app components
git commit -m "feat: 정답 공개 카드에 결정 판정과 플래그 설명 표시" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 9: AI 리뷰 입력 + 루브릭·정답 해설 재작성

LLM 루브릭에서 이론에 없는 절대 기준("홀드아웃", "안드로이드+가게홈 모범", "14일 이상")을 없애고, 결정의 정오는 `decision_checks`(판정 함수의 결과)를 따르게 한다.

**Files:**
- Modify: `lib/review/prompts.ts`, `lib/review/service.ts`, `lib/cases/baemin/rubric.ts`
- Test: `lib/review/__tests__/review.test.ts`, `lib/cases/baemin/__tests__/baemin.test.ts`

- [ ] **Step 1: 실패하는 테스트 추가**

`lib/review/__tests__/review.test.ts` 의 기존 import·헬퍼를 먼저 읽고(`sed -n 1,80p lib/review/__tests__/review.test.ts`) 그 스타일에 맞춰 아래 두 테스트를 추가한다. 이 파일은 DB 를 쓰는 서비스 테스트와 순수 프롬프트 테스트를 같이 가지므로, 순수 프롬프트 테스트가 있는 `describe` 블록 안(없으면 파일 끝의 새 `describe("결정 판정 입력", ...)`)에 넣는다.

```ts
  it("결정 판정(decision_checks)이 있으면 프롬프트 입력에 그대로 실리고, 정답 공개 전에는 정답을 직접 말하지 말라고 지시한다", () => {
    const input = {
      case: "baemin", step: "s4_readout", rubric: "r", submission: {}, sim: null, revealed: false,
      decision_checks: [{ phase: "p1", option: "배포", verdict: "correct", reason: "근거 문장" }],
    } as TeamReviewInput;
    const p = teamPrompt(input);
    expect(p.user).toContain("decision_checks");
    expect(p.user).toContain("근거 문장");
    expect(p.system).toContain("decision_checks");
  });

  it("decision_checks 가 없는 입력의 해시는 이전과 같다(캐시 호환)", () => {
    const a = { case: "baemin", step: "s2_design", rubric: "r", submission: {}, sim: null, revealed: false } as TeamReviewInput;
    expect(inputHash(a)).toBe(inputHash({ ...a }));
    expect(JSON.stringify(a)).not.toContain("decision_checks");
  });
```
파일 상단의 `../prompts` import 줄을 다음으로 바꾼다 — old: `import { FLAG_NUDGES, leaksFlag, mockClassReview, mockTeamReview, scrubTeamReview, sharePrompt, summarizeSim, teamPrompt } from "../prompts";` → new: `import { FLAG_NUDGES, inputHash, leaksFlag, mockClassReview, mockTeamReview, scrubTeamReview, sharePrompt, summarizeSim, teamPrompt, type TeamReviewInput } from "../prompts";`

`baemin.test.ts` 끝에 추가:
```ts
describe("루브릭·정답 해설 문구", () => {
  const all = [...Object.values(baeminPlugin.rubric), ...Object.values(baeminPlugin.reveal)].join("\n");

  it("이론에 없는 개념과 절대 기준을 쓰지 않는다", () => {
    expect(all).not.toContain("홀드아웃");
    expect(all).not.toContain("14일 이상");
    expect(all).not.toContain("안드로이드 + 가게홈");
    expect(all).not.toContain("사전 QA");
  });

  it("Phase 별 루브릭은 결정의 정오를 decision_checks 에 맡긴다", () => {
    for (const phase of ["p1", "p2", "p3", "p4"]) expect(baeminPlugin.rubric[phase], phase).toContain("decision_checks");
  });

  it("P2 정답 해설은 iOS 구버전 에피소드를 램프업과 연결해 설명한다", () => {
    expect(baeminPlugin.reveal.p2).toContain("램프업");
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `npx vitest run lib/review lib/cases/baemin -t "decision_checks|루브릭·정답"`
Expected: FAIL.

- [ ] **Step 3: 프롬프트·서비스 구현**

`lib/review/prompts.ts` — `TeamReviewInput` 타입 old:
```ts
  /** revealed=true 일 때만: 원문 비교 해설 */
  original?: string;
};
```
new:
```ts
  /** revealed=true 일 때만: 원문 비교 해설 */
  original?: string;
  /** 조가 고른 결정을 그 조의 실제 결과로 판정한 것(판정 함수가 있는 사례만). 정오는 이 값을 따른다. */
  decision_checks?: { phase: string; option: string; verdict: string; reason: string }[];
};
```
`teamPrompt` 의 system 배열 — old:
```ts
    COMMON,
    '출력 형식: {"score": 0-100 정수, "strengths": string[], "issues": string[], "nudge_questions": string[], "vs_original": string}',
```
new:
```ts
    "입력의 decision_checks 는 조가 고른 결정을 실제 결과로 판정한 것(correct/partial/wrong)과 이론 근거입니다. 결정의 정오는 이 판정을 따르고 새 기준을 만들지 마세요. revealed=false 면 판정이나 정답 선택지를 직접 말하지 말고, 근거가 되는 숫자를 스스로 다시 보게 하는 질문으로 유도하세요.",
    COMMON,
    '출력 형식: {"score": 0-100 정수, "strengths": string[], "issues": string[], "nudge_questions": string[], "vs_original": string}',
```

`lib/review/service.ts` — import old: `import { latestRunPerPhase, type RunRow as RevealRun } from "../reveal";` → new: `import { judgeDecisions, latestRunPerPhase, type RunRow as RevealRun } from "../reveal";`

`reviewTeam` 의 `input` 정의 직전에 추가하고 입력에 펼친다 — old:
```ts
  const input: TeamReviewInput = {
    case: plugin.key, step: args.step,
```
new:
```ts
  const picks = Object.fromEntries(phases.flatMap((p) => {
    const option = (submission[`${p}.decision`] as { option?: unknown } | undefined)?.option;
    return typeof option === "string" ? [[p, option] as const] : [];
  }));
  const decision_checks = judgeDecisions(plugin, (runs.data ?? []) as RevealRun[], args.teamId, picks)
    .map(({ phase, option, verdict, reason }) => ({ phase, option, verdict, reason }));
  const input: TeamReviewInput = {
    case: plugin.key, step: args.step,
```
old:
```ts
    submission, sim: latestSim((runs.data ?? []) as RunRow[], args.teamId, phases), revealed,
```
new:
```ts
    submission, sim: latestSim((runs.data ?? []) as RunRow[], args.teamId, phases), revealed,
    ...(decision_checks.length ? { decision_checks } : {}),
```
(주의: `submission` 은 `latestSubmissions` 의 결과로 키가 `"p1.decision"` 형태다. 결정 payload 의 옵션 키는 `option` 이다.)

- [ ] **Step 4: 루브릭·해설 재작성**

`lib/cases/baemin/rubric.ts` 의 `rubric` 객체에서 `p1`, `p2`, `p3`, `p4` 항목을 다음으로 교체한다(`diagnose` 와 `reveal.p1`, `reveal.p3`, `reveal.p4` 는 그대로).

```ts
  p1: [
    "가설: Action=가게홈에서 최소금액 달성 여부 실시간 안내 / Behavior=장바구니를 오가지 않고 바로 주문 / Impact=장바구니 이탈률 감소. 바꾸는 것 1개, 메커니즘, 측정 지표와 방향을 채점.",
    "Primary 지표: 장바구니 이탈률. bar_click 은 대조군에 정의할 수 없어 시뮬레이션이 거부하는 오류, 주문전환율은 부분 정답(민감도 낮음), 금액 지표는 부분 정답.",
    "Guardrail 지표: 커머스 주문전환율 + 크래시/로딩. 시스템 Guardrail 누락은 감점.",
    "Secondary·Driver 지표: 평균주문금액 등(P2 복선).",
    "단위: 사용자. 세션/페이지뷰는 배정 단위와 분석 단위가 어긋나 오류.",
    "범위: 작게 시작(안드로이드·가게홈 등)과 출시 대상을 닮은 전체 중 어느 쪽이든 고른 이유가 일관되면 인정. 작게 시작했다면 램프업·확대 계획을, 전체라면 리스크 관리를 언급했는지 본다.",
    "기간: 요일 주기를 채우는 완전한 주 단위인지, 필요 표본(α·검정력·MDE로 계산)을 채우는지, 첫 주만 보지 않았는지를 본다. 숫자 하나를 정답으로 두지 말고 이유가 이 기준에 맞는지 채점.",
    "램프업: 점진적 노출로 위험을 줄이는 장치라는 설명이 있으면 가산.",
    "중간 확인: fixed 또는 sequential. 매일 확인하다 유의하면 멈추는 방식(peek_stop)은 위양성 위험.",
    "결정(P1): 입력의 decision_checks 에 그 조의 실제 결과로 낸 판정(correct/partial/wrong)과 근거가 있다. 그 판정을 따르고, 판정에 없는 기준을 새로 만들지 않는다.",
  ].join("\n"),
  p2: [
    "집계 기준: 배정 기준이 맞다. 노출 로그 기준으로 세면 앱이 먼저 죽은 사용자가 B에서 빠져 SRM 과 생존 편향이 생긴다. SRM 이 났다면 OS 별 사용자 수로 원인을 추적했는지 본다.",
    "램프업: 점진 노출로 시작하면 초기 단계의 크래시 가드레일에서 문제를 먼저 잡을 수 있다. 램프업을 쓰지 않았다면 이 점을 짚었는지 본다.",
    "분석 방식: 기간마다 A:B 배정 비율이 달라졌다면 기간을 합치지 말고 같은 비율끼리 나눠 비교한 뒤 합치는 층화 분석이 맞다.",
    "결정(P2): 입력의 decision_checks 에 판정과 근거가 있다. 그 판정을 따른다. 후속 실험을 제안했다면 Secondary·Driver 지표(평균주문금액, 첫 주문 혜택·멤버십 고객의 차이)에서 근거를 찾았는지 본다.",
  ].join("\n"),
  p3: [
    "트리거 분석: 대조군도 '문구가 있었다면 노출됐을' 조건을 기록하고 그 조건을 채운 사람끼리 비교해야 한다. B 노출자와 미노출자를 비교하면 선택 편향이다.",
    "검정력: 문구를 보는 사용자가 전체의 일부라 전체 지표의 효과가 희석된다는 점을 짚으면 가산.",
    "결정(P3): 입력의 decision_checks 에 판정과 근거가 있다. 그 판정을 따른다.",
  ].join("\n"),
  p4: [
    "다중검정: 보정 없이 지표를 많이 보면 효과가 없어도 하나쯤은 유의하게 나온다. 보정(BH/Bonferroni)이나 사전 정의로 대응했는지 본다.",
    "Guardrail: 평균주문금액 같은 Guardrail 지표 악화를 확인했는지 본다.",
    "결정(P4): 입력의 decision_checks 에 판정과 근거가 있다. 그 판정을 따른다.",
  ].join("\n"),
```

`reveal.p2` — old: `(SRM·iOS 구버전 크래시 에피소드는 실습용으로 추가한 상황이에요.)` → new:
`(iOS 구버전 크래시 에피소드는 실습용으로 추가한 상황이에요. 램프업으로 조금씩 늘려 가며 시작했다면 초기 단계의 크래시 가드레일에서 먼저 드러나 고칠 수 있었던 문제예요.)`

- [ ] **Step 5: 통과 확인**

Run: `npx vitest run lib && npx tsc --noEmit && npm run lint`
Expected: 전체 통과.

- [ ] **Step 6: 커밋**

```bash
git add -A lib
git commit -m "feat: AI 리뷰 입력에 결정 판정을 싣고 루브릭·정답 해설을 규칙 기반으로 재작성" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 10: 문서 (진실의 원천·보정 기록·근거표)

**Files:** Modify `docs/cases/baemin.md`, `lib/cases/baemin/CALIBRATION.md`, `docs/theory-coverage.md`

- [ ] **Step 1: `docs/cases/baemin.md`**

각 편집은 Edit 도구로 한다. old 는 아래 줄 그대로.

1. §2 P2 버그 (76~78행) — old:
```
- **iOS 구버전 버그**: `qa_old_ios = false`이면 ios_old의 B그룹 사용자 24%가 첫 화면 로그 전에 크래시
```
new:
```
- **iOS 구버전 버그**: `ramp = 'none'`(램프업 없이 시작)이면 ios_old의 B그룹 사용자 24%가 첫 화면 로그 전에 크래시. 램프업(`10_50_100`, `10_week1_50_week2`)으로 시작하면 초기 단계의 크래시 가드레일에서 먼저 드러나 고친 뒤 시작한 것으로 보고 본 실험에는 버그가 없다(근거: 덱 「A/A로 점검하고, 조금씩 늘리고, 충분히 돌린다」, 위키 09편 1.2.1)
```

2. §3-1 타입 — old: `  include_ramp_days: boolean\n` → new: `  analysis_mode: 'pooled'|'stratified'  // 기본 pooled\n`. old: `  qa_old_ios?: boolean       // p2\n` → new: (삭제).

3. §3-2 표 — old:
```
| unit = pageview | 관측 효과 × 0.30, SE 과소(1/2.0), 크래시율 +0.001(깜빡임 렌더링) → `UNIT_MISMATCH`, `FLICKER` |
```
new:
```
| unit = pageview | 관측 효과 × 0.30, SE 과소(1/2.0) → `UNIT_MISMATCH` |
```
old:
```
| duration_days | 실행 기간. 7일 미만 입력 불가. 짧을수록 P1 신규성 효과가 섞여 효과 과대추정 → `SHORT_DURATION` |
```
new:
```
| duration_days | 실행 기간. 7일 미만 입력 불가. 짧을수록 P1 신규성 효과가 섞여 효과 과대추정. `SHORT_DURATION` 조건은 §3-3 |
```
old:
```
| ramp = 10_50_100 | 1일차 10%, 2일차 50%, 3일차~ 100% 노출. include_ramp_days=false면 1~2일 제외 분석 |
| ramp = 10_week1_50_week2 | 1~7일 B 10%, 8~14일 B 50% (8~14일 프로모션 주간과 겹침). include_ramp_days=true로 합쳐 분석하면 **심슨의 역설** 발생 → `SIMPSON_RISK` |
```
new:
```
| ramp = 10_50_100 | 1일차 10%, 2일차 50%, 3일차~ 100% 노출(그룹 크기는 50:50 유지). 모든 일차를 분석에 쓴다 |
| ramp = 10_week1_50_week2 | 1~7일 B 10%, 8~14일 B 50% (8~14일 프로모션 주간과 겹침). `analysis_mode = pooled`로 합쳐 분석하면 **심슨의 역설** 발생 → `SIMPSON_RISK`. `stratified`는 배정 비율이 같은 기간끼리 비교한 뒤 역분산 가중으로 합쳐 왜곡이 없다(근거: 덱 「분산 축소」의 층화 분석, 「세그먼트마다 이기는데 전체로는 진다」, 위키 04편 3.5.1) |
| analysis_mode | `pooled`: 전 기간 합산. `stratified`: 계획 배정비가 같은 연속 일차(층)별로 효과를 구해 합침. 층이 하나뿐이면 두 방식은 같다 |
```

4. §3-3 — old 두 줄(`SRM`, `UNIT_MISMATCH`, `FLICKER` … 로 시작하는 줄) 전체를 다음으로 교체:
```
`SRM`(p < 0.001: 덱이 임계값 없이 "우연으로 보기 어렵다"고만 하므로 업계 관례를 쓴다), `UNIT_MISMATCH`, `SHORT_DURATION`, `UNDERPOWERED`, `PEEKED`, `SIMPSON_RISK`, `MULTIPLE_TESTING`, `SELECTION_BIAS`(편향 트리거 비교 사용)

| 플래그 | 조건 | 이론 근거 |
|---|---|---|
| `SHORT_DURATION` | (1) 분석한 대조군 사용자 < 계획 표본 `planned.nPerArm`, 또는 (2) 중간 확인으로 일찍 멈추지 않았는데 분석 일수가 7의 배수가 아님, 또는 (3) 분석 일수 ≤ 7 | 덱 「α와 Power」, 「최소 1~2주, 요일과 신기효과를 넘겨서」, 「초반 반응은 오래 가지 않을 수 있다」 / 위키 05편 4.1~4.2, 09편 1.2.2~1.2.3 |
| `UNDERPOWERED` | 달성 검정력 < 조가 설계에서 정한 검정력(`power`) | 덱 「실험이 틀리는 두 가지 방식」, 「MDE는 통계가 아니라 비즈니스가 정한다」 |
| `SIMPSON_RISK` | `ramp = 10_week1_50_week2`, `analysis_mode = pooled`, 층 2개 이상 | 덱 「세그먼트마다 이기는데 전체로는 진다」 |
| `MULTIPLE_TESTING` | 보정 없음 + Primary가 아닌 비교 m개의 `1−(1−α)^m` > 0.5 (α=0.05면 m ≥ 14) | 덱 「지표 20개를 보면 하나쯤은 우연히 걸린다」 / 위키 09편 1.4.2~1.4.4 |

- 이유 문장은 `Readout.panels._why`에 남기고(강사·정답 공개 전용), P2 램프업 안내는 `panels._notes`에 남긴다. 둘 다 `toTeamView`가 제거한다.
```
(기존 `- 플래그는 조 화면에 즉시 보여주지 않는다…` 줄은 그대로 둔다.)

5. §5 시나리오 표 — old: `| 6 | P2, all, exposure, qa_old_ios=false | SRM p < 0.001, B 사용자 약 7천 명 부족 |` → new: `| 6 | P2, all, exposure, ramp none | SRM p < 0.001, B 사용자 약 7천 명 부족 |`. old: `| 7 | P2, all, assignment, qa_old_ios=true | SRM 없음,` → new: `| 7 | P2, all, 램프업 10_50_100(버그 없음) | SRM 없음,`. old: `10_week1_50_week2 + include_ramp_days=true |` → new: `10_week1_50_week2 + analysis_mode=pooled |`. #2 행(`7일 | 효과 추정치가 1보다 큼(신규성), SHORT_DURATION`)은 그대로. #11 행에 `(Primary 아닌 비교 16개 → 가족 오류율 56%)` 를 덧붙인다.

6. §6 루브릭 표 — old: `| 범위 | 안드로이드 + 가게홈 | 전체도 허용하되 리스크·공수 근거 필요 |` → new: `| 범위 | 작게 시작(안드로이드·가게홈 등) 또는 출시 대상을 닮은 전체 | 고른 쪽의 이유가 일관되면 인정(덱 「A/A로 점검하고, 조금씩 늘리고…」, 「실험 대상은 출시 대상을 닮아야 한다」) |`. old: `| 기간 | 14일 이상 | 7일은 신규성 위험 |` → new: `| 기간 | 완전한 주 단위, 필요 표본 충족, 첫 주만 보지 않기 | 숫자 하나가 아니라 이유가 이 기준에 맞는지 |`.

7. §6 "### 결정" 표 전체(헤더 포함)를 교체:
```
### 결정
정답은 옵션마다 고정하지 않고 **조의 실제 결과**로 판정한다(`lib/cases/baemin/judge.ts`). 근거는 덱 「'유의하다'에서 멈추지 말고 결정으로 닫는다」와 「효과 크기 × 비용 × 리스크를 함께 본다」.

| 우선순위 | 상태(조의 최신 본 실험) | 배포 | 접기/배포 안 함 | 재실험 |
|---|---|---|---|---|
| 1 | SRM 또는 시스템 가드레일(크래시·로딩) 유의 악화 → 중단 | 오답 | 재실험 선택지가 없는 P2·P4는 정답, 있는 P1·P3는 부분 | 정답 |
| 2 | Primary 구간 전체가 개선 방향 0 바깥 + 효과 ≥ MDE, 위험 없음 | 정답 | 오답 | 부분 |
| 2 | 위와 같지만 비즈니스 가드레일(전환율·평균주문금액·인당 거래액) 유의 악화 또는 고객 유형 하나에서 Primary 반대로 유의 악화(P2) | 전면 배포 부분 / 후속 실험을 붙인 배포 정답 | 오답 | 부분 |
| 2 | 위와 같지만 분석 구간이 7일 이하(첫 주만) | 부분 | 오답 | 정답 |
| 3 | 유의하지만 효과 < MDE | 부분(비용 확인 필요) | 부분 | 오답 |
| 4 | 구간이 0 포함 + ±MDE 안 | 오답 | 정답 | 부분 |
| 5 | 구간이 0 포함 + MDE보다 넓음 | 오답 | 오답(성급) | 정답 |
| 6 | Primary 유의 악화 | 오답 | 정답 | 부분 |

- P3는 트리거 사용자만 효과를 받으므로 전체 차이와 구간을 `B 트리거 사용자 / B 전체 사용자`로 나눠 환산한 뒤 분류한다(덱 「효과를 받을 수 있는 사람만 분석에 넣는다」).
- P4는 B·C 그룹을 따로 분류한다. "둘 다 배포 안 함"은 두 그룹 중 가장 나쁜 판정 기준이다.
- 교육 시나리오의 기대 정답: P1 14일 → 배포 / P1 7일 → 기간 연장 재실험 / P2 SRM → 배포 안 함 / P2 램프업(평균주문금액 악화) → 후속 실험을 붙인 배포 / P3 coupon low → 노출 조건 확대 후 재실험 / P4 기본 → 둘 다 배포 안 함.
```

- [ ] **Step 2: `lib/cases/baemin/CALIBRATION.md`**

- old(40행): `| `include_ramp_days=false` | `10_50_100`은 1~2일 제외. `10_week1_50_week2`는 1~7일 제외(기간이 7일이면 전부 포함) |` → new: `| `analysis_mode` | `pooled`는 전 기간 합산, `stratified`는 계획 배정비가 같은 연속 일차(층)별 비교를 역분산 가중으로 합침. 층이 하나면 같음. 램프 일차를 빼는 옵션은 없음 |`
- old(`| `unit` | session 은 모든 진짜 효과 ×0.55, SE ×(1/1.5). pageview 는 ×0.30, SE ×(1/2.0), B 크래시 +0.001 |`) → new: `| `unit` | session 은 모든 진짜 효과 ×0.55, SE ×(1/1.5). pageview 는 ×0.30, SE ×(1/2.0) |`
- old(`| P2 버그 (노출 기준) |`) 앞에 새 행 추가: `| P2 버그 적용 조건 | `ramp = none` 일 때만(램프업으로 시작하면 초기 크래시 가드레일에서 먼저 잡아 고친 것으로 본다). 사전 QA 체크박스는 없음 |`
- old(53행 `| 플래그 | SHORT_DURATION: …`) 전체 줄 → new:
```
| 플래그 | SHORT_DURATION: (1) 분석한 A 사용자 < 계획 표본, (2) 일찍 멈추지 않았는데 분석 일수가 7의 배수 아님, (3) 분석 일수 ≤ 7. MULTIPLE_TESTING: 보정 없음 + Primary 아닌 비교 m개의 1−(1−α)^m > 0.5. UNDERPOWERED: 달성 검정력 < 설계 검정력. SRM: p < 0.001(업계 관례). 근거는 docs/cases/baemin.md §3-3 |
```
- 14·20·23행의 시나리오 기록은 값이 바뀌지 않으면 그대로 둔다. 마지막에 `npx vitest run lib/cases/baemin` 의 실제 수치를 `console.log` 로 확인해 #6(B 부족 인원), #7(abandon·conv·aov), #11(aov C) 숫자가 달라졌다면 해당 행을 새 값으로 고치고 "(Task 5·6 이후 재측정)" 을 덧붙인다. #7 은 ramp `10_50_100` 기준 abandon −1.99%p, conv +0.70%p, aov −1,120원, first_order 이탈 +0.67%p 였다.

- [ ] **Step 3: `docs/theory-coverage.md`** — 파일 끝(7절 뒤)에 새 절 추가:
```
## 8. 배민 시뮬레이터 로직 ↔ 근거 (2026-10-09)

시뮬레이터의 맞다/틀리다 규칙은 아래 덱·위키 문장에서 도출한다. 슬라이드는 제목으로, 위키는 편·절로 인용한다.

| 로직 | 규칙 | 근거 |
|---|---|---|
| 결정 판정 | 중단 / 배포 / 접기 / 재실험 4분기 | 덱 「'유의하다'에서 멈추지 말고 결정으로 닫는다」 |
| 결정 판정 | 효과 크기·비용·리스크, 가드레일, 특정 세그먼트 악화 | 덱 「효과 크기 × 비용 × 리스크를 함께 본다」, 「통계적으로 유의하다 ≠ 의미 있다」 |
| 결정 판정(P3) | 트리거 사용자 기준 환산 | 덱 「효과를 받을 수 있는 사람만 분석에 넣는다」 |
| SHORT_DURATION | 필요 표본, 완전한 주, 첫 주만 | 덱 「α와 Power」, 「최소 1~2주, 요일과 신기효과를 넘겨서」, 「초반 반응은 오래 가지 않을 수 있다」 / 위키 05편 4.1~4.2, 09편 1.2.2~1.2.3 |
| UNDERPOWERED | 달성 검정력 < 설계 검정력 | 덱 「실험이 틀리는 두 가지 방식」, 「MDE는 통계가 아니라 비즈니스가 정한다」 |
| MULTIPLE_TESTING | 가족 오류율 > 0.5 | 덱 「지표 20개를 보면 하나쯤은 우연히 걸린다」 / 위키 09편 1.4.2~1.4.4 |
| SRM | p < 0.001 | 덱 「결과보다 배정 비율을 먼저 본다」(임계값은 덱에 없음 → 업계 관례, 팀원이 덱에 기준을 넣으면 맞춘다) |
| P2 iOS 버그 | 램프업이면 초기 가드레일에서 잡힘 | 덱 「A/A로 점검하고, 조금씩 늘리고, 충분히 돌린다」 / 위키 09편 1.2.1 |
| 분석 방식 | 층화 분석 | 덱 「분산 축소」, 「세그먼트마다 이기는데 전체로는 진다」 / 위키 04편 3.5.1 |

### 패러프레이즈 은행 (배포·접기·재실험 결정)
- 신뢰구간 전체가 0보다 위이고 크기도 의미 있으면 배포하되, 비용과 리스크를 확인하고 단계적으로 출시해요.
```

- [ ] **Step 4: 확인 및 커밋**

Run: `grep -rn "FLICKER\|include_ramp_days\|qa_old_ios" docs lib app components --include=*.md --include=*.ts --include=*.tsx | grep -v "docs/superpowers"`
Expected: `lib/lab/__tests__/lab.test.ts` 의 `qa_old_ios` `toBeUndefined` 한 줄과 `baemin.test.ts` 의 `qa_old_ios` 부재 확인 두 줄 외에는 없다. (`docs/superpowers/` 아래 설계·계획 문서는 이력이라 그대로 둔다. 이전 Phase 2 문서도 마찬가지.)

```bash
git add -A docs lib
git commit -m "docs: 배민 규칙·보정 기록·근거표를 새 판정 로직에 맞춰 갱신" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 11: 전체 검증

**Files:** 없음

- [ ] **Step 1: 자동 검증**

Run:
```bash
npx tsc --noEmit
npm run lint
npx vitest run
npm run build
```
Expected: 모두 성공. 실패하면 원인을 고치고 해당 태스크의 커밋에 이어 새 커밋을 만든다. 기준선(Task 0 Step 3)에서 이미 실패하던 항목은 별도로 보고한다.

- [ ] **Step 2: 일관성 점검 (grep)**

Run:
```bash
grep -rn "qa_old_ios\|include_ramp_days\|FLICKER\|홀드아웃" lib app components docs/cases docs/theory-coverage.md
grep -rn "decision_checks\|judgeDecisions\|latestDecisionPicks" lib app components | grep -v __tests__
```
Expected: 첫 grep 은 위 Task 10 Step 4 에서 허용한 테스트 줄 외에 없음. 둘째 grep 은 `reveal.ts`, `route.ts`, `service.ts`, `prompts.ts` 에만 나옴.

- [ ] **Step 3: 브라우저 확인 (로컬 Supabase 환경이 있을 때)**

`.claude/launch.json` 의 dev 서버를 `preview_start` 로 열고, 수업 코드를 만들어 배민 사례로 다음을 확인한다. 로컬에 Supabase 환경변수가 없어 조 화면까지 못 가면 이 단계는 건너뛰고 건너뛰었다고 보고한다.
1. P1 설계 폼: "분석 방식" 선택지가 있고 "램프업 기간도 분석에 포함" 체크박스는 없다.
2. P2 설계 폼: "iOS 구버전 사전 QA" 체크박스가 없다. 램프업은 P1 값을 이어받는다.
3. P1 결과에서 결정을 제출한 뒤 강사가 정답 공개를 켜면 결과 카드에 "우리 조의 결정을 이론에 비춰 보면" 블록(선택, 정답/부분 정답/오답 배지, 숫자가 든 근거 문장)과 함정별 설명이 보인다. 정답 공개 전에는 어느 것도 보이지 않는다(`/api/reveal` 403, 네트워크 탭으로 확인).
4. 콘솔 에러가 없다.

- [ ] **Step 4: 사용자에게 보고하고 멈춘다**

푸시·PR·머지는 하지 않는다. 변경 요약, 테스트 결과, 확인하지 못한 항목을 보고하고 사용자의 다음 지시를 기다린다.

---

## 후속 작업 (이 계획 범위 밖, 사용자가 말하면 진행)

1. 강사용 대본·강의자료의 해당 문단을 새 로직에 맞게 다시 쓰고 Artifact 를 다시 게시한다: P1 기간(14일 고정 → 완전한 주·필요 표본·첫 주만 보지 않기), P1 범위(모범 답 삭제), P2 사전 QA → 램프업, 분석 방식 선택, 결정 판정(결과 기반), 부록 근거표 갱신.
2. 토스·당근·넷플릭스에도 같은 이론 감사를 한다.
3. 수업 전: Upstage 키 연결 + Redeploy, Supabase 테스트 데이터 삭제(기존 `sim_runs` 는 설계 해시가 바뀌어 새로 계산된다), 리허설.

---

## Self-Review

**1. 설계 문서 커버리지**
- A 결과 기반 판정 → Task 7(judge.ts 상태·행동 표, P3 환산, P4 그룹별), Task 8(정답 공개), Task 9(AI 리뷰·루브릭). 범위 모범 답 제거(③) → Task 9 루브릭. ✔
- B SHORT_DURATION → Task 6(세 기준, `_why`), Task 1(문서 확정). ✔
- C FLICKER 삭제 → Task 3 + Task 10 문서. ✔
- D 사전 QA → 램프업 → Task 5(스키마·폼·기본값·시뮬·`_notes`·테스트). 정답 공개의 "램프 초기에 멈추고 수정했다" 문장 → `_notes`(Task 5) + 카드 표시(Task 8) + `reveal.p2`(Task 9). ✔
- E 층화 분석 → Task 2(`combineStrata`), Task 4(`strataOf`, 시뮬, `SIMPSON_RISK`). ✔
- F 임계값 플래그 → Task 6(UNDERPOWERED, MULTIPLE_TESTING, SRM 근거 문장). ✔
- 영향 범위의 문서(`baemin.md`, `CALIBRATION.md`, `theory-coverage.md`) → Task 10. 강사 자료 → 후속 작업. ✔
- 검증(시나리오 12개, 브라우저) → Task 4~6 의 기존 시나리오 유지 확인 + Task 11. ✔

**2. 플레이스홀더 점검**
"TBD"/"나중에"/"적절히 처리" 류 없음. 코드가 필요한 모든 단계에 코드 또는 정확한 old/new 문자열이 있다. 예외 둘을 명시한다: Task 9 Step 1 은 기존 `review.test.ts` 의 import 스타일을 먼저 읽고 맞추라고 했고(파일의 헬퍼를 이 계획이 모두 알지 못한다), Task 10 Step 2 의 CALIBRATION 숫자는 실제 실행 값으로 확인해 적도록 했다(값이 코드 결과에 의존한다).

**3. 타입·이름 일관성**
- `analysis_mode`: schema(Task 4) = formMeta = defaults = theory FIELD_THEORY = simulate(`d.analysis_mode`) = 테스트 fixture = 문서. ✔
- `strataOf(shares, days): number[][]`: 정의(Task 4 (b)) = 사용(Task 4 (d), Task 6 `strata.length`). `combineStrata(parts, alpha)` 정의(Task 2) = 사용(Task 4). ✔
- `panels._why`(`Partial<Record<Flag,string>>`)·`panels._notes`(`string[]`): 생성(Task 5, 6) = `buildReveal` 소비(Task 8). ✔
- `Verdict`/`Judgement`: 정의(Task 7 Step 1) = `judge.ts` = `CasePlugin.judge` = `reveal.ts`. `judgeDecisions(plugin, runs, teamId, picks)`: 정의(Task 8) = 사용(Task 9 service). 옵션 키 `payload.option`: `latestDecisionPicks`(Task 8), `service` 의 `submission["p1.decision"].option`(Task 9), 기존 `memo.ts`·`StepView.tsx` 와 동일. ✔
- `RevealFlags.notes`·`RevealPayload.decisions` 를 쓰는 곳: `RevealCard` 만(Task 8 Step 3 에서 `grep` 으로 재확인하도록 지시). ✔
- 플래그 `why` 에 쓰는 `theoryLabel` 키: `srm`, `alpha_power`, `mde`, `duration`, `novelty`, `error_power`, `simpson`, `multiple_testing` 은 모두 `THEORY` 에 있다. judge 의 `decision`, `metric_layers`, `trigger`, `inference` 도 있다(`decision` 은 Task 7 Step 1 에서 추가). ✔

**4. 순서 의존성**
Task 7 의 `judge.test.ts` 의 P2 팩토리는 `qa_old_ios` 가 없는 스키마(Task 5 이후)를 전제하고, `analysis_mode` 는 Task 4 이후를 전제한다. 이 순서를 지키면 각 태스크 끝에서 `tsc` 와 전체 테스트가 통과한다. Task 8 은 Task 7 의 `CasePlugin.judge` 타입에 의존한다.
