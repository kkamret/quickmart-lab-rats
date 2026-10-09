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
  analysis_mode: w("같은 조건끼리 묶은 층별로 효과를 구해 합치는 분석이 있어서, 결과를 어떻게 합칠지 골라요.", 4),
  stopping: w("결과를 언제, 어떤 규칙으로 확인하고 끝낼지 실험 전에 정해요.", 3),
  count_basis: w("분석에서 누구를 셀지 실험 전에 정해요. 배정(어느 그룹)과 노출(실제로 봤나)은 따로 기록돼요.", 2),
  trigger_logging: w("문구는 조건을 채운 사람에게만 보여서, 누구를 분석할지와 그 조건을 어떻게 기록할지 실험 전에 정해요.", 2),
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
    stratified: w("배정 비율이 같은 기간을 한 층으로 보고, 층별 효과를 구해 합쳐요.", 4),
  },
  stopping: {
    fixed: w("미리 정한 종료 시점에 한 번 최종 검정해요.", 3),
    peek_stop: w("매일 대시보드를 보며 판단하는 실무 상황을 그대로 규칙으로 옮긴 보기예요.", 3),
    sequential: w("중간 확인을 전제로 경계를 미리 설계하고, 경계를 넘으면 멈춰요. 대가로 검정력이 조금 낮아요.", 4),
  },
  count_basis: {
    assignment: w("그룹에 배정된 사용자를 모두 세요. 배정된 사람이 화면에 한 번도 오지 않았을 수도 있어요.", 2),
    exposure: w("화면 로그가 남은 사용자만 세요. 영향받을 수 있는 사람만 분석하면 노이즈가 줄어요.", 2),
  },
  trigger_logging: {
    true: w("A·B 모두에 같은 조건 기록이 남아요.", 2),
    false: w("실험군에서 문구가 실제로 나간 기록만 남아요.", 2),
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
  abandon: w("장바구니 단계에서 주문 없이 떠난 비율이에요. 대조군 일반 고객은 실험 기간 전체로 보면 약 58~61%예요.", 2),
  conv: w("유입부터 주문까지 퍼널 전체의 전환을 재요. 분자(주문한 사용자)와 분모(유입 사용자)가 정해진 지표예요.", 2),
  aov: w("주문 한 건의 평균 금액이에요(대조군 일반 고객 약 25,200원). 보조 지표 예시와 비즈니스 안정성 예시에 모두 나오는 지표예요.", 2),
  gmv: w("유입 사용자 1명당 평균 거래액이에요. 사용자당 값으로 잰 지표예요.", 2),
  near_min_share: w("최소주문금액 바로 위(+2천 원 이내)에서 끝난 주문의 비중이에요. 대조군 기준 일반 고객 약 18%예요.", "case"),
  bar_click: w("바를 누른 비율로, Treatment(바)에 가장 가까운 반응이에요.", 2),
  crash: w("앱이 비정상 종료된 비율로, 제품 안정성을 재는 지표예요. 대조군 기준 약 0.42~0.45%예요(실험 범위에 따라 달라요).", 2),
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
    extend_rerun: w("구간이 넓거나 분석 기간이 첫 주에 그쳐 아직 판단하기 이를 때, 기간·표본을 늘려 다시 돌리는 결정이에요.", 5),
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
      w("데이터 품질·가드레일에 이상이 있거나 분석 기간이 첫 주에 그쳤다면, 해석을 멈추고 원인을 고치거나 기간을 늘려 다시 돌려요.", 5),
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
      w("문구는 \"고허들 쿠폰 보유 + 최소금액 달성\" 조건을 채운 사람에게만 보여요. 누구를 분석할지 실험 전에 정해요.", 2),
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
