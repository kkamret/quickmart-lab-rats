import { describe, expect, it } from "vitest";
import { FIELD_THEORY, STEP_THEORY, THEORY, theoryBadge, theoryLabel, wikiHref, type TheoryKey } from "../theory";
import { STEP_KEYS } from "../steps";
import { getClientCase } from "../cases/client-registry";
import { CASE_KEYS } from "../cases";

describe("이론 개념 표", () => {
  it("모든 항목에 챕터(2~4)와 슬라이드 표기가 있다", () => {
    for (const [k, e] of Object.entries(THEORY)) {
      expect([2, 3, 4], k).toContain(e.chapter);
      expect(e.slides, k).toMatch(/^\d+(~\d+)?$/);
      expect(e.title.length, k).toBeGreaterThan(0);
    }
  });
  it("배지는 챕터·슬라이드만 보여 주고 개념 이름은 담지 않는다", () => {
    expect(theoryBadge("peeking")).toBe("Ch3·48");
    expect(theoryBadge("metric_layers")).toBe("Ch2·22~26");
  });
  it("라벨은 이름과 덱 슬라이드를 함께 보여 준다", () => {
    expect(theoryLabel("hypothesis")).toBe("Ch2 · 가설 문장 구조 (덱 17장)");
    expect(theoryLabel("metric_layers")).toBe("Ch2 · 지표 층 (덱 22~26장)");
  });
  it("위키가 있는 개념만 링크를 준다", () => {
    expect(wikiHref("hypothesis")).toMatch(/docs\/ab-testing\/02-hypothesis\.md$/);
    expect(wikiHref("peeking")).toBeUndefined();
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
});
