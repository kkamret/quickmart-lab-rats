# 사례 ③ 당근: 거래후기 실험과 믿을 수 있는 실험 플랫폼

## 0. 메타
- 원문: 당근 팀 블로그 「1주 1개 실험하는 프로덕트 팀이 되는 여정」(2022.03.21) https://careers.daangn.com/blog/post/당근마켓-실험문화-데이터가치화팀/
- 화면 속 서비스명: 원문 각색임을 명시. 플랫폼 이름은 "외부 플랫폼 F"(특정 제품을 비방하지 않도록 익명화하되, 원문이 Firebase A/B를 썼다는 사실은 출처 박스에 그대로 표기)
- 난이도 ★★ (s5·s6는 ★★★) / 권장: 실험을 처음 접하지만 "데이터를 의심하는 법"을 배우고 싶은 조
- 커버 개념: 실험 문서와 가설, 트리거 기반 배정(배정 시점과 분석 모집단), ITT vs 트리거 분석, A/A 테스트, SRM, 배정 키(ID) 불일치로 인한 오염, 해싱과 salt, 계측(로깅) 신뢰성과 데이터 소스 선택, 신규 사용자 처리와 외적 타당성, 지표 정의(Goodhart), 품질 가드레일, 양면 시장과 간섭, **클러스터(동네) 배정과 클러스터 강건 SE**, Data-informed decision

### 원문에서 확인된 사실
- 거래후기 실험: 상대가 후기를 쓰면 푸시로 알려줌 → 후기를 받은 사용자도 후기를 남기도록 유도. 후기를 받은 사용자를 무작위로 반씩 나눠 실험군에 새 화면을 보여주고 후기 작성 여부를 비교
- 초기 실험: 검색 결과에 거래완료 게시글까지 기본 노출 → 글 작성 관련 지표 개선 → 지금까지 기본값으로 유지
- 실험이 어려웠던 이유: 추가 리소스, 설계 어려움(가설·지표 선정), 결과 해석 역량, 신뢰할 수 없는 플랫폼
- 외부 플랫폼(Firebase A/B) 문제: SDK 이벤트 기준 기록이라 오집계가 많음 / 플랫폼 자체 ID로 배정해 같은 사용자가 대조군과 실험군을 오감 / 시작·종료가 원하는 대로 안 됨, 앱 설치 직후 일정 기간 배정 안 됨 / 테스트가 어려움
- 대응: 실험 문서 템플릿, 자체 실험 플랫폼 구축, 결과 분석 자동화, Data-informed decision(결과가 결정을 대신하지 않고 팀이 함께 논의)
- 교육용 추가 요소(원문에 없음, 화면에 표기): 버그의 구체적 크기, 클라이언트 중복 이벤트, salt 재사용 문제, 동네 단위 클러스터 배정, 후기 품질 가드레일

## 0-1. 스텝 매핑
| 스텝 | 내용 |
|---|---|
| s1_diagnose | 실험 문서 템플릿 작성(배경, 문제, 가설, 지표, 성공 기준, 리스크) |
| s2_design | 거래후기 실험 설계(외부 플랫폼 F 위에서) |
| s3_run | A/A 테스트(선택) → 본 실험 실행 |
| s4_readout | 거래후기 1차 Readout(오염된 결과) → 결정 |
| s5_deep | 플랫폼 재설계 → A/A 재검증 → 거래후기 재실험 Readout |
| s6_final | 거래완료 게시글 검색 노출 실험(사용자 vs 동네 클러스터 배정) → 결정 |

---

## 1. 고정 모집단 (SEED = 20220321)
- 일 거래완료 600,000건 → 상대가 후기를 남길 확률 0.55 → **후기 수신 사용자 일 약 330,000명**(트리거 모집단)
- 후기 수신 푸시 열람률 0.62 → 후기 화면 진입자 일 약 205,000명
- 기본 답례 후기 작성률(72시간 내 제출 완료, 후기 화면 진입자 기준): 기존 사용자 0.38 / 신규 사용자(가입 7일 이내) 0.24
- 트리거 모집단 중 신규 사용자 비중: 0.09
- 후기 품질: "짧은 후기(10자 미만) 비율" 기본 0.22
- 사용자당 앱 인스턴스 ID 수: 1개 86% / 2개 이상 14% (재설치, 다중 기기, 업데이트 리셋)
- 동네(클러스터): 6,500개, 동네 크기는 로그정규(평균 활성 사용자 3,000명), 동네 내 상관(ICC) 지표별 0.01~0.04. 구현은 동네를 하나씩 만들지 않고 평균 크기와 ICC 로 디자인 효과만 계산함(동네 패널의 동네당 사용자 수는 실험 기간의 검색 사용자 기준이라 28일이면 약 1,723명)

