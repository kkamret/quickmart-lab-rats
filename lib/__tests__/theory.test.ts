import { describe, expect, it } from "vitest";
import { CASE_BADGE_TITLE, FIELD_THEORY, NEUTRAL_BADGE_TITLE, STEP_THEORY, THEORY, TITLED_STEPS, introTheoryLabel, theoryBadge, theoryChapterOnly, theoryLabel, theoryNote, whyBadge, whyBadgeTitle, type TheoryKey } from "../theory";
import { STEP_KEYS } from "../steps";
import { getClientCase } from "../cases/client-registry";
import { CASE_KEYS } from "../cases";

describe("이론 개념 표", () => {
  it("모든 항목에 챕터(1~5)와 이름이 있다", () => {
    for (const [k, e] of Object.entries(THEORY)) {
      expect([1, 2, 3, 4, 5], k).toContain(e.chapter);
      expect(e.title.length, k).toBeGreaterThan(0);
    }
  });
  it("배지는 챕터만 보여 주고 개념 이름은 담지 않는다", () => {
    expect(theoryBadge("peeking")).toBe("Ch3");
    expect(theoryBadge("metric_layers")).toBe("Ch2");
  });
  it("라벨은 챕터와 개념 이름을 함께 보여 준다", () => {
    expect(theoryLabel("hypothesis")).toBe("Ch2 · 가설 문장 구조");
    expect(theoryLabel("metric_layers")).toBe("Ch2 · 지표 층");
  });
  it("키 타입이 표와 일치한다", () => {
    const k: TheoryKey = "srm";
    expect(THEORY[k].chapter).toBe(4);
  });
});

describe("최종 덱(73장)과 챕터·이름 동기화", () => {
  it("인터리빙은 Ch5 산업 사례에만 나온다", () => {
    expect(THEORY.interleaving.chapter).toBe(5);
    expect(theoryNote("interleaving")).toBeDefined();
  });
  it("무작위 배정은 Ch2 '무작위 배정 방식 설계'와 이름을 맞춘다(SUTVA는 Ch4 간섭)", () => {
    expect(theoryLabel("randomization")).toBe("Ch2 · 무작위 배정 방식");
    expect(THEORY.randomization.title).not.toContain("SUTVA");
  });
  it("트위먼의 법칙은 Ch3 개념이고 정답 공개 뒤에만 보인다", () => {
    expect(theoryLabel("twyman")).toBe("Ch3 · 트위먼의 법칙");
    expect("revealOnly" in THEORY.twyman).toBe(true);
    expect(theoryNote("twyman")).toBe("흥미롭거나 이상할 만큼 좋은 숫자는 대개 틀렸으니, 기뻐하기 전에 데이터부터 확인해요.");
  });
  it("멀티암드 밴딧은 덱·위키 근거가 없어 이론 개념이 아니라 넷플릭스 이론 밖 개념이다", () => {
    expect("bandit" in THEORY).toBe(false);
    const m = getClientCase("netflix")!.meta;
    expect(m.theory as string[]).not.toContain("bandit");
    expect(m.outsideTheory).toContain("멀티암드 밴딧");
  });
  it("당근은 트위먼의 법칙을 이론 개념으로 연결하고 이론 밖 목록에서 뺀다", () => {
    const m = getClientCase("daangn")!.meta;
    expect(m.theory).toContain("twyman");
    expect(m.outsideTheory).not.toContain("트위먼의 법칙");
  });
});

describe("이론 연결 매핑", () => {
  it("FIELD_THEORY·STEP_THEORY 의 값은 모두 개념 표에 있다", () => {
    for (const [f, k] of Object.entries(FIELD_THEORY)) expect(THEORY[k], f).toBeDefined();
    for (const [s, ks] of Object.entries(STEP_THEORY)) {
      expect(STEP_KEYS as readonly string[], s).toContain(s);
      for (const k of ks!) expect(THEORY[k], `${s}:${k}`).toBeDefined();
    }
  });
  it("FIELD_THEORY 의 키는 실제 formMeta 입력란 이름이다 (오타 방지)", () => {
    const names = new Set<string>();
    for (const c of CASE_KEYS) for (const list of Object.values(getClientCase(c)!.formMeta)) for (const f of list) names.add(f.name);
    for (const k of Object.keys(FIELD_THEORY)) expect(names.has(k), k).toBe(true);
  });
  it("모든 사례 meta.theory 가 비어 있지 않고 중복이 없다", () => {
    for (const c of CASE_KEYS) {
      const t = getClientCase(c)!.meta.theory;
      expect(t.length, c).toBeGreaterThan(0);
      expect(new Set(t).size, c).toBe(t.length);
      for (const k of t) expect(THEORY[k], `${c}:${k}`).toBeDefined();
    }
  });
});

