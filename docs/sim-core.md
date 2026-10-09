# 시뮬레이션 코어 명세 (lib/sim/core + 사례 플러그인 규약)

모든 사례가 공유하는 규칙. 사례별 모집단·효과·설계 규칙은 `docs/cases/<case>.md`.

## 0. 대원칙
1. **고정되는 것**: 가상 사용자 모집단, 진짜 효과(true effect), 노이즈 스트림. 사례별 `SEED` 상수로 고정.
2. **조가 바꾸는 것**: 설계(지표, 단위, 기간, 표본, 분석 방법, 정책 파라미터 등). 결과는 오직 설계에 따라 달라진다.
3. **진짜 효과는 비공개**: 조 화면 API 응답에 절대 포함하지 않는다. 강사 화면의 "정답 공개" 이후에만.
4. **결정성**: 같은 (case, phase, design) → 바이트 단위로 같은 Readout. 캐시 키 = `sha256(case|phase|canonicalJSON(design))`.
5. **공통 난수(CRN)**: 노이즈 시드 = `hash(SEED, case, phase, period, segment, arm, metric)`. 설계가 달라도 같은 기간·세그먼트·그룹의 노이즈는 공유 → 조별 결과 차이 = 설계 차이.
   - 단, arm 이름이 다른 설계끼리는 "A(대조군)" 스트림만 공유된다.
6. **보정 노브**: 사례 문서의 효과 파라미터는 ±50% 범위에서 조정해도 된다. 기준은 각 사례의 "검증 시나리오" 표를 모두 통과하는 것. 조정한 값은 `lib/cases/<case>/CALIBRATION.md`에 기록.
7. 원문 수치가 공개된 경우 Readout이 그 방향과 크기에 맞도록 보정한다(각 사례 문서의 "원문 대조" 항목). 공개되지 않은 수치는 전부 가상.

## 1. 노이즈 생성
- 비율형 카운트: `x = round(n·p + sqrt(n·p·(1−p))·z)`, `0 ≤ x ≤ n`
- 평균형: 그룹 평균 = `μ + (σ/√n)·z`, 표본 SD는 `σ·(1 + 0.02·z')`
- 사용자 단위 비율지표(클릭/발송 등)는 사용자당 1·2차 적률(E[X], E[Y], Var, Cov)을 세그먼트별로 정의하고, 그룹 합계를 정규근사로 생성. Delta Method와 단순 이항 SE를 둘 다 계산할 수 있어야 한다.
- 꼬리가 긴 지표(시청 시간 등)는 혼합분포(0 질량 + 로그정규)에서 **고래 사용자 수**를 포아송으로 뽑아 그룹 평균에 반영 → 평균이 소수 사용자에 흔들리는 현상 재현.
- PRNG: mulberry32, z는 Box–Muller.

## 2. 통계 함수 (lib/sim/core/stats.ts)
프로토타입 구현 포팅 + 추가분:
- `normCdf, normInv, propTest, meanTest, srm(counts, ratios), ssProp, ssMean, powerProp, powerMean, sigFlags(p[], α, 'none'|'bonferroni'|'bh')`
- `deltaRatio(meanX, meanY, varX, varY, covXY, n)` → 비율지표 SE
- `nonInferiority(d, se, margin, α)` → 단측 비열등성 검정
- `cuped(y, x, θ)` → 분산 축소 후 SE (θ = Cov(Y,X)/Var(X), 분산 배수 = 1 − ρ²)
- `clusterSE(clusterMeans, clusterSizes)` → 클러스터 강건 SE (클러스터 배정용)
- `obfBoundary(k, K, α)` → O'Brien–Fleming형 순차 경계
- `winsorize(meanFn, cap)` → 꼬리 지표 상한 처리 후 평균·SE

## 3. Readout 공통 타입
```ts
type Arm = 'A'|'B'|'C'|'D'
type MetricResult = {
  key: string; label: string; role: 'P'|'G'|'S'; type: 'prop'|'mean'|'ratio'
  arms: Record<Arm, { n: number; x?: number; mean?: number; sd?: number }>
  comparisons: { vs: Arm; arm: Arm; d: number; ci: [number,number]; rel: number; relCi: [number,number];
                 p: number; win: number; significant: boolean; method: string }[]
}
type Readout = {
  caseKey: string; phase: string; designHash: string
  periods: PeriodRow[]          // 일별 또는 주별
  stoppedAt?: number
  srm?: { counts: number[]; ratios: number[]; p: number }
  metrics: MetricResult[]
  planned?: { nPerArm: number; days: number }; achievedPower?: number
  panels: Record<string, unknown>   // 사례 전용 패널 데이터 (세그먼트, 트리거, 인터리빙 등)
  flags: string[]                   // 조 화면에는 미노출
  costs?: Record<string, number>    // 실험 비용 (쿠폰 비용, 도달 손실 등)
}
```