---

## 2. 진짜 효과와 플랫폼 버그 (숨김)

### 2-1. 거래후기 새 화면
- 후기 화면 진입자 기준 답례 후기 작성률 **+4.0%p** (기존·신규 동일)
- 푸시를 열지 않은 사람은 새 화면을 못 보므로 효과 0 → 후기 수신자 전체 기준 +2.48%p
- 짧은 후기 비율 **+3.0%p**(새 화면이 "한 줄이라도"를 유도해 품질이 약간 떨어짐) → 품질 가드레일
- 앱 삭제율, 신고율: 효과 0

### 2-2. 외부 플랫폼 F의 버그 (설계 선택에 따라 발현)
| 버그 | 메커니즘 | 결과 |
|---|---|---|
| ID 플립 | 배정 키 = 앱 인스턴스 ID. ID가 2개 이상인 14% 사용자는 실험 중 그룹이 바뀌어 양쪽 화면을 모두 봄 | 이들의 효과는 절반이고, 분석은 사용자 ID로 조인해 첫 배정 그룹에 귀속 → 효과 희석(약 ×0.93). `CONTAMINATION` 은 배정 키만으로 정해짐(인스턴스 ID 배정이면 늘, 기기 ID 도 다중 기기 6%라 뜸(기준 3% 이상), user_id 해싱이면 없음). 인스턴스 단위 분석(중복 집계)은 설계 선택지로 모형화하지 않았고, A/A 진단 패널의 "양쪽 그룹에 동시에 존재하는 사용자"로만 보여줌 |
| 신규 설치 기본값 | 설치 후 24시간 동안 배정이 안 되고 대조군 화면을 보는데, 로그에는 "control"로 기록 | 트리거 모집단의 약 3%가 대조군으로 강제 배정됨 → 51.5 : 48.5 SRM. 진단 패널의 "설치 후 24시간 이내" 코호트는 대부분(약 90%) 대조군에 있음. 대조군에 작성률 낮은 신규 사용자가 몰려 처치 효과가 부풀려짐 → `SRM` |
| 클라이언트 중복 이벤트 | 새 화면에서 제출 재시도 시 `review_written` 이벤트가 약 2% 확률로 중복 발생(실험군만. 구현은 보정 노브 범위 안의 2.5%, CALIBRATION 참고) | 데이터 소스가 클라이언트 이벤트면 실험군 작성률 과대 → `INSTRUMENTATION` |
| SDK 이벤트 유실 | 구버전 안드로이드 SDK(안드로이드 사용자의 25%)에서 이벤트 7% 유실, 양쪽 동일 | 수준(level)만 낮아지고 차이는 거의 그대로. 서버 DB와 수치가 안 맞는 혼란 유발 |

### 2-3. 자체 플랫폼(재설계 후) 선택지와 결과
| 선택 | 결과 |
|---|---|
| 배정 키 = 내부 user_id 해싱 | ID 플립 제거 |
| 배정 키 = 기기 ID | 다중 기기 사용자(6%)만큼 플립 잔존 |
| salt = 실험별 새 salt | 정상 |
| salt = 이전 거래후기 실험과 동일 salt 재사용 | 지난 실험의 실험군이 이번에도 실험군 → 지난 실험의 학습 효과(+1.0%p, 습관)가 실험군에만 얹혀 효과 과대 → `CARRYOVER`(사례 전용 플래그) |
| 신규 사용자 = 첫 실행 시 서버에서 즉시 배정 | SRM 제거, 신규 포함으로 외적 타당성 확보 |
| 신규 사용자 = 실험에서 제외 | SRM 제거되지만 결과가 기존 사용자에게만 일반화 가능(카드에 경고) |
| 로깅 = 서버 이벤트(DB) | 중복·유실 제거 |

