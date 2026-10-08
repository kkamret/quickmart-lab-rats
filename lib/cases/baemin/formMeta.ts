import type { FieldMeta, FieldOption } from "../types";

const METRIC_OPTIONS: FieldOption[] = [
  { value: "abandon", label: "장바구니 이탈률", desc: "장바구니에 담은 사용자 중 주문하지 않고 떠난 비율" },
  { value: "conv", label: "커머스 주문전환율", desc: "유입 사용자 중 주문까지 간 비율" },
  { value: "aov", label: "평균주문금액", desc: "주문 한 건당 평균 금액" },
  { value: "gmv", label: "인당 거래액", desc: "유입 사용자 1명당 평균 거래액" },
  { value: "near_min_share", label: "최소주문금액 근처 주문 비중", desc: "최소주문금액 +2천 원 이내로 주문한 비율" },
  { value: "bar_click", label: "바 클릭률", desc: "바를 누른 비율" },
  { value: "crash", label: "앱 크래시율", desc: "앱이 비정상 종료된 비율" },
  { value: "load_time", label: "로딩 시간", desc: "화면이 뜨는 데 걸린 시간" },
  { value: "repurchase7", label: "7일 재구매율", desc: "주문자 중 7일 안에 다시 주문한 비율" },
  { value: "cs_rate", label: "고객 문의율", desc: "주문 대비 고객 문의 비율" },
  { value: "min_reach", label: "최소주문금액 도달률", desc: "장바구니 사용자 중 최소주문금액을 채운 비율" },
];

const common: FieldMeta[] = [
  { name: "hypothesis.action", label: "대상과 Treatment: 누구에게 무엇을 적용하나요?", help: "[대상]에게 [Treatment]를 적용하면… 의 앞부분이에요. 바꾸는 것은 한 가지로 좁혀요.", type: "textarea" },
  { name: "hypothesis.behavior", label: "이유: 그래서 사용자 행동이 어떻게 달라지나요?", help: "왜 효과가 날지 메커니즘을 적어요.", type: "textarea" },
  { name: "hypothesis.impact", label: "Metric·방향·변화 크기: 어떤 지표가 얼마나 움직이나요?", help: "측정할 지표와 방향을 함께 적어요.", type: "textarea" },
  {
    name: "scope.os", label: "OS 범위", type: "select",
    options: [
      { value: "android", label: "안드로이드만", desc: "일 유입의 약 59%. 작게 시작해 리스크를 줄여요." },
      { value: "all", label: "전체 OS", desc: "iOS 구버전 사용자가 포함돼요." },
    ],
  },
  {
    name: "scope.surface", label: "화면 범위", type: "select",
    options: [
      { value: "store_home", label: "가게홈만", desc: "탐색 화면 중 약 56%" },
      { value: "all", label: "전 화면" },
    ],
  },
  {
    name: "unit", label: "실험 단위 (Randomization Unit)", help: "무엇 단위로 무작위 배정하나요?", type: "select",
    options: [
      { value: "user", label: "사용자", desc: "같은 사람은 항상 같은 그룹이에요." },
      { value: "session", label: "세션", desc: "같은 사람이 세션마다 다른 그룹을 볼 수 있어요. 사람을 계속 알아보기 어려울 때 쓰는 단위예요." },
      { value: "pageview", label: "페이지뷰", desc: "화면을 열 때마다 그룹이 바뀔 수 있어요." },
    ],
  },
  { name: "metrics.primary", label: "Primary 지표", help: "실험의 성패를 가르는 지표 한 개. 실험 전체가 좋은 변화인지 보는 OEC와 가까운 지표를 고르면 좋아요.", type: "select", options: METRIC_OPTIONS },
  { name: "metrics.secondary", label: "Secondary·Driver 지표", help: "다음 가설을 찾는 데 쓰는 지표", type: "multiselect", options: METRIC_OPTIONS },
  { name: "metrics.guardrails", label: "Guardrail 지표", help: "나빠지면 안 되는 지표", type: "multiselect", options: METRIC_OPTIONS },
  {
    name: "alpha", label: "유의수준(α)", help: "엄격하게(작게) 잡을수록 필요한 표본과 실험 기간이 늘어요.", type: "select",
    options: [{ value: 0.01, label: "1%" }, { value: 0.05, label: "5%" }, { value: 0.1, label: "10%" }],
  },
  {
    name: "power", label: "검정력", help: "높게 잡을수록 실제 효과를 놓칠 가능성이 줄지만 표본과 기간이 늘어요.", type: "select",
    options: [{ value: 0.7, label: "70%" }, { value: 0.8, label: "80%" }, { value: 0.9, label: "90%" }],
  },
  { name: "mde_pp", label: "최소 검출 효과(MDE)", help: "비율 지표는 절대 %p, 금액 지표는 상대 %. 통계가 아니라 비즈니스가 정해요. 도입할 가치가 있는 최소 효과를 기준으로 잡아요.", type: "number", min: 0.01, step: 0.1, unit: "%p 또는 %" },
  { name: "duration_days", label: "실험 기간", help: "7일 미만은 입력할 수 없어요.", type: "number", min: 7, max: 28, step: 1, unit: "일" },
  { name: "allocation", label: "투입 비율", help: "범위 트래픽 중 실험에 쓰는 비율", type: "number", min: 0.05, max: 1, step: 0.05 },
  {
    name: "ramp", label: "램프업", help: "같은 표본이면 A:B를 50:50으로 나눌 때 가장 효율적이고, B를 10%만 노출하는 건 위험 관리용이에요. 대신 B 표본이 천천히 쌓여요.", type: "select",
    options: [
      { value: "none", label: "처음부터 전부 노출" },
      { value: "10_50_100", label: "1일차 10% → 2일차 50% → 3일차부터 100% 노출" },
      { value: "10_week1_50_week2", label: "1주차 B 10% → 2주차 B 50% 배정" },
    ],
  },
  {
    name: "analysis_mode", label: "분석 방식", help: "램프업처럼 기간마다 A:B 배정 비율이 달라질 수 있어요. 기간을 합쳐서 볼지, 배정 비율이 같은 기간끼리 나눠 본 뒤 합칠지 골라요.", type: "select",
    options: [
      { value: "pooled", label: "전체 기간을 합쳐서 분석" },
      { value: "stratified", label: "배정 비율이 같은 기간끼리 나눠 비교한 뒤 합쳐서 분석" },
    ],
  },
  {
    name: "stopping", label: "중간 확인 규칙", type: "select",
    options: [
      { value: "fixed", label: "기간이 끝날 때 한 번만 확인" },
      { value: "peek_stop", label: "매일 확인하다 유의하면 종료" },
      { value: "sequential", label: "순차 검정(경계를 넘으면 종료)" },
    ],
  },
  {
    name: "count_basis", label: "집계 기준", help: "누구를 한 명으로 셀까요?", type: "select",
    options: [
      { value: "assignment", label: "배정 기준", desc: "그룹에 배정된 사용자 모두" },
      { value: "exposure", label: "노출 로그 기준", desc: "첫 화면 로그가 남은 사용자만" },
    ],
  },
];

