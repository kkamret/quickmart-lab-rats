import type { FieldMeta, FieldOption } from "../types";

const DEF_OPTIONS: FieldOption[] = [
  { value: "started", label: "작성 시작", desc: "후기 쓰기 버튼을 누른 사용자" },
  { value: "submitted", label: "제출 완료", desc: "기한 없이 후기를 제출한 사용자" },
  { value: "submitted_72h", label: "72시간 내 제출 완료", desc: "후기 화면 진입 후 72시간 안에 제출한 사용자" },
];
const ALPHA: FieldOption[] = [{ value: 0.01, label: "1%" }, { value: 0.05, label: "5%" }, { value: 0.1, label: "10%" }];
const POWER: FieldOption[] = [{ value: 0.7, label: "70%" }, { value: 0.8, label: "80%" }, { value: 0.9, label: "90%" }];
const STOPPING: FieldOption[] = [
  { value: "fixed", label: "기간이 끝날 때 한 번만 확인" },
  { value: "peek_stop", label: "매일 확인하다 유의하면 종료" },
  { value: "sequential", label: "순차 검정(경계를 넘으면 종료)" },
];
const TIMING: FieldOption[] = [
  { value: "install_all", label: "앱 설치 시 전원 배정", desc: "후기를 받지 않을 사용자까지 모두 배정해요." },
  { value: "review_received", label: "후기를 받는 시점에 배정", desc: "후기를 받은 사용자만 배정해요(푸시를 열지 않은 사람 포함)." },
  { value: "review_screen_open", label: "후기 화면에 진입하는 시점에 배정", desc: "새 화면을 실제로 볼 수 있는 사용자만 배정해요." },
];
const POPULATION: FieldOption[] = [
  { value: "all_assigned", label: "배정된 사용자 전체" },
  { value: "review_received", label: "후기를 받은 사용자" },
  { value: "review_screen_open", label: "후기 화면에 진입한 사용자", desc: "대조군에서도 \"화면에 진입했을\" 사람을 같은 기준으로 셀 수 있어야 해요." },
];