### 2-4. 거래완료 게시글 검색 노출 (s6)
- 개인 지표
  - 게시글 작성률(검색 사용자 중 7일 내 판매글 작성 완료): 기본 0.061 → **상대 +3.0%**
  - 검색 → 채팅 시작 전환율: 기본 0.142 → **상대 −0.6%**(판매완료 글을 눌렀다가 허탕) → 가드레일
  - 검색 재시도율: 상대 +2.0%(나쁨 쪽 신호, 보조)
- 시장 지표 (판매자 가격 설정이 시세에 가까워짐)
  - 신규 게시글 7일 내 판매완료율: 기본 0.48 → 진짜 시장 효과 **상대 +1.5%**
  - 간섭: 사용자 단위 배정이면 실험군 판매자의 적정 가격 글을 대조군 구매자도 보고 사며, 같은 동네 시세가 함께 움직임 → 사용자 단위로 측정한 판매완료율 효과는 **상대 +0.7%로 희석**
- 클러스터(동네) 배정이면 간섭이 거의 사라져 +1.5%가 관측되지만, 유효 표본이 동네 수(6,500)로 줄어 SE가 커짐
  - 사용자 단위 SE로 분석하면 SE가 디자인 효과 `sqrt(1 + (m̄−1)·ICC)`만큼 과소 → 위양성 → `NAIVE_SE`
- 정성 패널(Data-informed): 사용자 의견 6개(가격 참고에 좋다 / 살 수 없는 글이 섞여 답답하다 등)

---

## 3. 설계 입력 (zod) → 결과 반영

### 3-1. s1_diagnose (실험 문서)
```ts
{ background; problem; hypothesis: { action; behavior; impact };
  primary_metric_definition: 'started'|'submitted'|'submitted_72h';
  success_criteria: string; risks: string; owner: string }
```
- 채점: 지표 정의가 'submitted_72h'(측정 시점 명시)면 만점, 'started'면 Goodhart 위험 지적

### 3-2. s2_design (외부 플랫폼 F)
```ts
{
  assignment_timing: 'install_all'|'review_received'|'review_screen_open',
  analysis_population: 'all_assigned'|'review_received'|'review_screen_open',
  data_source: 'client_events'|'server_db',
  primary: 'reciprocal_review_rate', metric_definition: 'started'|'submitted'|'submitted_72h',
  guardrails: ('short_review_rate'|'uninstall_rate'|'report_rate')[],
  run_aa_first: boolean, aa_days?: number,
  alpha, power, mde_pp, duration_days, stopping
}
```

### 3-3. 반영 규칙
| 설계 | 규칙 |
|---|---|
| assignment_timing = install_all & analysis_population = all_assigned | 후기를 받지 않은 사용자까지 분석 → 효과가 극도로 희석(절대 약 0.15%p). N 이 매우 커서 통계적으로는 유의하지만 MDE 에 한참 못 미쳐, 진짜 효과가 MDE 의 25% 미만이면 검정력을 0.25 로 제한하는 MDE 비교 규칙으로 `UNDERPOWERED`(mde_pp ≤ 0.6 이면 사라짐) |
| assignment_timing = install_all & analysis_population = review_screen_open | 전원 배정했어도 화면 진입자로 좁혀 분석하면 정당한 트리거 분석. review_screen_open 배정과 같은 결과(+4.0%p 기준) |
| assignment_timing = review_received | 분석 모집단을 후기 수신자로 하면 ITT(+2.48%p 기준). 화면 진입자로 좁히면 대조군에도 "진입했을" 사람을 동일 기준으로 셀 수 있어 정당한 트리거 분석(+4.0%p) |
| assignment_timing = review_screen_open | 정당한 트리거 배정(+4.0%p), 표본은 62%로 줄지만 희석 없음 → 가장 효율적 |
| metric_definition = started | 작성 "시작"은 새 화면이 버튼만 눌러도 오름 → 효과 +7%p 과대(화면 진입자 기준·server_db. client_events 면 중복 이벤트까지 얹혀 약 +9%p), 품질과 무관 → `GOODHART`(사례 전용) |
| data_source = client_events | 중복 이벤트로 실험군 과대, 유실로 수준 하락 → `INSTRUMENTATION` |
| run_aa_first = true | s3에서 A/A Readout 제공: SRM(51.5:48.5) + A/A 작성률 차이 유의(대조군 쪽이 낮음) + 진단 패널(설치 코호트별 분포, 인스턴스→사용자 조인 시 양쪽에 동시 존재하는 사용자 14%) |
| run_aa_first = false | 같은 증상이 s4 Readout에 섞여 나옴. 진단 패널은 "조사하기" 버튼으로만 열림 |
| guardrails에 short_review_rate 없음 | 품질 하락을 못 봄. s4 해설에서 질문으로 유도 |
| stopping = peek_stop / sequential | 일별 누적 검정. 하루 표본이 매우 커서 A/A 가 아닌 설계는 대부분 1일차에 멈춤(install_all + all_assigned 의 sequential 만 3일차). `PEEKED` 는 peek_stop 에만 붙고 sequential 은 플래그 없음. 72시간 지표·요일 효과를 생각하면 너무 이른 종료이므로 결과의 종료일을 확인해야 함. A/A 실행은 설계의 중간 확인 규칙과 무관하게 늘 fixed |
| 계획 표본(planned) | p1·p2 에서는 하루 유입이 커서 계획 기간이 늘 1일로 나와 의미가 없음(강사 화면 참고용). p3 에서만 의미 있게 읽음 |