export const formMeta: Record<string, FieldMeta[]> = {
  diagnose: [
    {
      name: "causal_claim", label: "관찰 데이터만으로 \"바를 보여주면 이탈이 줄어든다\"고 말할 수 있나요?", type: "select",
      options: [{ value: "yes", label: "네" }, { value: "no", label: "아니요" }, { value: "unsure", label: "잘 모르겠어요" }],
    },
    { name: "rationale", label: "그렇게 생각한 이유", help: "다른 설명(교란)이 가능한지 적어보세요.", type: "textarea" },
  ],
  p1: common,
  p2: [
    ...common,
    { name: "qa_old_ios", label: "iOS 구버전에서 사전 QA를 했나요?", help: "하지 않았다면 구버전에서 문제가 생길 수 있어요.", type: "boolean" },
  ],
  p3: [
    ...common,
    { name: "trigger_logging", label: "트리거 조건 로깅(counterfactual logging)", help: "대조군에서도 \"문구가 있었다면 노출됐을\" 조건을 기록해요.", type: "boolean" },
    {
      name: "coupon_ops", label: "쿠폰 운영", type: "select",
      options: [
        { value: "low", label: "현재 수준", desc: "문구 노출 조건을 채우는 사용자가 적어요." },
        { value: "high", label: "마케팅 협업으로 확대", desc: "노출 대상이 늘지만 쿠폰 비용이 들어요." },
      ],
    },
  ],
  p4: [
    ...common,
    {
      name: "arms", label: "실험 그룹", help: "A 는 대조군, B 는 항상 노출, C 는 부족 금액이 8천 원 이하일 때만 노출해요. A/B/n 은 대조군 하나에 실험군을 둘 이상 두고 비교하는 형태예요.", type: "multiselect",
      options: [{ value: "A", label: "A (대조군)" }, { value: "B", label: "B (항상 노출)" }, { value: "C", label: "C (부족 금액 8천 원 이하만)" }],
    },
    {
      name: "correction", label: "다중검정 보정", type: "select",
      options: [{ value: "none", label: "보정 안 함" }, { value: "bonferroni", label: "Bonferroni" }, { value: "bh", label: "BH (거짓 발견율)" }],
    },
  ],
};
