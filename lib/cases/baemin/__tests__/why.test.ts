/**
 * "왜 이 선택지?" 한 줄과 Phase 다리 문장 검사 (설계 문서 docs/superpowers/specs/2026-10-09-baemin-choice-rationale-design.md 6장).
 * 원문 일치(출처 조각) 테스트는 두지 않는다(설계 0장 3). 문장이 덱·위키에서 나왔는지는 리뷰에서 확인한다.
 */
import { describe, expect, it } from "vitest";
import type { FieldMeta, Why } from "@/lib/cases/types";
import { ALL_FLAGS, FLAG_LABELS } from "@/lib/sim/core/flags";
import { THEORY, type TheoryKey } from "@/lib/theory";
import { decisions } from "../decisions";
import { formMeta } from "../formMeta";
import { METRIC_KEYS } from "../schema";
import { baeminClient, phases } from "../ui";
import {
  ACTION_WHY, DECISION_WHY, FIELD_WHY, FIELD_WHY_BY_PHASE, METRIC_WHY, OPTION_WHY, PHASE_INTRO, RATIONALE_WHY, STEP_INTRO, WHY_NONE,
} from "../why";

const METRIC_FIELDS = new Set(["metrics.primary", "metrics.secondary", "metrics.guardrails"]);
const CHOICE_TYPES = new Set<FieldMeta["type"]>(["select", "multiselect"]);
const allFields = (): { phase: string; f: FieldMeta }[] => Object.entries(formMeta).flatMap(([phase, list]) => list.map((f) => ({ phase, f })));

/** 검사할 문장 하나. label 은 그 문장이 붙는 입력란의 label(개념 이름 허용 판단용). */
type Line = { where: string; why: Why; label?: string };
const labelOf = (name: string) => allFields().find(({ f }) => f.name === name)?.f.label;

/** why.ts 의 모든 문장. exempt=true 는 스포일러 검사 면제(s7 다리 문장). */
function allLines(): (Line & { exempt?: boolean })[] {
  const out: (Line & { exempt?: boolean })[] = [];
  for (const [name, why] of Object.entries(FIELD_WHY)) out.push({ where: `field:${name}`, why, label: labelOf(name) });
  for (const [phase, m] of Object.entries(FIELD_WHY_BY_PHASE)) for (const [name, why] of Object.entries(m ?? {})) out.push({ where: `field:${phase}:${name}`, why, label: labelOf(name) });
  for (const [name, m] of Object.entries(OPTION_WHY)) for (const [v, why] of Object.entries(m)) out.push({ where: `option:${name}:${v}`, why, label: labelOf(name) });
  for (const [k, why] of Object.entries(METRIC_WHY)) out.push({ where: `metric:${k}`, why });
  for (const [phase, m] of Object.entries(DECISION_WHY)) for (const [id, why] of Object.entries(m)) out.push({ where: `decision:${phase}:${id}`, why });
  out.push({ where: "rationale", why: RATIONALE_WHY });
  for (const [phase, m] of Object.entries(ACTION_WHY)) for (const [mode, why] of Object.entries(m)) if (why) out.push({ where: `action:${phase}:${mode}`, why });
  for (const [phase, intro] of Object.entries(PHASE_INTRO)) intro.lines.forEach((why, i) => out.push({ where: `intro:${phase}:${i + 1}`, why }));
  for (const [step, intro] of Object.entries(STEP_INTRO)) intro?.lines.forEach((why, i) => out.push({ where: `step:${step}:${i + 1}`, why, exempt: step === "s7_lab" }));
  return out;
}