### 3-4. s4 Readout
- SRM, 작성률(설계 기준 모집단), 품질 가드레일, 세그먼트(신규/기존, OS/SDK 버전), 데이터 소스 비교(서버 DB 수치가 있다면 병기 — server_db 선택 시에만)
- 결정 옵션: 배포 / 결과 폐기하고 플랫폼부터 고친 뒤 재실험 / 신규 사용자만 빼고 재분석해서 배포

### 3-5. s5_deep (플랫폼 재설계 + 재실험)
```ts
{ assignment_key: 'user_id_hash'|'device_id'|'instance_id',
  salt: 'new_per_experiment'|'reuse_previous',
  new_user_policy: 'assign_on_first_launch'|'exclude',
  logging: 'server_events'|'client_events',
  rerun_aa: boolean, ...거래후기 설계 필드 재사용 }
```
- 깨끗한 설계면: SRM 없음, 작성률 +4.0%p(화면 진입자 기준) 유의, 짧은 후기 +3.0%p 유의 악화
- 결정 옵션: 배포 / 품질 보완(예: 최소 글자 안내) 후 재실험 / 배포 + 품질 모니터링

### 3-6. s6_final (거래완료 게시글 노출)
```ts
{ randomization_unit: 'user'|'neighborhood',
  primary: 'listing_creation_rate'|'sell_through_7d',
  guardrails: ('search_to_chat'|'search_retry')[],
  analysis_se: 'naive'|'cluster_robust',
  duration_days, alpha, power, mde_pct, qualitative_weight: string /* 정성 의견을 어떻게 반영할지 */ }
```
| 조합 | 결과 |
|---|---|
| user + listing_creation_rate | 정상: +3.0% 유의, 채팅 전환 −0.6%(검정력에 따라 경계) |
| user + sell_through_7d | 간섭으로 +0.7%만 관측(진짜 시장 효과 +1.5% 의 절반 이하). 7일부터 유의하게 나옴(검정력 7일 약 0.59, 14일 약 0.87) → `CONTAMINATION` |
| neighborhood + cluster_robust | 시장 효과 +1.5% 관측, CI 넓음(기간 충분하면 유의). 동네는 개별로 만들지 않고 평균 크기와 ICC 로 디자인 효과만 계산함(동네 패널: 28일이면 동네당 검색 사용자 약 1,723명) |
| neighborhood + naive | CI가 과도하게 좁아 작은 차이도 유의 → `NAIVE_SE` |
- 결정 옵션: 기본값으로 배포 / 배포 안 함 / 배포 + "판매완료 글 숨기기" 토글 제공 / 클러스터 배정으로 재실험

---