describe("고아 개념 방지", () => {
  it("모든 THEORY 키가 FIELD_THEORY·STEP_THEORY·사례 meta.theory 중 한 곳에서 쓰인다", () => {
    const used = new Set<string>(Object.values(FIELD_THEORY));
    for (const ks of Object.values(STEP_THEORY)) for (const k of ks!) used.add(k);
    for (const c of CASE_KEYS) for (const k of getClientCase(c)!.meta.theory) used.add(k);
    for (const k of Object.keys(THEORY)) expect(used.has(k), k).toBe(true);
  });
  it("함정 개념(간섭 등)은 s7_lab 밖의 스텝 이론 줄에 들어가지 않는다", () => {
    for (const [s, ks] of Object.entries(STEP_THEORY)) {
      if (s === "s7_lab") continue;
      for (const k of ks!) expect(["interference", "interference_fix", "peeking", "srm", "simpson"], `${s}:${k}`).not.toContain(k);
    }
  });
});

describe("정답 공개 전 함정 이름 숨김", () => {
  it("theoryChapterOnly 는 챕터만 보여 준다", () => {
    expect(theoryChapterOnly("analysis_unit")).toBe("Ch3");
    expect(theoryChapterOnly("analysis_unit")).not.toContain(THEORY.analysis_unit.title);
  });
  it("FIELD_THEORY 의 중립 툴팁·배지에 개념 이름이 없다", () => {
    for (const k of new Set(Object.values(FIELD_THEORY))) {
      expect(NEUTRAL_BADGE_TITLE, k).not.toContain(THEORY[k].title);
      expect(theoryBadge(k), k).not.toContain(THEORY[k].title);
    }
  });
  it("TITLED_STEPS 밖의 스텝은 theoryChapterOnly 로 이름 없이 표시된다", () => {
    for (const [s, ks] of Object.entries(STEP_THEORY)) {
      if (TITLED_STEPS.has(s)) continue;
      for (const k of ks!) expect(theoryChapterOnly(k), `${s}:${k}`).not.toContain(THEORY[k].title);
    }
  });
});

const KEYS = Object.keys(THEORY) as TheoryKey[];
const REVEAL_ONLY = KEYS.filter((k) => "revealOnly" in THEORY[k]);
/** 정답 공개 전에도 폼 도움말에 풀이를 둘 수 있는 중립 어휘(함정이 아닌 용어 뜻) */
const NEUTRAL_VOCAB: TheoryKey[] = ["ab_n"];

describe("스포일러 방지와 풀이 문구", () => {
  it("revealOnly 개념은 s7_lab 밖의 STEP_THEORY 에 들어가지 않는다", () => {
    expect(REVEAL_ONLY.length).toBeGreaterThan(0);
    for (const [s, ks] of Object.entries(STEP_THEORY)) {
      if (s === "s7_lab") continue;
      for (const k of ks!) expect(REVEAL_ONLY, `${s}:${k}`).not.toContain(k);
    }
  });
  it("개념 풀이(note) 문장이 사례 폼의 라벨·도움말·선택지 설명에 그대로 들어 있지 않다", () => {
    const texts: string[] = [];
    for (const c of CASE_KEYS) {
      const cc = getClientCase(c)!;
      for (const list of Object.values(cc.formMeta)) for (const f of list) {
        texts.push(f.label, f.help ?? "", f.why?.text ?? "");
        for (const o of f.options ?? []) texts.push(o.label, o.desc ?? "", o.why?.text ?? "");
      }
      for (const d of Object.values(cc.decisions)) {
        texts.push(d.rationaleWhy?.text ?? "");
        for (const o of d.options) texts.push(o.why?.text ?? "");
      }
      for (const p of cc.phases) {
        for (const l of p.intro?.lines ?? []) texts.push(l.text);
        for (const a of Object.values(p.actionWhy ?? {})) texts.push(a?.text ?? "");
      }
      for (const s of Object.values(cc.stepIntro ?? {})) for (const l of s?.lines ?? []) texts.push(l.text);
    }
    for (const k of KEYS) {
      const note = theoryNote(k);
      if (!note || NEUTRAL_VOCAB.includes(k)) continue;
      for (const t of texts) expect(t.includes(note), `${k}: ${t}`).toBe(false);
    }
  });
  it("note 가 있으면 비어 있지 않고 120자 이하다", () => {
    for (const k of KEYS) {
      const note = theoryNote(k);
      if (note === undefined) continue;
      expect(note.trim().length, k).toBeGreaterThan(0);
      expect(note.length, k).toBeLessThanOrEqual(120);
    }
  });
  it("모든 사례에 outsideTheory 배열이 있다", () => {
    for (const c of CASE_KEYS) {
      const o = getClientCase(c)!.meta.outsideTheory;
      expect(Array.isArray(o), c).toBe(true);
      for (const n of o) expect(n.length, c).toBeGreaterThan(0);
    }
  });
  it("revealOnly 개념의 배지는 챕터만 보여 준다", () => {
    for (const k of REVEAL_ONLY) {
      expect(theoryBadge(k), k).toMatch(/^Ch\d$/);
      expect(theoryChapterOnly(k), k).toMatch(/^Ch\d$/);
    }
  });
});

