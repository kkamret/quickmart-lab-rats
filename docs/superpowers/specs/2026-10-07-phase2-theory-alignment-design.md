# Phase 2 — 이론 수업과 이어지는 실습 다듬기 (설계)

작성일 2026-10-07 · 범위: **앱만 수정**. `docs/lecture/*.pptx`, `docs/ab-testing/*.md`(이하 덱·위키)는 읽기 전용 기준이다.

> **개정 (2026-10-07)**: 덱은 팀원이 레이아웃을 직접 만들고 있고 지금 덱은 내용 초안이라, 앱에는 슬라이드 번호·장수를 쓰지 않고 **챕터(Ch2~4)만** 안내한다. 아래 표의 슬라이드 열은 개념↔덱 대조용 메모이며 앱 코드(`lib/theory.ts`)에는 넣지 않는다. 배지는 `Ch3`, 라벨은 `Ch2 · 가설 문장 구조` 형태다.

## 1. 목표
수강생이 이론 시간에 배운 용어·순서·개념을 실습에서 그대로 쓰고 있다고 느끼게 한다.
- 새롭거나 어려운 내용은 추가하지 않는다 (Switchback, DID·RDD·Synthetic Control 등 덱에만 있는 내용 제외).
- Phase 1의 시뮬레이션·플래그·리뷰·직소 공유 프로세스는 유지한다. 저장 필드와 zod 스키마는 바꾸지 않는다.

## 2. 현황 대조 요약
앱은 단측/비열등성, CUPED, 다중검정, Peeking, SRM, 트리거, 심슨 등 개념 깊이가 이미 덱 수준이다. 어긋난 곳은 용어·순서·연결 장치다.

| 항목 | 덱 | 앱(현재) |
|---|---|---|
| 가설 (17장) | [대상]에게 [Treatment]를 적용하면, [이유] 때문에 [Metric]이 [방향]으로 변할 것이다 (+변화 크기) | Action / Behavior / Impact 3칸 |
| 지표 (22~26장) | OEC → Primary → Secondary·Driver → Guardrail | 메인 지표 / 가드레일 / 보조 지표, OEC 없음 |
| 실험 단위 (30장) | Experimental Unit / Randomization Unit | 실험 단위, 배정 단위 등 사례마다 표기가 다름 |
| 검정력·MDE (34장) | 1·2종 오류, Power, MDE | "검정력", "최소 검출 효과(MDE)" (대체로 일치) |

## 3. 변경 1 — 용어·구조 정렬
1. **가설 라벨**: 필드명(`hypothesis.action/behavior/impact`)은 유지하고 라벨·도움말만 변경한다. 4개 사례 공통.
   - action → "대상과 Treatment: 누구에게 무엇을 적용하나요?"
   - behavior → "이유: 사용자 행동이 어떻게 달라지나요?"
   - impact → "Metric·방향·변화 크기: 어떤 지표가 얼마나 움직이나요?"
2. **지표 용어**: "메인 지표 → Primary 지표", "보조 지표 → Secondary·Driver 지표", "가드레일 지표 → Guardrail 지표"로 통일한다. 입력란 순서를 Primary → Secondary·Driver → Guardrail로 맞춘다. OEC는 입력란을 만들지 않고 도움말에서만 설명한다.
3. **실험 단위**: 라벨에 "Randomization Unit(배정 단위)"를 병기하고, 사례별 다른 표기를 통일한다.
4. **그 밖의 라벨**: 단측/양측, 비열등성, 트리거(ITT vs 트리거 분석), MDE, A/A 테스트, 다중검정을 덱 표기로 맞춘다.
5. **Readout 읽는 순서·문구**: 데이터 품질(SRM) → Primary → Guardrail → Secondary → 사례 전용 패널 → 결정. 덱 Ch3~4의 순서·표현과 맞춘다.
6. **루브릭·리뷰 문구**: 사례별 `rubric.ts`와 LLM 리뷰 프롬프트가 쓰는 용어를 같은 표기로 바꾼다. 점수 로직은 건드리지 않는다.

## 4. 변경 2 — 이론 연결 장치
### 4.1 데이터: `lib/theory.ts`
개념 키 → `{ title, chapter, slides, wiki? }` 표 한 곳에서 관리한다. 클라이언트 번들에 들어가므로 숨긴 효과나 플래그 이름을 담지 않는다.

슬라이드 번호는 덱에서 확인한 값만 쓴다.

