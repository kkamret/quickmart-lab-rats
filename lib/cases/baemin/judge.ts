/**
 * 결정 판정 (docs/superpowers/specs/2026-10-09-baemin-theory-logic-design.md 의 A).
 * 옵션마다 정답을 고정해 두지 않고, 조가 실제로 본 결과(Readout)를 덱 「'유의하다'에서 멈추지 말고 결정으로 닫는다」의
 * 네 갈래(중단 / 배포 / 접기 / 재실험)와 「효과 크기 × 비용 × 리스크」에 비추어 판정한다. 순수 함수이며 서버에서만 쓴다.
 */
import type { Comparison, MetricResult, Readout } from "@/lib/sim/core";
import { theoryLabel, type TheoryKey } from "@/lib/theory";
import type { Judgement, Verdict } from "../types";
import { designUnion, type Design, type MetricKey } from "./schema";

type Action = "deploy" | "followup" | "stop" | "rerun";
type State = "halt" | "deploy_clean" | "deploy_risk" | "deploy_novelty" | "small_sig" | "null_narrow" | "null_wide" | "bad";

/** Phase 별 결정 옵션이 가리키는 행동. P4 의 deploy_b / deploy_c 는 각각 B / C 그룹의 deploy 다. */
const ACTIONS: Record<string, Record<string, Action>> = {
  p1: { deploy: "deploy", no_deploy: "stop", extend_rerun: "rerun" },
  p2: { full_deploy: "deploy", no_deploy: "stop", deploy_followup: "followup" },
  p3: { deploy: "deploy", rollback: "stop", expand_rerun: "rerun" },
  p4: { deploy_b: "deploy", deploy_c: "deploy", none_learn: "stop" },
};
/** 결정 선택지에 "다시 실험"이 있는 Phase. 없으면 중단·재실험이 필요한 상황에서 "배포 안 함"이 가장 가까운 선택이다. */
const HAS_RERUN: Record<string, boolean> = { p1: true, p2: false, p3: true, p4: false };
const OPTION_ARM: Record<string, "B" | "C"> = { deploy_b: "B", deploy_c: "C" };

const LOWER_IS_BETTER = new Set<MetricKey>(["abandon", "crash", "load_time", "cs_rate"]);
const SYSTEM = new Set<MetricKey>(["crash", "load_time"]);
const BUSINESS = new Set<MetricKey>(["conv", "aov", "gmv"]);

type Row = { verdict: Verdict; tail: string };
const r = (verdict: Verdict, tail: string): Row => ({ verdict, tail });