describe("커버리지", () => {
  it("formMeta 의 모든 입력란(진단, P1~P4)에 목적 한 줄이 있다", () => {
    for (const { phase, f } of allFields()) {
      const why = (FIELD_WHY_BY_PHASE as Partial<Record<string, Record<string, Why>>>)[phase]?.[f.name] ?? FIELD_WHY[f.name];
      expect(why, `${phase}:${f.name}`).toBeDefined();
    }
  });

  it("select·multiselect 보기는 문장이 있거나 WHY_NONE 에 있고, 둘 다는 아니다", () => {
    for (const { phase, f } of allFields()) {
      if (!CHOICE_TYPES.has(f.type)) continue;
      for (const o of f.options ?? []) {
        const key = `option:${f.name}:${String(o.value)}`;
        const why = METRIC_FIELDS.has(f.name) ? METRIC_WHY[o.value as keyof typeof METRIC_WHY] : OPTION_WHY[f.name]?.[String(o.value)];
        expect(!!why !== WHY_NONE.has(key), `${phase}:${key}`).toBe(true);
      }
    }
  });

  it("boolean 입력란은 예·아니요 문장이 모두 있다", () => {
    const bools = allFields().filter(({ f }) => f.type === "boolean");
    expect(bools.length).toBeGreaterThan(0);
    for (const { f } of bools) {
      expect(OPTION_WHY[f.name]?.true, `${f.name}:true`).toBeDefined();
      expect(OPTION_WHY[f.name]?.false, `${f.name}:false`).toBeDefined();
    }
  });

  it("WHY_NONE 은 사용자가 정한 4개(진단 보기 3, pooled)와 정확히 같다", () => {
    expect([...WHY_NONE].sort()).toEqual(["option:analysis_mode:pooled", "option:causal_claim:no", "option:causal_claim:unsure", "option:causal_claim:yes"]);
  });

  it("지표 11종 모두에 한 줄이 있다", () => {
    expect(Object.keys(METRIC_WHY).sort()).toEqual([...METRIC_KEYS].sort());
  });

  it("결정 보기 12개 모두에 한 줄이 있고 '결정한 근거' 목적 한 줄이 있다", () => {
    let n = 0;
    for (const [phase, def] of Object.entries(decisions)) for (const o of def.options) {
      n++;
      expect((DECISION_WHY as Record<string, Record<string, Why>>)[phase]?.[o.id], `${phase}:${o.id}`).toBeDefined();
    }
    expect(n).toBe(12);
    expect(RATIONALE_WHY.text.length).toBeGreaterThan(0);
  });

  it("모든 Phase 에 다리 문장이 있고, run 은 aa·main, readout 은 main 버튼 줄이 있다", () => {
    for (const p of phases) {
      expect(PHASE_INTRO[p.key]?.lines.length, p.key).toBeGreaterThan(0);
      const a = ACTION_WHY[p.key];
      if (p.kind === "run") { expect(a?.aa, `${p.key}:aa`).toBeDefined(); expect(a?.main, `${p.key}:main`).toBeDefined(); }
      else if (p.kind === "readout") { expect(a?.main, `${p.key}:main`).toBeDefined(); expect(a?.aa, `${p.key}:aa`).toBeUndefined(); }
      else expect(a, p.key).toBeUndefined();
    }
  });

  it("STEP_INTRO 에 s7_lab·s8_share 다리 문장이 있다", () => {
    expect(Object.keys(STEP_INTRO).sort()).toEqual(["s7_lab", "s8_share"]);
    expect(STEP_INTRO.s7_lab?.lines.length).toBeGreaterThan(0);
    expect(STEP_INTRO.s8_share?.lines.length).toBeGreaterThan(0);
  });

  it("반대 방향: why.ts 의 키는 실제 입력란·보기·결정·Phase 에 있다 (오타 방지)", () => {
    const fields = new Map(allFields().map(({ f }) => [f.name, f]));
    for (const name of Object.keys(FIELD_WHY)) expect(fields.has(name), `field:${name}`).toBe(true);
    for (const [phase, m] of Object.entries(FIELD_WHY_BY_PHASE)) {
      expect(Object.keys(formMeta), `phase:${phase}`).toContain(phase);
      for (const name of Object.keys(m ?? {})) expect(formMeta[phase].some((f) => f.name === name), `${phase}:${name}`).toBe(true);
    }
    for (const [name, m] of Object.entries(OPTION_WHY)) {
      const f = fields.get(name);
      expect(f, `option field:${name}`).toBeDefined();
      expect(METRIC_FIELDS.has(name), `metric field in OPTION_WHY:${name}`).toBe(false);
      const values = f!.type === "boolean" ? ["true", "false"] : (f!.options ?? []).map((o) => String(o.value));
      for (const v of Object.keys(m)) expect(values, `option:${name}:${v}`).toContain(v);
    }
    for (const key of WHY_NONE) {
      const [, name, v] = key.split(":");
      expect((fields.get(name)?.options ?? []).map((o) => String(o.value)), key).toContain(v);
    }
    for (const [phase, m] of Object.entries(DECISION_WHY)) {
      const ids = (decisions[phase]?.options ?? []).map((o) => o.id);
      for (const id of Object.keys(m)) expect(ids, `decision:${phase}:${id}`).toContain(id);
    }
    const keys = phases.map((p) => p.key);
    for (const k of Object.keys(PHASE_INTRO)) expect(keys, `intro:${k}`).toContain(k);
    for (const k of Object.keys(ACTION_WHY)) expect(keys, `action:${k}`).toContain(k);
  });

  it("한 줄은 90자 이하, 다리 문장은 Phase 당 3줄 이하(P1 설계만 사용자 결정으로 4줄)", () => {
    for (const l of allLines()) {
      expect(l.why.text.trim().length, l.where).toBeGreaterThan(0);
      expect(l.why.text.length, `${l.where}: ${l.why.text}`).toBeLessThanOrEqual(90);
    }
    const LIMIT_EXCEPTIONS: Record<string, number> = { p1: 4 };
    for (const [k, intro] of Object.entries(PHASE_INTRO)) expect(intro.lines.length, k).toBeLessThanOrEqual(LIMIT_EXCEPTIONS[k] ?? 3);
    for (const [k, intro] of Object.entries(STEP_INTRO)) expect(intro!.lines.length, k).toBeLessThanOrEqual(3);
  });

  it("baeminClient 에 문장이 붙어 있다(formMeta·decisions·phases·stepIntro)", () => {
    for (const [phase, list] of Object.entries(baeminClient.formMeta)) for (const f of list) {
      expect(f.why, `${phase}:${f.name}`).toBeDefined();
      for (const o of f.options ?? []) {
        const key = `option:${f.name}:${String(o.value)}`;
        expect(!!o.why !== WHY_NONE.has(key), `${phase}:${key}`).toBe(true);
      }
    }
    const trig = baeminClient.formMeta.p3.find((f) => f.name === "trigger_logging")!;
    expect(trig.options?.map((o) => [o.value, o.label, !!o.why])).toEqual([[true, "예", true], [false, "아니요", true]]);
    for (const def of Object.values(baeminClient.decisions)) {
      expect(def.rationaleWhy).toEqual(RATIONALE_WHY);
      for (const o of def.options) expect(o.why, o.id).toBeDefined();
    }
    for (const p of baeminClient.phases) expect(p.intro, p.key).toEqual(PHASE_INTRO[p.key]);
    expect(baeminClient.stepIntro).toEqual(STEP_INTRO);
  });

  it("원본 formMeta·decisions·phases 는 바꾸지 않는다(기존 desc·help 유지)", () => {
    for (const list of Object.values(formMeta)) for (const f of list) {
      expect(f.why, f.name).toBeUndefined();
      for (const o of f.options ?? []) expect(o.why, `${f.name}:${String(o.value)}`).toBeUndefined();
    }
    for (const def of Object.values(decisions)) for (const o of def.options) expect((o as { why?: Why }).why, o.id).toBeUndefined();
    for (const p of phases) expect(p.intro, p.key).toBeUndefined();
  });
});

