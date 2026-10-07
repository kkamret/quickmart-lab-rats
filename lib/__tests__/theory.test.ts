import { describe, expect, it } from "vitest";
import { FIELD_THEORY, NEUTRAL_BADGE_TITLE, STEP_THEORY, THEORY, TITLED_STEPS, theoryBadge, theoryChapterOnly, theoryLabel, theoryNote, type TheoryKey } from "../theory";
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
    for (const c of CASE_KEYS) for (const list of Object.values(getClientCase(c)!.formMeta)) for (const f of list) {
      texts.push(f.label, f.help ?? "");
      for (const o of f.options ?? []) texts.push(o.label, o.desc ?? "");
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
