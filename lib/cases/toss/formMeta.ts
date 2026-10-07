import type { FieldMeta, FieldOption } from "../types";

const nOpt = (v: number): FieldOption => ({ value: v, label: `${v}회`, desc: `같은 종류의 푸시를 ${v}번 연속 열어보지 않으면 제외 대상이에요.` });
const N_OPTIONS = [2, 3, 4, 5, 6, 8].map(nOpt);
const W_OPTIONS: FieldOption[] = [
  { value: 7, label: "최근 7일", desc: "짧게 보면 무반응으로 판정되는 사용자가 줄어요." },
  { value: 14, label: "최근 14일" },
  { value: 30, label: "최근 30일", desc: "길게 보면 더 많은 사용자가 무반응으로 판정돼요." },
];
const C_OPTIONS: FieldOption[] = [
  { value: 7, label: "7일 쉬기" },
  { value: 14, label: "14일 쉬기" },
  { value: 30, label: "30일 쉬기", desc: "오래 쉬면 그만큼 도달이 줄어요." },
];
const G_OPTIONS: FieldOption[] = [
  { value: "same_service", label: "같은 서비스만", desc: "같은 서비스의 푸시끼리만 비슷하다고 봐요." },
  { value: "same_purpose", label: "서비스를 넘어 같은 목적 전체", desc: "다른 서비스라도 목적이 같으면 비슷하다고 봐요." },
];

const rule = (v: "V1" | "V2", title: string): FieldMeta[] => [
  { name: `variants.${v}.N`, label: `${title} · N: 연속 무반응 횟수`, type: "select", options: N_OPTIONS },
  { name: `variants.${v}.W`, label: `${title} · W: 무반응을 관찰하는 기간`, type: "select", options: W_OPTIONS },
  { name: `variants.${v}.C`, label: `${title} · C: 제외하고 쉬는 기간(쿨다운)`, type: "select", options: C_OPTIONS },
  { name: `variants.${v}.G`, label: `${title} · G: 비슷한 푸시의 범위`, type: "select", options: G_OPTIONS },
];

const PRIMARY_OPTIONS: FieldOption[] = [
  { value: "push_ctr", label: "푸시 CTR", desc: "발송된 푸시 중 눌린 비율" },
  { value: "clicks_per_user", label: "인당 주간 클릭 수", desc: "사용자 1명이 일주일에 누른 푸시 수" },
  { value: "app_open_au", label: "앱 오픈 AU", desc: "일주일에 한 번 이상 앱을 연 사용자 비율" },
  { value: "sends_per_user", label: "인당 주간 발송 수", desc: "사용자 1명이 일주일에 받은 푸시 수" },
];
const HYPOTHESIS_TYPE: FieldOption[] = [
  { value: "superiority", label: "우월성", desc: "더 좋아졌는지 확인해요." },
  { value: "non_inferiority", label: "비열등성", desc: "허용하는 손실보다 나빠지지 않았는지 확인해요." },
];

