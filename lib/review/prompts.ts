import { createHash } from "node:crypto";
import { ALL_FLAGS, FLAG_LABELS, type Flag } from "../sim/core/flags";
import type { Readout } from "../sim/core/readout";
import type { ClassReview, ShareReview, TeamReview } from "./types";

/** 모델에 넘기는 시뮬레이션 요약. 지표별 메인 비교만 담아 토큰을 아낀다. */
export type SimSummary = {
  phase: string;
  metrics: { key: string; label: string; role: string; comparisons: { arm: string; d: number; ci: [number, number]; p: number; significant: boolean }[] }[];
  srmP: number | null;
  achievedPower: number | null;
  flags: Flag[];
};

export function summarizeSim(r: Readout): SimSummary {
  return {
    phase: r.phase,
    metrics: r.metrics.map((m) => ({
      key: m.key, label: m.label, role: m.role,
      comparisons: m.comparisons.map((c) => ({ arm: c.arm, d: c.d, ci: c.ci, p: c.p, significant: c.significant })),
    })),
    srmP: r.srm?.p ?? null,
    achievedPower: r.achievedPower ?? null,
    flags: r.flags ?? [],
  };
}

export type TeamReviewInput = {
  case: string; step: string; rubric: string;
  submission: Record<string, unknown>;
  sim: SimSummary | null;
  revealed: boolean;
  /** revealed=true 일 때만: 원문 비교 해설 */
  original?: string;
};

export type ClassReviewInput = {
  step: string;
  teams: { team: string; case: string; submission: Record<string, unknown>; sim: SimSummary | null }[];
  rubrics: Record<string, string>;
};

export type ShareReviewInput = {
  step: string;
  teams: { team: string; case: string; memo: { learned: string; lesson: string } | null; decisions: string[]; flags: Flag[] }[];
};

export const inputHash = (v: unknown) => createHash("sha256").update(JSON.stringify(v)).digest("hex");

const COMMON = "수치는 입력(sim)에 있는 것만 인용하고 지어내지 마세요. 원문 문장을 길게 인용하지 마세요. 루브릭과 달라도 논리가 타당하면 인정하세요. 모든 문장은 한국어 해요체로 쓰세요. 반드시 JSON 객체 하나만 출력하세요. 용어는 이론 수업과 같게 쓰세요: Primary 지표, Secondary·Driver 지표, Guardrail 지표, 실험 단위(Randomization Unit), 비열등성 검정, 트리거 분석.";

export function teamPrompt(input: TeamReviewInput) {
  const system = [
    "당신은 A/B 테스트 실습 수업의 조교입니다. 조가 제출한 설계·결정을 루브릭에 비추어 피드백합니다.",
    "입력의 sim.flags 는 조가 스스로 발견해야 할 함정입니다. 플래그 이름이나 정답을 직접 말하지 말고, 스스로 떠올리게 하는 질문(nudge_questions)으로 유도하세요.",
    input.revealed ? "revealed=true: 입력의 original(원문 비교 해설)과 비교해 vs_original 에 원문과의 차이를 간단히 쓰세요. 이때는 함정 이름을 직접 말해도 됩니다." : "revealed=false: vs_original 은 반드시 빈 문자열(\"\")로 두세요.",
    COMMON,
    '출력 형식: {"score": 0-100 정수, "strengths": string[], "issues": string[], "nudge_questions": string[], "vs_original": string}',
  ].join("\n");
  return { system, user: JSON.stringify(input) };
}

export function classPrompt(input: ClassReviewInput) {
  const system = [
    "당신은 A/B 테스트 실습 수업의 강사 보조입니다. 여러 사례가 섞여 있으므로 사례가 아니라 '개념' 기준으로 조들을 가로질러 비교합니다.",
    "강사용이므로 sim.flags 를 그대로 활용해도 됩니다. found_by 는 함정을 발견·언급한 조, missed_by 는 놓친 조입니다.",
    COMMON,
    '출력 형식: {"summary": string, "concept_board": [{"concept","found_by":[],"missed_by":[],"note"}], "team_cards": [{"team","case","score","one_liner","trap_status":{"<FLAG>":"found|missed|n/a"}}], "cross_case_insight": string, "discussion_questions": string[]}',
  ].join("\n");
  return { system, user: JSON.stringify(input) };
}

