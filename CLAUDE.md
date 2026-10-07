# 실험실: 사례별 A/B 테스트 조별 실습 플랫폼

DA 트랙 A/B 테스트 실습 세션용 웹앱. 조마다 실제 테크 기업 기술블로그 사례 하나를 골라, 고정된 가상 사용자 모집단 위에서
**제출한 설계대로** 실험을 시뮬레이션하고, 강사는 조별 제출을 실시간으로 모아 LLM 비교 분석을 띄운다. 마지막엔 직소 방식으로 사례를 서로 공유한다.

## 문서 지도 (반드시 먼저 읽기)
- `docs/sim-core.md`: 공통 엔진 규칙, 노이즈·CRN, 통계 함수, Readout 타입, 플래그, **사례 플러그인 인터페이스**, 공통 스텝 뼈대
- `docs/cases/README.md`: 사례 카탈로그, 필수 개념 커버리지
- `docs/cases/{baemin,toss,daangn,netflix}.md`: 사례별 원문 사실, 모집단, 숨긴 효과, 설계→결과 규칙, 루브릭, 검증 시나리오
- `docs/review-contract.md`: LLM 리뷰 계약(team / class / share)
- `docs/ab-testing/README.md`: A/B 테스트 학습 위키 목차와 편집 원칙
- `docs/theory-coverage.md`: 이론 덱·위키가 각 개념을 설명하는지 정리한 근거표와 앱 도움말용 패러프레이즈 은행(앱의 이론 연결 문구는 여기서만 가져온다)
- `supabase/schema.sql`: DB
- `reference/prototype.html`: UI·카피·디자인 토큰 원본(배민 사례 단일 HTML 프로토타입)

## A/B 테스트 위키 편집 규칙
- 사용자가 Notion 원문을 전달하면 작성자의 설명 흐름과 내용을 보존한 채 `docs/ab-testing/`에 연재형 위키로 정리한다.
- Notion 원문의 `토글) 추천목차` 또는 `<details><summary>추천 목차</summary>…</details>` 부분은 옵시디언에만 보존하고, GitHub 위키 문서에는 포함하지 않는다.
- 원문 Notion 링크는 옵시디언에만 보존하고 GitHub 위키 문서에는 첨부하지 않는다.
- GitHub 위키에서는 문단 구분, 목록 들여쓰기, 제목 주변 공백과 내부 내비게이션을 정리해 읽기 쉽게 만든다.

## 강의 PPT 작성 규칙 (`docs/lecture/*.pptx`)
- 글씨 크기는 아래 단계만 쓴다. 새 슬라이드도 같은 단계에 맞춘다.

| 역할 | 크기 | 예 |
|---|---|---|
| 상단 라벨(kicker) | 15pt | "오프닝", "Ch2 · 가설 수립" |
| 슬라이드 제목 | 20pt | "오늘의 목표" |
| 소제목·흐름 라벨 | 20pt | "SQL → 시각화 → 그로스 → A/B 테스트" |
| 본문 | 15pt | 설명 문장, 목록, 표 본문 |
| 보조 설명·표 머리글 | 14pt | 회색 부연 설명, 캡션 |
| 출처 | 11pt | 출처 줄 (꼬리말은 10pt) |
| 강조 문장·숫자 | 30pt | 2장 목표 문장, "01" 번호, 핵심 수식 |
| 큰 숫자 | 54pt | "+12%", "64%" |

- 표지·장 표지는 레이아웃 고유 크기를 유지한다. 차트 내부 글씨는 12~14pt.
- 글자 간격(charSpacing) 조정, 카드형 사각형·색 띠·제목 밑줄을 쓰지 않는다. 구분은 여백과 크기 대비로 한다.
- 수치는 출처를 달거나 "교육용 예시"로 표기하고, 사례 문서의 숨긴 효과 값은 쓰지 않는다.

## 절대 규칙
1. **사례 문서의 "검증 시나리오"가 진실의 원천**. 파라미터는 sim-core의 보정 노브 범위(±50%) 안에서만 조정하고 `CALIBRATION.md`에 기록.
2. **원문 사실과 가상 수치를 섞지 않는다**. 화면마다 출처 박스 + "수치는 교육용 가상 데이터" 표기. 원문 문장은 짧게 요약만.
3. **숨긴 효과와 플래그는 조 화면 API로 내려보내지 않는다**(강사 화면, AI 리뷰, 정답 공개 이후만).
4. 모든 DB 쓰기는 Route Handler + service role. 클라이언트는 anon 읽기와 Realtime 구독만.
5. Solar(Upstage) API 키는 서버 전용.

## 스택
Next.js 15 (App Router) + TypeScript strict + Tailwind / Supabase (Postgres + Realtime) / `openai` SDK로 Solar API 호출(baseURL `https://api.upstage.ai/v1`, 모델 `solar-pro4`) / zod / Vitest / Vercel. 차트는 SVG 직접 구현(프로토타입 lineChart 포팅).