/** 사례마다 Phase·스텝 다리 문장(stepIntro)을 [위치, intro] 로 모은다 */
function intros() {
  return CASE_KEYS.flatMap((c) => {
    const cc = getClientCase(c)!;
    return [
      ...cc.phases.flatMap((p) => (p.intro ? [{ where: `${c}:${p.key}`, step: p.step as string, intro: p.intro }] : [])),
      ...Object.entries(cc.stepIntro ?? {}).flatMap(([step, intro]) => (intro ? [{ where: `${c}:${step}`, step, intro }] : [])),
    ];
  });
}

describe("선택지 근거 줄과 다리 문장의 이론 표시", () => {
  it("다리 문장의 개념 키는 모두 THEORY 에 있다", () => {
    for (const { where, intro } of intros()) for (const k of intro.theory ?? []) expect(THEORY[k], `${where}:${k}`).toBeDefined();
  });
  it("다리 문장 개념 라벨: revealOnly 개념은 챕터만, 그 밖은 챕터 · 이름", () => {
    expect(introTheoryLabel("hypothesis")).toBe(theoryLabel("hypothesis"));
    expect(introTheoryLabel("trigger")).toMatch(/^Ch\d$/);
    for (const k of REVEAL_ONLY) expect(introTheoryLabel(k), k).toMatch(/^Ch\d$/);
    for (const { where, intro } of intros()) for (const k of intro.theory ?? []) {
      if (REVEAL_ONLY.includes(k)) expect(introTheoryLabel(k), `${where}:${k}`).toMatch(/^Ch\d$/);
      else expect(introTheoryLabel(k), `${where}:${k}`).toBe(theoryLabel(k));
    }
  });
  it("revealOnly 개념은 s7_lab 밖의 다리 문장 개념 라벨에 들어가지 않는다", () => {
    for (const { where, step, intro } of intros()) {
      if (step === "s7_lab") continue;
      for (const k of intro.theory ?? []) expect(REVEAL_ONLY, `${where}:${k}`).not.toContain(k);
    }
  });
  it("근거 배지는 Ch1~Ch5 또는 '사례'만 그리고, 툴팁에 개념 이름이 없다", () => {
    expect(whyBadge(3)).toBe("Ch3");
    expect(whyBadge("case")).toBe("사례");
    expect(whyBadgeTitle(2)).toBe(NEUTRAL_BADGE_TITLE);
    expect(whyBadgeTitle("case")).toBe(CASE_BADGE_TITLE);
    const srcs = new Set<number | string>();
    for (const c of CASE_KEYS) {
      const cc = getClientCase(c)!;
      for (const list of Object.values(cc.formMeta)) for (const f of list) {
        if (f.why) srcs.add(f.why.src);
        for (const o of f.options ?? []) if (o.why) srcs.add(o.why.src);
      }
      for (const d of Object.values(cc.decisions)) {
        if (d.rationaleWhy) srcs.add(d.rationaleWhy.src);
        for (const o of d.options) if (o.why) srcs.add(o.why.src);
      }
      for (const p of cc.phases) {
        for (const l of p.intro?.lines ?? []) srcs.add(l.src);
        for (const a of Object.values(p.actionWhy ?? {})) if (a) srcs.add(a.src);
      }
      for (const s of Object.values(cc.stepIntro ?? {})) for (const l of s?.lines ?? []) srcs.add(l.src);
    }
    expect(srcs.size).toBeGreaterThan(1);
    for (const s of srcs) {
      const badge = whyBadge(s as 1 | 2 | 3 | 4 | 5 | "case");
      expect(badge, String(s)).toMatch(/^(Ch[1-5]|사례)$/);
      for (const k of KEYS) expect(whyBadgeTitle(s as 1 | 2 | 3 | 4 | 5 | "case"), `${s}:${k}`).not.toContain(THEORY[k].title);
    }
  });
});