/** 조에게 보여줄 수 있는, 플래그 이름을 말하지 않는 유도 질문 (mock 과 보강용) */
export const FLAG_NUDGES: Partial<Record<Flag, string>> = {
  SRM: "두 그룹의 사용자 수 비율이 설계한 대로 나왔나요? 어긋났다면 어디서 빠졌을까요?",
  UNIT_MISMATCH: "무작위로 나눈 단위와 숫자를 세는 단위가 같은가요?",
  SHORT_DURATION: "요일 패턴이나 처음 보는 화면에 대한 호기심이 결과에 섞이지 않았을까요?",
  UNDERPOWERED: "지금 표본으로 이 정도 크기의 차이를 잡아낼 수 있었을까요?",
  PEEKED: "중간에 결과를 여러 번 확인했다면, 우연히 유의해질 확률은 어떻게 달라질까요?",
  SIMPSON_RISK: "전체 평균과 그룹별 결과가 같은 방향인가요? 그룹 구성이 달라지진 않았나요?",
  MULTIPLE_TESTING: "지표를 여러 개 볼수록 우연히 유의한 것이 하나쯤 나올 확률은 어떻게 될까요?",
  SELECTION_BIAS: "비교하는 두 집단이 처음부터 같은 조건의 사람들이었나요?",
  RATIO_COMPOSITION: "비율이 바뀐 게 분자가 변해서인가요, 분모의 구성이 변해서인가요?",
  NAIVE_SE: "같은 사용자의 여러 관측을 독립이라고 가정해도 될까요?",
  NOVELTY: "처음 본 사용자의 반응과 익숙해진 뒤의 반응이 같을까요?",
  CONTAMINATION: "두 그룹이 서로 영향을 주고받을 수는 없었을까요?",
  STAKEHOLDER_EVENT: "실험을 시작하기 전에 영향을 받는 담당자들과 목적·Guardrail·리스크를 함께 이야기했나요?",
  GOODHART: "이 지표를 올리는 것이 정말 우리가 원하던 결과와 같은 방향일까요?",
};

export function sharePrompt(input: ShareReviewInput) {
  const system = [
    "당신은 A/B 테스트 실습 수업의 강사 보조입니다. 마지막 시간의 직소 공유를 위해 조마다 2분 브리핑 초안을 만듭니다. 다른 사례를 고른 조들이 듣고 배울 수 있어야 합니다.",
    "story_in_3_lines 는 이 조의 실험을 3줄(문제, 선택한 설계와 결과, 결정)로, traps_we_hit 는 이 조가 마주친(또는 놓친) 함정을 쉬운 말로, one_lesson_for_other_teams 는 다른 조가 가져갈 한 가지 교훈입니다.",
    "입력의 flags 는 시뮬레이션이 심어 둔 함정입니다. 조의 메모(memo)와 결정(decisions)을 보고 어떤 함정을 마주쳤는지 서술하세요. memo 가 null 이면 결정만으로 쓰세요.",
    COMMON,
    '출력 형식: {"briefs": [{"team": string, "case": string, "story_in_3_lines": string[], "traps_we_hit": string[], "one_lesson_for_other_teams": string}]} (입력의 teams 순서, 팀마다 하나)',
  ].join("\n");
  return { system, user: JSON.stringify(input) };
}

export function mockShareReview(input: ShareReviewInput): ShareReview {
  return {
    briefs: input.teams.map((t) => ({
      team: t.team,
      case: t.case,
      story_in_3_lines: [
        "AI 키가 연결되지 않아 샘플 브리핑이에요.",
        t.decisions[0] ?? "아직 제출한 결정이 없어요.",
        t.memo?.learned ?? "결정 메모를 아직 쓰지 않았어요.",
      ],
      traps_we_hit: t.flags.map((f) => FLAG_LABELS[f]),
      one_lesson_for_other_teams: t.memo?.lesson ?? "샘플: 실제 AI 브리핑에서는 조의 메모를 바탕으로 교훈을 정리해요.",
    })),
  };
}