describe("근거 표시(챕터만)", () => {
  it("모든 src 는 1~5 또는 'case' 다", () => {
    for (const l of allLines()) expect([1, 2, 3, 4, 5, "case"], l.where).toContain(l.why.src);
  });
  it("앱 문장에 출처 표기(덱·위키·슬라이드 등)가 섞이지 않는다", () => {
    const SOURCE_MARKERS = ["덱", "위키", "슬라이드", "편", "「", "」", "docs/", "§"];
    for (const l of allLines()) for (const m of SOURCE_MARKERS) expect(l.why.text.includes(m), `${l.where}: ${m}`).toBe(false);
  });
});

// ── 스포일러 ──
const REVEAL_ONLY = (Object.keys(THEORY) as TheoryKey[]).filter((k) => "revealOnly" in THEORY[k]);
const TRAP_KEYS: TheoryKey[] = ["interference", "interference_fix", "peeking", "srm", "simpson"];
const TRAP_NAMES = ["SRM", "Sample Ratio", "표본 비율", "심슨", "Simpson", "생존", "Survivorship", "선택 편향", "Selection Bias", "신규성", "신기효과", "Novelty", "Primacy", "초두", "이월", "Peeking", "피킹", "위양성", "ITT", "트리거 분석"];
const HINT_WORDS = ["정답", "오답", "틀린", "틀려", "잘못", "올바른", "옳은", "권장", "피하세요", "하면 안", "좋은 선택", "나쁜 선택"];
/** 사례 문서 §2(숨긴 효과)·§3-2(반영 규칙)의 숫자. §3-1b 협의 MDE(1.5 등)와 §1 기준값은 공개 값이라 넣지 않는다. */
const HIDDEN_NUMBERS = ["0.025", "−0.025", "-0.025", "0.036", "0.024", "0.018", "0.246", "0.066", "0.0002", "0.023", "0.04", "0.50", "0.55", "0.30", "29,400", "9,190", "24%", "4.1%", "6.1%", "4.9%", "0.9%", "0.2%", "2.0%", "18%"];
/** §1 기준값 표기 "약 18%"(최소주문금액 근처 주문 비중)는 공개 값이라 허용한다. */
const PUBLIC_NUMBER_PHRASES = ["약 18%"];
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function spoilers(text: string, label = ""): string[] {
  const hits: string[] = [];
  for (const code of ALL_FLAGS) if (new RegExp(`\\b${code}\\b`).test(text)) hits.push(`flag:${code}`);
  for (const lab of Object.values(FLAG_LABELS)) if (text.includes(lab)) hits.push(`flagLabel:${lab}`);
  const scrubbed = PUBLIC_NUMBER_PHRASES.reduce((t, p) => t.replaceAll(p, ""), text);
  for (const n of HIDDEN_NUMBERS) if (new RegExp(`(?<![\\d.,])${esc(n)}(?!\\d)`).test(scrubbed)) hits.push(`number:${n}`);
  for (const k of REVEAL_ONLY) if (text.includes(THEORY[k].title) && !label.includes(THEORY[k].title)) hits.push(`revealOnly:${k}`);
  for (const t of TRAP_NAMES) if (text.includes(t)) hits.push(`trap:${t}`);
  for (const h of HINT_WORDS) if (text.includes(h)) hits.push(`hint:${h}`);
  return hits;
}