| 키 | 개념 | 챕터·슬라이드 | 위키 |
|---|---|---|---|
| hypothesis | 가설 문장 구조 | Ch2 · 17 | 02-hypothesis |
| tails | 단측/양측 | Ch2 · 20 | 02-hypothesis |
| non_inferiority | 비열등성 | Ch2 · 21 | 02-hypothesis |
| metric_layers | 지표 층 (OEC·Primary·Secondary·Guardrail) | Ch2 · 22~26 | 03-metrics |
| goodhart | Goodhart | Ch2 · 27 | 03-metrics |
| predefine | 사전 정의 | Ch2 · 28 | 03-metrics |
| unit | 실험 단위 | Ch2 · 30 | 04-experimental-unit |
| trigger | 트리거 분석 | Ch2 · 32 | (없음) |
| error_power | 1·2종 오류·Power | Ch2 · 33~34 | (없음) |
| randomization | 무작위 배정, SUTVA | Ch2 · 35~36 | 01-why-ab-testing |
| aa_test | A/A 테스트 | Ch3 · 39 | (없음) |
| duration | 실험 기간 | Ch3 · 40 | (없음) |
| analysis_unit | 배정 단위 vs 분석 단위 | Ch3 · 42 | 04-experimental-unit |
| inference | p-value·신뢰구간·효과 크기 | Ch3 · 43~45 | (없음) |
| cuped | CUPED | Ch3 · 46 | (없음) |
| multiple_testing | 다중검정 | Ch3 · 47 | (없음) |
| peeking | Peeking | Ch3 · 48 | (없음) |
| novelty | Novelty/Primacy | Ch3 · 49 | (없음) |
| repeat_exposure | 반복 노출 | Ch3 · 51 | 04-experimental-unit |
| sequential | Sequential Testing | Ch4 · 53 | (없음) |
| simpson | 심슨의 역설 | Ch4 · 54 | (없음) |
| srm | SRM | Ch4 · 55 | (없음) |
| contamination | 오염 신호 | Ch4 · 56 | (없음) |

각 키의 번호와 위키 매핑은 구현 때 덱·위키와 다시 대조해 검증한다. 불확실하면 챕터만 표시한다.

### 4.2 화면 표시
- **스텝 헤더**: "이론 복습: Ch2 가설 수립 · 덱 17장" 한 줄. 위키가 있으면 링크를 건다.
- **입력란 배지**: `formMeta`의 필드에 `theory?: TheoryKey`를 추가하고, 라벨 옆에 회색 소형 배지 `Ch2·17`을 렌더링한다.
- **Readout 경고 옆 배지**: 챕터·슬라이드만 보여 주고 플래그 이름은 정답 공개 전까지 숨긴다 (절대 규칙 3).
- **함정 연구소(s7)**: 세 실험을 Peeking(Ch3·48), 심슨(Ch4·54), SRM(Ch4·55)과 짝지어 표시한다.

### 4.3 정답 공개 이후
- 정답 공개 카드에 "오늘 쓴 개념 ↔ 덱 슬라이드" 표를 추가한다. 사례의 `meta.concepts`를 theory 키에 연결해 만든다.
- 직소 공유(s8)의 AI share 프롬프트에 "덱 용어(Primary, Guardrail 등)로 쓴다"는 지시 한 줄을 추가한다.

## 5. 테스트
- 단위 테스트: 모든 사례 `meta.concepts`와 `formMeta`의 `theory` 참조가 `theory.ts` 키에 존재한다.
- `theory.ts`가 서버 전용 모듈을 import하지 않는지 기존 `client-bundle.test.ts`로 확인한다.
- 기존 224개 테스트, 타입체크, lint, build, `scripts/loadtest.mjs`가 변경 없이 통과해야 한다 (스키마·필드명 불변).
- 라벨 문구가 바뀐 곳은 렌더링 스냅샷이 아니라 `formMeta` 구조 테스트로 확인한다.

## 6. 위험
- 슬라이드 번호가 틀리면 수강생이 혼란스럽다 → 덱에서 직접 확인한 번호만 쓰고, 덱이 바뀌면 `theory.ts`만 고친다.
- 팀원이 덱을 수정하는 중이라 번호가 밀릴 수 있다 → 구현 직전에 `main`을 pull해 다시 대조한다.
- 라벨이 길어져 모바일 폼이 어색해질 수 있다 → 도움말로 분리하고 배지는 한 줄로 유지한다.

## 7. 범위 밖 — 덱·위키 보완 요청 (팀원에게 전달)
- 클러스터 강건 SE와 HTE는 앱 사례(당근·토스)에 쓰이지만 덱에 없다.
- `docs/ab-testing/09-experimentation-platform.md`의 3.2절이 아직 작성되지 않았다.
- 위키는 Ch2 전반(01~05)만 있고 Ch3~4 위키 문서가 없어서, 해당 배지는 위키 링크 없이 슬라이드 번호만 보여 준다.