const TABLE: Record<State, Record<Action, Row>> = {
  halt: {
    deploy: r("wrong", "그래서 이 결과로 배포하면 안 돼요."),
    followup: r("wrong", "그래서 이 결과로 배포하면 안 돼요."),
    stop: r("partial", "배포하지 않는 건 맞지만, 원인을 고쳐 다시 실험하는 편이 더 좋아요."),
    rerun: r("correct", "원인을 고쳐 다시 실험하는 게 맞아요."),
  },
  deploy_clean: {
    deploy: r("correct", "그래서 배포가 맞아요. 비용과 리스크를 확인하면서 단계적으로 출시하세요."),
    followup: r("correct", "배포하면서 Secondary·Driver 지표에서 다음 가설을 찾는 방향이 맞아요."),
    stop: r("wrong", "접을 근거가 없어요."),
    rerun: r("partial", "구간이 이미 0 바깥이라 재실험이 꼭 필요하진 않아요. 시간과 비용을 더 쓰는 선택이에요."),
  },
  deploy_risk: {
    deploy: r("partial", "배포하더라도 위 악화를 확인하고 단계적으로 출시해야 해서, 바로 전면 배포하기엔 부족해요."),
    followup: r("correct", "배포하면서 위 악화를 다음 실험의 재료로 삼는 게 맞아요."),
    stop: r("wrong", "Primary 개선까지 버리게 돼요."),
    rerun: r("partial", "악화 원인을 확인하는 재실험도 가능하지만 Primary 개선은 이미 확인됐어요."),
  },
  deploy_novelty: {
    deploy: r("partial", "분석 기간이 짧아 효과가 부풀었을 수 있어서, 바로 배포하기엔 근거가 부족해요."),
    followup: r("partial", "분석 기간이 짧아 효과가 부풀었을 수 있어서, 먼저 기간을 늘려 확인하는 편이 좋아요."),
    stop: r("wrong", "Primary 개선까지 버리게 돼요."),
    rerun: r("correct", "기간을 늘려 효과가 안정되는지 보는 게 맞아요."),
  },
  small_sig: {
    deploy: r("partial", "구현·유지 비용이 이 효과를 넘는지 확인한 근거가 필요해요."),
    followup: r("partial", "구현·유지 비용이 이 효과를 넘는지 확인한 근거가 필요해요."),
    stop: r("partial", "비용이 효과보다 크다면 접는 것도 방법이에요."),
    rerun: r("wrong", "구간이 이미 좁아서 재실험으로 알게 될 것이 적어요."),
  },
  null_narrow: {
    deploy: r("wrong", "효과가 있어도 MDE보다 작은 변화에 배포 비용을 쓰는 셈이에요."),
    followup: r("wrong", "효과가 있어도 MDE보다 작은 변화에 배포 비용을 쓰는 셈이에요."),
    stop: r("correct", "그래서 접는 게 맞아요. 이번 실험에서 배운 점을 정리해 다음 가설로 이어가세요."),
    rerun: r("partial", "구간이 이미 좁아서 재실험의 가치가 낮아요."),
  },
  null_wide: {
    deploy: r("wrong", "효과가 확인되지 않은 채 배포하는 셈이에요."),
    followup: r("wrong", "효과가 확인되지 않은 채 배포하는 셈이에요."),
    stop: r("wrong", "효과가 없다는 걸 확인한 게 아니라 아직 모르는 상태라서, 접는 건 성급해요."),
    rerun: r("correct", "그래서 표본·기간을 늘리거나 설계를 고쳐 다시 실험하는 게 맞아요."),
  },
  bad: {
    deploy: r("wrong", "Primary가 나빠졌는데 배포하는 셈이에요."),
    followup: r("wrong", "Primary가 나빠졌는데 배포하는 셈이에요."),
    stop: r("correct", "그래서 배포하지 않는 게 맞아요."),
    rerun: r("partial", "원인을 확인하는 재실험은 가능하지만 이 결과로 배포해선 안 돼요."),
  },
};

/** 선택지에 재실험이 없는 Phase 에서는 중단·재실험이 필요한 상황의 "배포 안 함"을 가장 가까운 정답으로 본다. */
function rowFor(phase: string, state: State, action: Action): Row {
  if (action === "stop" && !HAS_RERUN[phase]) {
    if (state === "halt") return r("correct", "그래서 이 결과로 배포하지 말고, 원인을 고친 뒤 다시 실험해야 해요.");
    if (state === "null_wide") return r("partial", "재실험이 필요한 상황이지만 이 단계에는 재실험 선택지가 없어서 '배포 안 함'이 가장 가까워요.");
  }
  return TABLE[state][action];
}

const cite = (...keys: TheoryKey[]) => `[근거: ${keys.map(theoryLabel).join(", ")}]`;
const pct = (x: number) => `${(x * 100).toFixed(1)}%`;
const signed = (x: number, digits: number) => `${x >= 0 ? "+" : ""}${(x * 100).toFixed(digits)}`;

type Kind = "good_big" | "good_small" | "bad" | "null_narrow" | "null_wide";