## 4. 공통 경고 플래그
`SRM, UNIT_MISMATCH, SHORT_DURATION, UNDERPOWERED, PEEKED, SIMPSON_RISK, MULTIPLE_TESTING, SELECTION_BIAS, RATIO_COMPOSITION, NAIVE_SE, OFFLINE_ONLINE_GAP, POSITION_BIAS, CONTAMINATION, INSTRUMENTATION, NOVELTY`
- 각 사례 문서에 플래그 발생 조건을 명시한다.
- 플래그는 조 화면에 보이지 않는다. 데이터에서 스스로 발견하게 하고, 강사 화면과 AI 리뷰 입력에만 쓴다.

## 5. 사례 플러그인 인터페이스 (lib/cases/<case>/index.ts)
```ts
export interface CasePlugin<D> {
  key: 'baemin'|'toss'|'daangn'|'netflix'
  meta: { title; company; sourceUrl; sourceTitle; difficulty: 1|2|3|4; concepts: string[] }
  phases: { key: string; step: StepKey; title: string; kind: 'diagnose'|'design'|'run'|'readout'|'decide'
            intro?: PhaseIntro; actionWhy?: { aa?: Why; main?: Why } }[]   // 다리 문장, 실행 버튼 한 줄(선택)
  designSchema: Record<string /*phase*/, ZodSchema>      // 입력란별 폼 자동 생성에 사용
  formMeta: Record<string, FieldMeta[]>                   // 라벨, 도움말, 선택지 설명(해요체), why?(입력란 목적)·options[].why?(보기 한 줄)
  simulate(phase: string, design: D, ctx: { prior: Record<string, Readout> }): Readout
  rubric: Record<string /*phase*/, string>                // docs/cases/<case>.md의 루브릭을 빌드 시 임베드
  decisions: Record<string, { options: { id; label; desc; why? }[]; rationaleWhy? }>
  stepIntro?: { s7_lab?: PhaseIntro; s8_share?: PhaseIntro }   // Phase 가 없는 공통 스텝의 다리 문장(선택)
  reveal: Record<string, string>                          // 정답 공개 후 보여줄 원문 비교 해설
}
```
- 폼은 `designSchema + formMeta`로 자동 렌더링(공통 컴포넌트). 사례 전용 시각화는 `components/cases/<case>/`.
- 선택지 근거: `Why = { text; src: 1~5 | 'case' }`, `PhaseIntro = { lines: Why[]; theory?: TheoryKey[] }`. 화면에는 문장과 챕터(`Ch3`) 또는 `사례` 배지만 보인다. 배민은 `lib/cases/baemin/why.ts`에 승인 문장을 모으고 `ui.ts`에서 붙인다(설계: `docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md`). why 데이터가 없는 사례는 화면이 그대로다.
- `ctx.prior`: 앞 Phase의 Readout(예: 당근 P2는 P1 A/A 결과를 참조).

## 6. 공통 스텝 뼈대 (강사가 한 번에 열고 닫음)
| 스텝 | 공통 의미 | 배민 | 토스 | 당근 | Netflix |
|---|---|---|---|---|---|
| s1_diagnose | 상황·관찰 데이터 진단 | 이탈 퍼널 진단 | 관찰 데이터 EDA | 실험 문서 작성 | 오프라인 평가 결과 |
| s2_design | 실험/정책 설계 | P1 설계 | 디타게팅 규칙 + ABC 설계 | 거래후기 실험 설계 | 스크리닝 방식 설계 |
| s3_run | 실행·모니터링 | P1 실행 (A/A, peeking) | 주간 대시보드 | A/A + 본 실험 | 인터리빙 실행 |
| s4_readout | 1차 Readout + 결정 | P1 결과 | 2개월 결과 | 거래후기 결과(오염) | 스크리닝 결과 |
| s5_deep | 심화 Phase | P2 + P3 | 30% 확대 + HTE | 플랫폼 재설계 + 재실험 | 결선 A/B |
| s6_final | 마지막 Phase + 결정 | P4 | 최종 배포안 | 거래완료 게시글 실험 | 출시 결정 + 홀드아웃 |
| s7_lab | 함정 연구소 | 공통 | | | |
| s8_share | 직소 공유 + 결정 메모 | 공통 | | | |
