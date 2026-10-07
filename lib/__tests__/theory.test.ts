import { describe, expect, it } from "vitest";
import { FIELD_THEORY, NEUTRAL_BADGE_TITLE, STEP_THEORY, THEORY, TITLED_STEPS, theoryBadge, theoryChapterOnly, theoryLabel, type TheoryKey } from "../theory";
import { STEP_KEYS } from "../steps";
import { getClientCase } from "../cases/client-registry";
import { CASE_KEYS } from "../cases";

describe("이론 개념 표", () => {
  it("모든 항목에 챕터(2~4)와 이름이 있다", () => {
    for (const [k, e] of Object.entries(THEORY)) {
      expect([2, 3, 4], k).toContain(e.chapter);
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