/** 한 그룹(arm)의 Primary 비교를 덱의 기준으로 분류한다. share 가 있으면 트리거 사용자 기준으로 환산한다(P3). */
function classify(m: MetricResult, c: Comparison, mde: number, share: number | null): { kind: Kind; text: string } {
  const key = m.key as MetricKey;
  const isProp = m.type === "prop";
  const scale = share && share > 0 ? 1 / share : 1;
  const effect = (isProp ? c.d : c.rel) * scale;
  const [lo0, hi0] = isProp ? c.ci : c.relCi;
  const lo = lo0 * scale;
  const hi = hi0 * scale;
  const dir = LOWER_IS_BETTER.has(key) ? -1 : 1;
  const gEff = dir * effect;
  const gLo = dir > 0 ? lo : -hi;
  const gHi = dir > 0 ? hi : -lo;
  const unit = isProp ? "%p" : "%";
  const digits = isProp ? 2 : 1;
  const scope = scale !== 1 ? "트리거 사용자 기준으로 환산한 " : "";
  const base = `Primary(${m.label})의 ${scope}차이는 ${signed(effect, digits)}${unit}, 95% 구간은 [${signed(lo, digits)}${unit}, ${signed(hi, digits)}${unit}]이고 MDE는 ${(mde * 100).toFixed(1)}${unit}예요.`;
  if (c.significant) {
    if (gEff < 0) return { kind: "bad", text: `${base} 유의하게 나빠졌어요.` };
    return gEff >= mde
      ? { kind: "good_big", text: `${base} 구간 전체가 0 바깥이고 효과가 MDE 이상이에요.` }
      : { kind: "good_small", text: `${base} 유의하지만 효과가 MDE보다 작아요.` };
  }
  if (gLo > -mde && gHi < mde) return { kind: "null_narrow", text: `${base} 구간이 0을 포함하고 ±MDE 안에 들어 있어서, 효과가 있어도 MDE보다 작아요.` };
  return { kind: "null_wide", text: `${base} 구간이 0을 포함하고 MDE보다 넓어서, 효과가 있는지 없는지 아직 알 수 없어요.` };
}

/** Primary 가 아닌 지표 중 유의하게 나빠진 시스템·비즈니스 지표 이름 */
function harms(readout: Readout, arm: string, primary: MetricKey): { system: string[]; business: string[] } {
  const system: string[] = [];
  const business: string[] = [];
  for (const m of readout.metrics) {
    const key = m.key as MetricKey;
    if (key === primary) continue;
    const c = m.comparisons.find((x) => x.arm === arm);
    if (!c || !c.significant) continue;
    const dir = LOWER_IS_BETTER.has(key) ? -1 : 1;
    if (dir * (m.type === "prop" ? c.d : c.rel) >= 0) continue;
    if (SYSTEM.has(key)) system.push(m.label);
    else if (BUSINESS.has(key)) business.push(m.label);
  }
  return { system, business };
}

/** 고객 유형별 표에서 Primary 가 반대로 유의하게 나빠진 유형 (P2 의 세그먼트 패널) */
function segmentHarm(readout: Readout, primary: MetricKey): string | null {
  const seg = readout.panels.segments as Record<string, Record<string, { d?: number; significant?: boolean }>> | undefined;
  if (!seg) return null;
  const dir = LOWER_IS_BETTER.has(primary) ? -1 : 1;
  const names: Record<string, string> = { general: "일반", first_order: "첫 주문 혜택", member: "멤버십" };
  const out: string[] = [];
  for (const [type, row] of Object.entries(seg)) {
    const cell = row?.[primary];
    if (cell?.significant && typeof cell.d === "number" && dir * cell.d < 0) out.push(names[type] ?? type);
  }
  return out.length ? `${out.join("·")} 고객에서는 Primary가 반대로 유의하게 나빠졌어요.` : null;
}

type ArmState = { arm: string; state: State; text: string };

