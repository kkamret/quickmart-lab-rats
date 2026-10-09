# 최종 덱 동기화와 이론 밖 개념 자체 풀이 (이슈 #14, #15)

**목표:** 팀원의 최종 덱(73장, Ch1~Ch5 표기 유지)에 맞춰 앱의 개념 챕터·이름을 고치고, 덱·위키에 설명이 없는 개념은 앱이 직접 쉬운 풀이를 보여 준다. 팀원은 이론을 더 추가하지 않으므로 "덱·위키 보강 필요"는 "앱 자체 풀이"로 바꾼다.

**브랜치:** `feat/theory-final-deck-sync` (main `797597b`에서). 푸시·PR 없음. 커밋 끝에 `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.

## 정확한 수정

### 1. `lib/theory.ts` (테스트 먼저: `lib/__tests__/theory.test.ts`)
- `interleaving`: chapter 4 → 5 (최종 덱에는 Ch5 '산업 사례' 표의 Netflix 행에만 나와요). note 유지.
- `randomization`: `e("무작위 배정 방식", 2)` (덱 Ch2 '무작위 배정 방식 설계'. SUTVA는 Ch4 `interference`).
- 새 항목 `twyman: e("트위먼의 법칙", 3, { note: "흥미롭거나 이상할 만큼 좋은 숫자는 대개 틀렸으니, 기뻐하기 전에 데이터부터 확인해요.", revealOnly: true })` (덱 Ch3 'Bing 사례로 다시 보기').
- `lib/cases/daangn/ui.ts`: `meta.theory`에 `"twyman"` 추가, `outsideTheory`에서 `"트위먼의 법칙"` 제거.
- 테스트 추가: interleaving 챕터 5, randomization 이름·챕터, twyman revealOnly·당근 theory 포함·outsideTheory 미포함. 기존 제약(note ≤120자, revealOnly는 s7_lab 밖 STEP_THEORY 금지, note가 폼 문구에 복사되지 않음, FIELD_THEORY 키 존재)은 그대로 통과해야 해요.

### 2. `lib/outside-notes.ts` (신규, 클라이언트 번들 안전)
- `export const OUTSIDE_NOTES: Record<string, string>`: 사례 `outsideTheory`에 남은 12개 이름 → 1~3문장 해요체 풀이(≤200자, 일반 정의만, 숫자·플래그 이름 없음).
- 테스트 `lib/__tests__/outside-notes.test.ts`: 모든 사례의 outsideTheory 이름에 풀이가 있음 / 모든 키가 어떤 사례에서 쓰임 / 비어 있지 않고 ≤200자, '요.'로 끝남 / 숫자·'%' 없음 / `FLAG_LABELS` 문구 없음.

### 3. `components/review/RevealCard.tsx`
- '이론 수업 밖에서 처음 나온 개념' 목록: 이름은 굵게, 아래에 `OUTSIDE_NOTES[n]`을 작은 글씨로. 꼬리 문장 '위 해설과 강사님 설명을 참고해 주세요.' → '이 앱에서 설명한 풀이예요.'

### 4. `docs/theory-coverage.md`
- 머리말: 최종 덱 73장 기준으로 출처 갱신.
- 인용한 슬라이드 제목을 최종 덱 제목으로 바꾸고, 전용 슬라이드가 없어진 개념은 `덱에 전용 슬라이드 없음(위키 N편 …)`으로 표시.
- 5·6·7절: 13개 개념은 `App 자체 풀이(lib/outside-notes.ts)`, 트위먼의 법칙은 `덱에 있음(Ch3 Bing 마무리)`.

### 5. 검증
`npx tsc --noEmit`, `npm run lint`(docs/lecture/build/build.js의 알려진 오류 4개만), `npx vitest run`, `npm run build`.