export const formMeta: Record<string, FieldMeta[]> = {
  diagnose: [
    {
      name: "chosen_analysis", label: "푸시를 많이 받는 사람의 CTR 이 낮은 이유를 어떻게 분석할까요?", type: "select",
      options: [
        { value: "pooled", label: "전체를 합쳐서(풀링) 비교" },
        { value: "stratified", label: "세그먼트·목적별로 나눠서(층화) 비교" },
        { value: "both", label: "둘 다 보고 비교" },
      ],
    },
    {
      name: "predicted_ctr_gain_pp", label: "발송을 20% 줄이면 CTR 이 몇 %p 오를 것 같나요?", help: "예측한 숫자를 적어요. 이유는 아래 칸에 적어요.",
      type: "number", step: 0.1, unit: "%p",
    },
    {
      name: "causal_claim", label: "관찰 데이터만으로 \"푸시를 줄이면 CTR 이 오른다\"는 인과를 말할 수 있나요?", type: "select",
      options: [{ value: "yes", label: "네" }, { value: "no", label: "아니요" }, { value: "unsure", label: "잘 모르겠어요" }],
    },
    { name: "rationale", label: "그렇게 생각한 이유", help: "CTR 이 오르는 게 사람들이 더 눌러서인지, 덜 보내서인지도 생각해보세요.", type: "textarea" },
  ],
  p1: [
    { name: "hypothesis.action", label: "대상과 Treatment: 누구에게 무엇을 적용하나요?", help: "[대상]에게 [Treatment]를 적용하면… 의 앞부분이에요. 바꾸는 것은 한 가지로 좁혀요.", type: "textarea" },
    { name: "hypothesis.behavior", label: "이유: 그래서 사용자 행동이 어떻게 달라지나요?", help: "왜 효과가 날지 메커니즘을 적어요.", type: "textarea" },
    { name: "hypothesis.impact", label: "Metric·방향·변화 크기: 어떤 지표가 얼마나 움직이나요?", help: "측정할 지표와 방향을 함께 적어요.", type: "textarea" },
    ...rule("V1", "변이안 1(V1)"),
    ...rule("V2", "변이안 2(V2)"),
    {
      name: "sample_fraction", label: "표본 비율", help: "전체 푸시 수신자 2,400만 명 중 실험에 쓰는 비율이에요. 대조군·V1·V2 에 똑같이 나눠요. (1%~20%)",
      type: "number", min: 0.01, max: 0.2, step: 0.01,
    },
    { name: "duration_weeks", label: "실험 기간", help: "2주~12주", type: "number", min: 2, max: 12, step: 1, unit: "주" },
    { name: "primary", label: "Primary 지표", help: "실험의 성패를 가르는 지표 한 개. 실험 전체가 좋은 변화인지 보는 OEC와 가까운 지표를 고르면 좋아요.", type: "select", options: PRIMARY_OPTIONS },
    { name: "hypothesis_type.push_ctr", label: "푸시 CTR 의 가설 유형", type: "select", options: HYPOTHESIS_TYPE },
    { name: "hypothesis_type.clicks_per_user", label: "인당 클릭 수의 가설 유형", type: "select", options: HYPOTHESIS_TYPE },
    { name: "hypothesis_type.app_open_au", label: "앱 오픈 AU 의 가설 유형", type: "select", options: HYPOTHESIS_TYPE },
    { name: "ni_margin_pct", label: "비열등성 마진", help: "비열등성을 쓴 지표에서 허용하는 손실이에요. 예: −1 은 대조군보다 1% 까지 줄어도 괜찮다는 뜻이에요.", type: "number", min: -10, max: 0, step: 0.5, unit: "%" },
    {
      name: "secondary", label: "Secondary·Driver 지표", help: "해석을 돕는 지표", type: "multiselect",
      options: [
        { value: "push_ctr", label: "푸시 CTR" },
        { value: "clicks_per_user", label: "인당 주간 클릭 수" },
        { value: "sends_per_user", label: "인당 주간 발송 수" },
        { value: "app_open_au", label: "앱 오픈 AU" },
        { value: "revenue_per_user", label: "인당 주간 매출" },
        { value: "opt_out_rate", label: "알림 수신 거부율" },
      ],
    },
    {
      name: "guardrails", label: "Guardrail 지표", help: "나빠지면 안 되는 지표", type: "multiselect",
      options: [
        { value: "app_open_au", label: "앱 오픈 AU" },
        { value: "service_au", label: "서비스별 AU (12개 서비스)", desc: "서비스마다 대조군과 비교해요." },
        { value: "revenue_per_user", label: "인당 주간 매출" },
        { value: "opt_out_rate", label: "알림 수신 거부율" },
      ],
    },
    {
      name: "ctr_analysis_unit", label: "CTR 분석 단위", help: "무엇을 한 건으로 셀까요?", type: "select",
      options: [
        { value: "push", label: "푸시 한 건", desc: "발송된 푸시 수를 표본 크기로 봐요." },
        { value: "user_delta", label: "사용자 단위(Delta Method)", desc: "사용자를 표본 단위로 두고 비율의 오차를 계산해요." },
      ],
    },
    { name: "cuped", label: "CUPED(실험 전 데이터로 분산 줄이기)", help: "실험 전 4주 행동을 공변량으로 써요.", type: "boolean" },
    {
      name: "correction", label: "서비스별 표의 다중검정 보정", type: "select",
      options: [{ value: "none", label: "보정 안 함" }, { value: "bonferroni", label: "Bonferroni" }, { value: "bh", label: "BH (거짓 발견율)" }],
    },
    {
      name: "stopping", label: "중간 확인 규칙", type: "select",
      options: [
        { value: "fixed", label: "기간이 끝날 때 한 번만 확인" },
        { value: "peek_stop", label: "매주 확인하다 유의하면 종료" },
        { value: "sequential", label: "순차 검정(경계를 넘으면 종료)" },
      ],
    },
    { name: "stakeholder_alignment", label: "서비스 담당자에게 목적·가드레일·리스크를 사전에 공유했나요?", type: "boolean" },
  ],
  p2: [
    {
      name: "arms", label: "실험 그룹", help: "s2 에서 제출한 변이안을 이어받아요.", type: "multiselect",
      options: [{ value: "A", label: "A (대조군)" }, { value: "V1", label: "V1" }, { value: "V2", label: "V2" }],
    },
    { name: "fraction_total", label: "전체 표본 비율", help: "세 그룹에 나눠요. 6%~30%. 처음 6% 실험의 사용자도 이어서 포함돼요.", type: "number", min: 0.06, max: 0.3, step: 0.01 },
    { name: "duration_weeks", label: "관찰 기간", help: "2주 이상", type: "number", min: 2, max: 12, step: 1, unit: "주" },
    { name: "cuped", label: "CUPED(실험 전 데이터로 분산 줄이기)", type: "boolean" },
    {
      name: "correction", label: "서비스별 표의 다중검정 보정", type: "select",
      options: [{ value: "none", label: "보정 안 함" }, { value: "bonferroni", label: "Bonferroni" }, { value: "bh", label: "BH (거짓 발견율)" }],
    },
    { name: "response_to_stakeholders", label: "서비스 담당자 요청에 대한 대응안", help: "실험 중에 담당자 요청이 들어오면 어떻게 답할지 적어요. 요청이 없었다면 비워 둬도 돼요.", type: "textarea" },
  ],
};