export const formMeta: Record<string, FieldMeta[]> = {
  diagnose: [
    { name: "background", label: "배경", help: "왜 이 실험을 하나요?", type: "textarea" },
    { name: "problem", label: "문제", help: "지금 무엇이 문제인가요?", type: "textarea" },
    { name: "hypothesis.action", label: "대상과 Treatment: 누구에게 무엇을 적용하나요?", type: "textarea" },
    { name: "hypothesis.behavior", label: "이유: 그래서 사용자 행동이 어떻게 달라지나요?", type: "textarea" },
    { name: "hypothesis.impact", label: "Metric·방향·변화 크기: 어떤 지표가 얼마나 움직이나요?", type: "textarea" },
    { name: "primary_metric_definition", label: "Primary 지표(답례 후기 작성률)의 정의", help: "무엇을 '작성했다'고 셀까요? 측정 시점도 정해야 해요.", type: "select", options: DEF_OPTIONS },
    { name: "success_criteria", label: "성공 기준", help: "결과를 보기 전에 숫자로 정해요.", type: "textarea" },
    { name: "risks", label: "리스크", type: "textarea" },
    { name: "owner", label: "담당자", type: "text" },
  ],
  p1: [
    { name: "assignment_timing", label: "배정 시점", help: "언제 사용자를 대조군/실험군에 나눌까요?", type: "select", options: TIMING },
    { name: "analysis_population", label: "분석 모집단", help: "누구를 대상으로 작성률을 계산할까요? 배정한 범위보다 넓게 고르면 시뮬레이션이 실행되지 않아요.", type: "select", options: POPULATION },
    {
      name: "data_source", label: "데이터 소스", type: "select",
      options: [
        { value: "client_events", label: "클라이언트 이벤트(SDK)", desc: "앱이 보낸 이벤트로 집계해요." },
        { value: "server_db", label: "서버 DB", desc: "서버에 저장된 후기 기록으로 집계해요." },
      ],
    },
    { name: "metric_definition", label: "Primary 지표 정의", help: "실험 전체가 좋은 변화인지 보는 OEC와 가까운 지표를 고르면 좋아요.", type: "select", options: DEF_OPTIONS },
    {
      name: "guardrails", label: "Guardrail 지표", help: "나빠지면 안 되는 지표", type: "multiselect",
      options: [
        { value: "short_review_rate", label: "짧은 후기 비율", desc: "10자 미만 후기가 제출된 후기 중 차지하는 비율" },
        { value: "uninstall_rate", label: "앱 삭제율" },
        { value: "report_rate", label: "신고율" },
      ],
    },
    { name: "run_aa_first", label: "본 실험 전에 A/A 테스트를 먼저 할까요?", help: "두 그룹에 같은 화면을 보여줘서 플랫폼이 믿을 만한지 확인해요.", type: "boolean" },
    { name: "aa_days", label: "A/A 기간", help: "1~14일. A/A 를 먼저 하는 경우에만 써요.", type: "number", min: 1, max: 14, step: 1, unit: "일" },
    { name: "alpha", label: "유의수준(α)", help: "엄격하게(작게) 잡을수록 필요한 표본과 실험 기간이 늘어요.", type: "select", options: ALPHA },
    { name: "power", label: "검정력", help: "높게 잡을수록 실제 효과를 놓칠 가능성이 줄지만 표본과 기간이 늘어요.", type: "select", options: POWER },
    { name: "mde_pp", label: "최소 검출 효과(MDE)", help: "분석하는 작성률의 절대 %p. 통계가 아니라 비즈니스가 정해요. 도입할 가치가 있는 최소 효과를 기준으로 잡아요.", type: "number", min: 0.01, step: 0.1, unit: "%p" },
    { name: "duration_days", label: "실험 기간", help: "7일 이상", type: "number", min: 7, max: 28, step: 1, unit: "일" },
    { name: "stopping", label: "중간 확인 규칙", type: "select", options: STOPPING },
  ],
  p2: [
    {
      name: "assignment_key", label: "배정 키", help: "사용자를 무엇으로 구분해서 그룹에 배정할까요?", type: "select",
      options: [
        { value: "user_id_hash", label: "내부 사용자 ID 해싱" },
        { value: "device_id", label: "기기 ID" },
        { value: "instance_id", label: "앱 인스턴스 ID" },
      ],
    },
    {
      name: "salt", label: "해시 salt", help: "해싱할 때 섞는 값이에요.", type: "select",
      options: [
        { value: "new_per_experiment", label: "실험마다 새 salt" },
        { value: "reuse_previous", label: "지난 거래후기 실험과 같은 salt 재사용" },
      ],
    },
    {
      name: "new_user_policy", label: "신규 사용자 처리", type: "select",
      options: [
        { value: "assign_on_first_launch", label: "첫 실행 시 서버에서 즉시 배정" },
        { value: "exclude", label: "실험에서 제외" },
      ],
    },
    {
      name: "logging", label: "로깅 방식", type: "select",
      options: [{ value: "server_events", label: "서버 이벤트(DB)" }, { value: "client_events", label: "클라이언트 이벤트(SDK)" }],
    },
    { name: "rerun_aa", label: "재실험 전에 A/A 로 새 플랫폼을 다시 검증할까요?", type: "boolean" },
  ],
  p3: [
    {
      name: "randomization_unit", label: "실험 단위 (Randomization Unit)", type: "select",
      options: [
        { value: "user", label: "사용자", desc: "같은 동네 사람들이 서로 다른 그룹에 섞여요." },
        { value: "neighborhood", label: "동네(클러스터)", desc: "동네 전체를 한 그룹으로 묶어요. 6,500개 동네가 단위예요. 서로 영향을 주는 사람들을 한 덩어리로 묶어 배정하는 방식(Cluster Randomization)이에요." },
      ],
    },
    {
      name: "primary", label: "Primary 지표", help: "실험 전체가 좋은 변화인지 보는 OEC와 가까운 지표를 고르면 좋아요.", type: "select",
      options: [
        { value: "listing_creation_rate", label: "게시글 작성률", desc: "검색 사용자 중 7일 내 판매글을 작성 완료한 비율" },
        { value: "sell_through_7d", label: "신규 게시글 7일 내 판매완료율", desc: "새로 올라온 게시글이 7일 안에 판매완료된 비율(시장 지표)" },
      ],
    },
    {
      name: "guardrails", label: "Guardrail 지표", type: "multiselect",
      options: [{ value: "search_to_chat", label: "검색 → 채팅 시작 전환율" }, { value: "search_retry", label: "검색 재시도율" }],
    },
    {
      name: "analysis_se", label: "표준오차 계산 방식", help: "배정 단위와 분석 단위가 다를 때 신뢰구간을 어떻게 계산하나요?", type: "select",
      options: [
        { value: "naive", label: "사용자(관측) 단위로 독립이라고 가정" },
        { value: "cluster_robust", label: "클러스터 강건 SE", desc: "같은 동네 안의 상관을 반영해요." },
      ],
    },
    { name: "duration_days", label: "실험 기간", help: "7~42일", type: "number", min: 7, max: 42, step: 1, unit: "일" },
    { name: "alpha", label: "유의수준(α)", help: "엄격하게(작게) 잡을수록 필요한 표본과 실험 기간이 늘어요.", type: "select", options: ALPHA },
    { name: "power", label: "검정력", help: "높게 잡을수록 실제 효과를 놓칠 가능성이 줄지만 표본과 기간이 늘어요.", type: "select", options: POWER },
    { name: "mde_pct", label: "최소 검출 효과(MDE)", help: "Primary 지표의 상대 %. 통계가 아니라 비즈니스가 정해요. 도입할 가치가 있는 최소 효과를 기준으로 잡아요.", type: "number", min: 0.1, step: 0.1, unit: "%" },
    { name: "qualitative_weight", label: "정성 의견을 결정에 어떻게 반영할까요?", help: "결과 화면의 사용자 의견을 어떻게 다룰지 미리 적어요.", type: "textarea" },
  ],
};