## 4. 함정과 발견 경로
| 함정 | 발견 경로 |
|---|---|
| ID 플립 오염 | A/A 진단 패널의 "양쪽 그룹에 동시에 존재하는 사용자" |
| 신규 설치 기본값 → SRM·편향 | SRM 경고 → 설치 코호트별 분포 |
| 클라이언트 중복 이벤트 | 클라이언트 vs 서버 DB 수치 비교 |
| 지표 정의 | 'started' 효과가 비정상적으로 큼(트위먼의 법칙) |
| salt 재사용 | s5에서 효과가 s4 깨끗한 추정보다 큼, 지난 실험 배정과 교차표 |
| 시장 간섭 | 판매완료율이 사용자 배정에서 작게 나오는 이유 |
| 클러스터 SE | naive vs cluster_robust CI 폭 비교 |

## 5. 루브릭
| 스텝 | 모범 답 |
|---|---|
| s1 | 측정 시점이 명시된 지표, 성공 기준을 사전에 숫자로 |
| s2 | 화면 진입 시점 트리거(또는 수신·설치 시점 배정 + 화면 진입자로 좁힌 동일 기준 트리거 분석), 서버 DB, 품질 가드레일, A/A 먼저 |
| s4 | 결과 폐기 후 플랫폼부터 수정 (원문 교훈: 신뢰할 수 없는 플랫폼의 결과는 리소스 낭비) |
| s5 | user_id 해싱 + 새 salt + 첫 실행 즉시 배정 + 서버 로깅 + A/A 재검증. 결정은 "배포 + 품질 모니터링" 또는 "품질 보완 후 재실험" 모두 정답(근거가 핵심) |
| s6 | 개인 지표 기준이면 사용자 배정, 시장 지표까지 보려면 동네 클러스터 + 클러스터 강건 SE. 원문은 기본값으로 유지. 정성 의견을 함께 고려(Data-informed)하면 만점 |

### reveal 해설 요지
원문은 거래완료 게시글 노출 실험으로 글 작성 지표 개선을 확인해 지금까지 기본값으로 쓰고 있다. 동시에 외부 플랫폼의 ID 불일치, 오집계, 배정 지연 같은 문제가 실험 신뢰를 떨어뜨렸고, 그래서 자체 플랫폼과 실험 문서 템플릿, 분석 자동화에 투자했다. 실험 결과가 결정을 대신하지 않고 팀이 함께 판단한다는 Data-informed 원칙으로 마무리된다.

## 6. 검증 시나리오 (Vitest)
| # | 설계 | 기대 |
|---|---|---|
| 1 | s2: review_screen_open, server_db, submitted_72h, A/A 실행 | A/A에서 SRM p < 0.001(신규 설치 버그), 양쪽 중복 사용자 비율 13~15% |
| 2 | 1의 본 실험 Readout | SRM, 관측 효과 3.9~4.6%p(희석과 편향이 섞임) |
| 3 | 1과 같되 client_events | 실험군 작성률이 server_db 대비 0.6~1.0%p 높게, `INSTRUMENTATION` |
| 4 | install_all + all_assigned, mde_pp = 2 | 관측 효과 0.3%p 미만(약 0.15%p, 통계적으로는 유의), MDE 비교로 `UNDERPOWERED` |
| 5 | metric_definition=started | 효과 6~8%p, `GOODHART` |
| 6 | s5: user_id_hash, new salt, assign_on_first_launch, server | SRM 없음, 효과 3.8~4.2%p 유의, 짧은 후기 +2.7~3.3%p 유의 |
| 7 | 6과 같되 salt=reuse_previous | 효과 4.6~5.2%p, `CARRYOVER` |
| 8 | 6과 같되 device_id | 중복 사용자 5~7%, 효과 소폭 희석 |
| 9 | s6: user + listing_creation_rate, 14일 | 작성률 상대 +2.6~3.4% 유의 |
| 10 | s6: user + sell_through_7d, 14일 | 상대 +0.5~0.9%, 유의, `CONTAMINATION` |
| 11 | s6: neighborhood + cluster_robust, 28일 | 판매완료율 상대 +1.2~1.8%, CI 폭이 naive의 2배 이상 |
| 12 | s6: neighborhood + naive | `NAIVE_SE`, A/A 모드 400회 위양성률 15% 이상 |
| 13 | 결정성·CRN | 동일 설계 동일 출력 |