## 폴더 구조
```
app/
  page.tsx                      수업 코드 + 조 이름 입장
  admin/                        강사 로그인, 수업 생성
  c/[code]/t/[teamId]/          조 화면 (사례 선택 → 스텝별 화면)
  c/[code]/admin/               강사 화면
  api/{class,team/join,team/case,step,submit,simulate,review}/route.ts
lib/
  sim/core/                     stats.ts, rng.ts, crn.ts, readout.ts, flags.ts
  cases/<case>/                 index.ts(CasePlugin), population.ts, effects.ts, schema.ts, simulate.ts,
                                rubric.ts, CALIBRATION.md, __tests__/
  schemas.ts                    공통 zod (제출 envelope)
components/
  form/                         designSchema + formMeta → 입력란 자동 렌더링
  readout/                      공통 Readout 표, CI 바, SRM 스트립, 시계열
  cases/<case>/                 사례 전용 시각화
```

## 역할과 흐름
- 수강생: 수업 코드 + 조 이름 → **s0_pick에서 사례 선택**(사례당 최대 2조, 강사 설정) → 스텝 진행. teamId는 localStorage 유지.
- 강사: `ADMIN_PASSWORD` → 수업 생성 → 스텝 열기/닫기, 라이브 보드, AI 분석, 정답 공개.
- 공통 스텝: `s0_pick → s1_diagnose → s2_design → s3_run → s4_readout → s5_deep → s6_final → s7_lab → s8_share` (사례별 의미는 sim-core 6장 표). 상태 `locked | open | closed`.

## 화면
### 조 화면
- 좌측 스텝 내비 + 상단 진행 바(프로토타입의 최소주문금액바 모티프는 배민 사례에서만, 다른 사례는 사례 색으로 같은 구조)
- 스텝 화면 = 사례 플러그인이 제공하는 Phase 목록을 순서대로 렌더링: 진단/설계 폼(자동 렌더링) → 제출 → 시뮬 → Readout → 결정
- Readout 읽는 순서 고정: 데이터 품질(SRM) → 메인 → 가드레일 → 보조 → 사례 전용 패널 → 결정
- 조별 AI 피드백 카드(질문형 유도)
- s7_lab: 공통 함정 연구소(프로토타입 그대로, 클라이언트 시뮬)
- s8_share: 직소 브리핑 초안(AI share) + 결정 메모

### 강사 화면 (프로젝터용, 큰 글씨)
- 스텝 컨트롤, 조별 접속·사례 선택 현황(사례별 쏠림 경고)
- 라이브 보드: 현재 스텝 제출을 **사례별 탭**과 **전체 개념 보드** 두 가지로
- 결과 비교: 같은 사례를 고른 조끼리 "같은 모집단, 다른 설계, 다른 결과" 비교표(효과 추정치, CI, 유의, 달성 검정력, 플래그)
- AI 종합 분석(class): 개념 기준 교차 비교
- 정답 공개 토글: 조 화면에 원문 비교 해설(reveal) 노출

## API 요약
- `POST /api/team/case` {code, teamId, caseKey} → 사례당 조 수 제한 검사 후 저장
- `POST /api/submit` {code, teamId, step, phase, kind, payload} → 사례 플러그인의 zod로 검증
- `POST /api/simulate` {code, teamId, phase} → 최신 설계 + prior Readout으로 `plugin.simulate` → sim_runs 캐시(design_hash) → **flags와 숨김 필드를 제거한** Readout 반환
- `POST /api/review` {code, step, scope, teamId?}
- 나머지는 이전과 동일 (class 생성, team join, step 상태)

## 마일스톤 (각 단계 끝에 동작 확인 + 테스트 통과)
1. 스캐폴딩, Supabase, 수업 생성·조 입장·사례 선택, 스텝 Realtime
2. `lib/sim/core` + 통계 함수 테스트
3. 배민 플러그인 + 테스트 13개 → 조 화면 전 스텝(배민) 완성 ← **여기서 공통 컴포넌트를 굳힌다**
4. 강사 화면(라이브 보드, 비교표) + LLM 리뷰(team/class)
5. 토스 플러그인 + 테스트 12개 + 전용 패널(오프라인 리플레이, 구성 효과 분해, HTE, 서비스 표)
6. 당근 플러그인 + 테스트 13개 + 전용 패널(A/A 진단, 데이터 소스 비교, 동네 클러스터)
7. Netflix 플러그인 + 테스트 12개 + 전용 패널(인터리빙 선호, 귀속 토글, 밴딧 시뮬)
8. s7_lab, s8_share(AI share), 정답 공개
9. 부하 점검(조 10개 동시) + Vercel 배포

## 명령
`npm run dev` / `npm test` / `npm run build` / `vercel` / `vercel --prod`
