import type { FieldMeta, FieldOption } from "../types";

const CANDIDATES: FieldOption[] = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"].map((r) => ({ value: r, label: r }));
const CORRECTION: FieldOption[] = [
  { value: "none", label: "보정 안 함" },
  { value: "bonferroni", label: "Bonferroni", desc: "유의수준을 후보 수로 나눠요." },
  { value: "bh", label: "BH (거짓발견율 제어)", desc: "p 값 순위에 따라 기준을 조금씩 완화해요." },
];
const STOPPING: FieldOption[] = [
  { value: "fixed", label: "기간이 끝날 때 한 번만 확인" },
  { value: "peek_stop", label: "매주 확인하다 유의하면 종료" },
  { value: "sequential", label: "순차 검정(경계를 넘으면 종료)" },
];

export const formMeta: Record<string, FieldMeta[]> = {
  diagnose: [
    {
      name: "ship_offline_best", label: "오프라인 1등(R1)을 바로 출시할까요?", type: "select",
      options: [{ value: "no", label: "아니요, 온라인에서 먼저 확인해요" }, { value: "yes", label: "네, 바로 출시해요" }],
    },
    { name: "reason", label: "이유", help: "오프라인 지표를 얼마나 믿을 수 있는지 근거를 적어주세요.", type: "textarea" },
    {
      name: "offline_online_risks", label: "오프라인과 온라인 결과가 다를 수 있는 이유", help: "해당하는 것을 모두 골라주세요.", type: "multiselect",
      options: [
        { value: "training_bias", label: "학습 데이터 편향", desc: "과거에 노출된 것만 로그에 남아요." },
        { value: "feedback_loop", label: "피드백 루프", desc: "추천이 다음 로그를 바꿔요." },
        { value: "metric_mismatch", label: "목표 지표 불일치", desc: "NDCG 가 사업 지표가 아니에요." },
        { value: "position_bias", label: "위치 편향" },
        { value: "novelty", label: "신규성 효과" },
        { value: "none", label: "특별한 이유 없음" },
      ],
    },
  ],
  p1: [
    {
      name: "hypothesis", label: "가설 한 문장 (선택)", type: "textarea",
      help: "[대상]에게 [Treatment]를 적용하면, [이유] 때문에 [Metric]이 [방향]으로 변할 것이다. 예: 오프라인 1위 랭커를 그대로 쓰는 대신 온라인에서 걸러 내면, …",
    },
    {
      name: "method", label: "스크리닝 방식", help: "후보 8개를 어떻게 걸러낼까요?", type: "select",
      options: [
        { value: "abn_all", label: "전부 A/B/n", desc: "후보마다 그룹을 만들어 현행과 비교해요." },
        { value: "interleaving", label: "인터리빙 먼저", desc: "한 멤버의 목록에 두 랭커의 결과를 섞어서 보여줘요." },
      ],
    },
    { name: "candidates", label: "스크리닝할 후보", type: "multiselect", options: CANDIDATES },
    { name: "abn_primary", label: "[A/B/n] Primary 지표", help: "A/B/n 을 고른 경우에만 써요.", type: "select", options: [{ value: "hours", label: "주간 시청 시간" }, { value: "retention", label: "28일 리텐션" }] },
    { name: "abn_fraction", label: "[A/B/n] 실험에 쓸 멤버 비율", help: "전체 멤버 중 몇 %를 쓰는지(0.01~0.20)", type: "number", min: 0.01, max: 0.2, step: 0.01 },
    { name: "abn_weeks", label: "[A/B/n] 기간", type: "number", min: 1, max: 8, step: 1, unit: "주" },
    {
      name: "il_scheme", label: "[인터리빙] 섞는 방식", help: "인터리빙을 고른 경우에만 써요.", type: "select",
      options: [
        { value: "team_draft", label: "Team Draft", desc: "매 라운드 선픽 랭커를 무작위로 정해요." },
        { value: "balanced_fixed_first", label: "Balanced (첫 슬롯 고정)", desc: "첫 슬롯을 늘 같은 랭커가 가져가요." },
      ],
    },
    {
      name: "il_credit", label: "[인터리빙] 성과 귀속 기준", help: "어떤 행동을 그 랭커의 성과로 셀까요?", type: "select",
      options: [{ value: "play_start", label: "재생 시작" }, { value: "qualified_play_10min", label: "충분한 시청(10분 이상)" }],
    },
    { name: "il_members_per_pair", label: "[인터리빙] 후보 쌍(R0 vs 후보)당 멤버 수", type: "number", min: 1000, max: 500000, step: 1000, unit: "명" },
    { name: "il_days", label: "[인터리빙] 기간", type: "number", min: 1, max: 28, step: 1, unit: "일" },
    { name: "correction", label: "다중검정 보정", help: "후보가 여러 개예요.", type: "select", options: CORRECTION },
    { name: "advance_rule", label: "결선 진출 기준", help: "결과를 보기 전에 정해요. (예: 보정 후 유의 + 선호도 0.51 이상)", type: "textarea" },
  ],
  p2: [
    { name: "finalists", label: "결선 후보 (2~3개)", help: "현행(R0)은 자동으로 들어가요.", type: "multiselect", options: CANDIDATES },
    { name: "fraction", label: "실험에 쓸 멤버 비율", help: "전체 멤버 중 몇 %를 쓰는지(0.01~0.20). 그룹 수로 똑같이 나눠요.", type: "number", min: 0.01, max: 0.2, step: 0.01 },
    { name: "weeks", label: "기간", type: "number", min: 1, max: 8, step: 1, unit: "주" },
    {
      name: "primary", label: "Primary 지표", help: "실험 전체가 좋은 변화인지 보는 OEC와 가까운 지표를 고르면 좋아요.", type: "select",
      options: [
        { value: "hours", label: "주간 시청 시간" },
        { value: "retention", label: "28일 리텐션", desc: "습관 형성에 시간이 걸려요." },
        { value: "surrogate_2ep", label: "7일 내 시리즈 2화 이상 시청 비율 (대리 지표)", desc: "진짜 원하는 가치를 대신 재는 지표(proxy)예요." },
      ],
    },
    {
      name: "hours_treatment", label: "시청 시간 처리", help: "Primary 지표가 시청 시간일 때 적용돼요. 꼬리가 긴 분포예요.", type: "select",
      options: [
        { value: "raw", label: "원시 평균" },
        { value: "winsorize_p99", label: "윈저라이징(상위 1% 상한)" },
        { value: "log", label: "로그 변환", desc: "ln(1+시간)의 평균을 비교해요." },
      ],
    },
    { name: "cuped", label: "CUPED 사용", help: "실험 전 4주 시청 시간으로 분산을 줄여요.", type: "boolean" },
    { name: "correction", label: "다중검정 보정", type: "select", options: CORRECTION },
    { name: "stopping", label: "중간 확인 규칙", type: "select", options: STOPPING },
    { name: "exclude_first_week", label: "첫 주 제외하고 분석", help: "새 랭커를 처음 만난 구간을 빼요.", type: "boolean" },
  ],
  p3: [
    {
      name: "ship", label: "출시할 랭커", type: "select",
      options: [{ value: "R3", label: "R3" }, { value: "R4", label: "R4" }, { value: "R2", label: "R2" }, { value: "none", label: "출시하지 않아요" }],
    },
    {
      name: "long_term", label: "장기 검증 방식", type: "select",
      options: [
        { value: "holdout", label: "장기 홀드아웃", desc: "일부 멤버는 계속 현행 랭커를 써요." },
        { value: "extend", label: "결선 실험 연장" },
        { value: "bandit", label: "Multi-armed Bandit", desc: "성과가 좋은 후보에 트래픽을 몰아줘요." },
        { value: "none", label: "하지 않아요" },
      ],
    },
    { name: "holdout_pct", label: "[홀드아웃] 비율", help: "홀드아웃을 고른 경우에만 써요(0.5~20).", type: "number", min: 0.5, max: 20, step: 0.5, unit: "%" },
    { name: "holdout_months", label: "[홀드아웃] 기간", type: "number", min: 1, max: 12, step: 1, unit: "개월" },
    { name: "rationale", label: "근거", help: "지금까지의 결과와 한계를 바탕으로 적어주세요.", type: "textarea" },
  ],
};