/** 0장 4: 학생에게 필요한 맥락이라 그대로 두는 기존 문구. 새 문구가 슬쩍 끼지 않게 정확히 이 4개로 고정한다. */
const ALLOWED_EXISTING_HINTS = [
  "desc:scope.os:all:iOS 구버전 사용자가 포함돼요.",
  "desc:coupon_ops:low:문구 노출 조건을 채우는 사용자가 적어요.",
  "desc:coupon_ops:high:노출 대상이 늘지만 쿠폰 비용이 들어요.",
  "help:rationale:다른 설명(교란)이 가능한지 적어보세요.",
] as const;

function existingTexts(): { key: string; text: string; label: string }[] {
  const out: { key: string; text: string; label: string }[] = [];
  for (const { f } of allFields()) {
    out.push({ key: `label:${f.name}:${f.label}`, text: f.label, label: f.label });
    if (f.help) out.push({ key: `help:${f.name}:${f.help}`, text: f.help, label: f.label });
    for (const o of f.options ?? []) {
      out.push({ key: `optlabel:${f.name}:${String(o.value)}:${o.label}`, text: o.label, label: f.label });
      if (o.desc) out.push({ key: `desc:${f.name}:${String(o.value)}:${o.desc}`, text: o.desc, label: f.label });
    }
  }
  return out;
}

describe("스포일러(새 문장)", () => {
  it("새 why 줄·다리 문장에 플래그·숨긴 효과 숫자·revealOnly 개념 이름·함정 이름·정오 힌트가 없다(s7 면제)", () => {
    for (const l of allLines()) {
      if (l.exempt) continue;
      expect(spoilers(l.why.text, l.label), `${l.where}: ${l.why.text}`).toEqual([]);
    }
  });
  it("검사기는 금지어를 실제로 잡는다", () => {
    expect(spoilers("SRM이 보이면")).toContain("flag:SRM");
    expect(spoilers("효과는 24%예요")).toContain("number:24%");
    expect(spoilers("대조군 기준 약 18%예요")).toEqual([]);
    expect(spoilers("기준 18%로 늘어요")).toContain("number:18%");
    expect(spoilers("이건 정답이에요")).toContain("hint:정답");
    expect(spoilers("다중검정을 보정해요")).toContain("revealOnly:multiple_testing");
    expect(spoilers("다중검정을 보정해요", "다중검정 보정")).toEqual([]);
  });
  it("Phase·스텝 다리 문장의 개념 라벨에 revealOnly·함정 개념이 없다(s7 면제)", () => {
    for (const [k, intro] of Object.entries(PHASE_INTRO)) for (const t of intro.theory ?? []) {
      expect(REVEAL_ONLY, `${k}:${t}`).not.toContain(t);
      expect(TRAP_KEYS, `${k}:${t}`).not.toContain(t);
    }
    for (const [k, intro] of Object.entries(STEP_INTRO)) {
      if (k === "s7_lab") continue;
      for (const t of intro?.theory ?? []) {
        expect(REVEAL_ONLY, `${k}:${t}`).not.toContain(t);
        expect(TRAP_KEYS, `${k}:${t}`).not.toContain(t);
      }
    }
  });
});

describe("스포일러(기존 formMeta 문구, 허용 목록)", () => {
  it("허용 목록은 정확히 4개이고, 모두 formMeta 에 그대로 남아 있다", () => {
    expect(ALLOWED_EXISTING_HINTS).toHaveLength(4);
    const keys = new Set(existingTexts().map((t) => t.key));
    for (const k of ALLOWED_EXISTING_HINTS) expect(keys.has(k), k).toBe(true);
  });
  it("허용 목록 밖의 기존 label·help·desc 에도 같은 금지어가 없다", () => {
    const allowed = new Set<string>(ALLOWED_EXISTING_HINTS);
    for (const t of existingTexts()) {
      if (allowed.has(t.key)) continue;
      expect(spoilers(t.text, t.label), t.key).toEqual([]);
    }
  });
});