function stateOf(phase: string, readout: Readout, design: Design, arm: string): ArmState {
  const primary = design.metrics.primary;
  const m = readout.metrics.find((x) => x.key === primary);
  const c = m?.comparisons.find((x) => x.arm === arm);
  const mde = design.mde_pp / 100;
  const h = harms(readout, arm, primary);
  const stoppedAt = readout.stoppedAt ?? design.duration_days;

  const srm = readout.flags.includes("SRM");
  if (srm || h.system.length) {
    const why = srm ? "그룹별 사용자 수가 계획한 배정 비율과 어긋나요" : `${h.system.join("·")}이(가) 유의하게 나빠졌어요`;
    return { arm, state: "halt", text: `${why}. 결과를 해석하기 전에 원인부터 찾아 고쳐야 해요. ${srm ? cite("srm", "decision") : cite("metric_layers", "decision")}` };
  }
  if (!m || !c) return { arm, state: "null_wide", text: "Primary 지표를 비교할 데이터가 없어서 효과를 알 수 없어요." };

  let share: number | null = null;
  if (phase === "p3") {
    const trig = readout.panels.trigger as { biased?: { exposed?: { n?: number } } } | undefined;
    const exposed = trig?.biased?.exposed?.n ?? 0;
    const bUsers = readout.srm?.counts?.[1] ?? 0;
    share = exposed > 0 && bUsers > 0 ? exposed / bUsers : null;
  }
  const p = classify(m, c, mde, share);
  const dilution = share ? ` 문구를 보는 사용자가 B의 ${pct(share)}뿐이라 전체 지표는 효과가 희석돼요. ${cite("trigger")}` : "";
  const risks: string[] = [];
  if (h.business.length) risks.push(`${h.business.join("·")}이(가) 유의하게 나빠졌어요.`);
  const seg = phase === "p2" ? segmentHarm(readout, primary) : null;
  if (seg) risks.push(seg);
  const riskText = risks.length ? ` 다만 ${risks.join(" ")}` : "";

  switch (p.kind) {
    case "bad":
      return { arm, state: "bad", text: `${p.text}${riskText} ${cite("decision")}` };
    case "good_big":
      if (risks.length) return { arm, state: "deploy_risk", text: `${p.text}${riskText} ${cite("decision")}` };
      if (stoppedAt <= 7) {
        return { arm, state: "deploy_novelty", text: `${p.text} 하지만 분석 구간이 ${stoppedAt}일로 첫 주에 그쳐서 신기효과가 섞였을 수 있어요. ${cite("duration", "novelty")}` };
      }
      return { arm, state: "deploy_clean", text: `${p.text} 가드레일에도 이상이 없어요. ${cite("decision")}` };
    case "good_small":
      return { arm, state: "small_sig", text: `${p.text}${riskText} ${cite("decision", "mde")}` };
    case "null_narrow":
      return { arm, state: "null_narrow", text: `${p.text}${dilution}${riskText} ${cite("decision")}` };
    default:
      return { arm, state: "null_wide", text: `${p.text}${dilution}${riskText} ${cite("decision", "inference")}` };
  }
}

const SEVERITY: Record<Verdict, number> = { correct: 0, partial: 1, wrong: 2 };

/** 결정 옵션을 조의 실제 결과로 판정한다. 알 수 없는 Phase·옵션이거나 설계를 읽을 수 없으면 null. */
export function judgeBaemin(phase: string, optionId: string, run: { design: Record<string, unknown>; result: Readout }): Judgement | null {
  const action = ACTIONS[phase]?.[optionId];
  if (!action) return null;
  const parsed = designUnion.safeParse(run.design);
  if (!parsed.success) return null;
  const design = parsed.data;
  const readout = run.result;

  if (phase === "p4") {
    const arms = ["B", "C"].filter((a) => readout.metrics.some((m) => m.comparisons.some((c) => c.arm === a)));
    const states = arms.map((a) => stateOf(phase, readout, design, a));
    if (optionId === "none_learn") {
      if (states.length === 0) return null;
      // 둘 다 배포하지 않는 선택은 가장 나쁜 그룹 기준으로 판정한다(한 그룹이라도 배포할 만하면 접는 건 틀린다).
      let worst = states[0];
      for (const s of states.slice(1)) {
        if (SEVERITY[rowFor(phase, s.state, "stop").verdict] > SEVERITY[rowFor(phase, worst.state, "stop").verdict]) worst = s;
      }
      const row = rowFor(phase, worst.state, "stop");
      return { verdict: row.verdict, reason: `${states.map((s) => `${s.arm} 그룹: ${s.text}`).join(" ")} ${row.tail}` };
    }
    const arm = OPTION_ARM[optionId];
    const s = states.find((x) => x.arm === arm);
    if (!s) return { verdict: "wrong", reason: `${arm} 그룹을 실험에 넣지 않아서 배포를 판단할 근거가 없어요.` };
    const row = rowFor(phase, s.state, action);
    return { verdict: row.verdict, reason: `${arm} 그룹: ${s.text} ${row.tail}` };
  }

  const s = stateOf(phase, readout, design, "B");
  const row = rowFor(phase, s.state, action);
  return { verdict: row.verdict, reason: `${s.text} ${row.tail}` };
}