export function mockTeamReview(input: TeamReviewInput): TeamReview {
  const flags = input.sim?.flags ?? [];
  const nudges = flags.map((f) => FLAG_NUDGES[f]).filter((x): x is string => !!x);
  return {
    score: Math.max(30, 80 - flags.length * 10),
    strengths: ["제출한 설계가 한 가지 가설에 집중되어 있어요. (샘플 피드백)"],
    issues: flags.length ? ["결과를 해석하기 전에 데이터가 믿을 만한지 한 번 더 점검해 보세요. (샘플 피드백)"] : [],
    nudge_questions: nudges.length ? nudges.slice(0, 3) : ["이 결과가 틀렸다면 가장 먼저 의심할 부분은 어디일까요?"],
    vs_original: "",
  };
}

export function mockClassReview(input: ClassReviewInput): ClassReview {
  const byFlag = new Map<Flag, string[]>();
  for (const t of input.teams) for (const f of t.sim?.flags ?? []) byFlag.set(f, [...(byFlag.get(f) ?? []), t.team]);
  return {
    summary: `AI 키가 연결되지 않아 샘플 분석을 보여드려요. ${input.teams.length}개 조의 시뮬레이션 플래그만 집계했어요.`,
    concept_board: [...byFlag.entries()].map(([f, teams]) => ({
      concept: FLAG_LABELS[f], found_by: [], missed_by: teams, note: "샘플: 해당 함정이 결과에 반영된 조예요. 조의 언급 여부는 실제 AI 분석에서 판단해요.",
    })),
    team_cards: input.teams.map((t) => ({
      team: t.team, case: t.case, score: Math.max(30, 80 - (t.sim?.flags.length ?? 0) * 10),
      one_liner: t.sim ? "시뮬레이션 결과가 있어요. (샘플)" : "아직 시뮬레이션을 돌리지 않았어요. (샘플)",
      trap_status: Object.fromEntries((t.sim?.flags ?? []).map((f) => [f, "missed" as const])),
    })),
    cross_case_insight: "샘플: 실제 AI 분석에서는 사례가 달라도 같은 개념끼리 묶어서 보여줘요.",
    discussion_questions: ["가장 의심스러웠던 숫자는 무엇이었고 왜 그랬나요?"],
  };
}

const FLAG_TOKEN = new RegExp(String.raw`\b(${ALL_FLAGS.join("|")})\b`);
const LABELS = Object.values(FLAG_LABELS);

/** 조에게 내려가는 문장에 플래그 코드·이름이 새면 해당 문장을 뺀다(규칙 3의 마지막 방어선). */
export const leaksFlag = (s: string) => FLAG_TOKEN.test(s) || LABELS.some((l) => s.includes(l));

/** 정답 공개 전에는 직소 브리핑에서도 함정 이름이 든 문장을 뺀다 */
export function scrubShareReview(r: ShareReview): ShareReview {
  const ok = (xs: string[]) => xs.filter((x) => !leaksFlag(x));
  return {
    briefs: r.briefs.map((b) => ({
      ...b,
      story_in_3_lines: ok(b.story_in_3_lines),
      traps_we_hit: ok(b.traps_we_hit),
      one_lesson_for_other_teams: leaksFlag(b.one_lesson_for_other_teams) ? "" : b.one_lesson_for_other_teams,
    })),
  };
}

export function scrubTeamReview(r: TeamReview): TeamReview {
  const ok = (xs: string[]) => xs.filter((x) => !leaksFlag(x));
  return { ...r, strengths: ok(r.strengths), issues: ok(r.issues), nudge_questions: ok(r.nudge_questions), vs_original: leaksFlag(r.vs_original) ? "" : r.vs_original };
}
