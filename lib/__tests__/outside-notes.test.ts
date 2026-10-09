import { describe, expect, it } from "vitest";
import { OUTSIDE_NOTES } from "../outside-notes";
import { getClientCase } from "../cases/client-registry";
import { CASE_KEYS } from "../cases";
import { FLAG_LABELS } from "../sim/core/flags";

const used = new Set<string>(CASE_KEYS.flatMap((c) => getClientCase(c)!.meta.outsideTheory));

describe("이론 밖 개념의 앱 자체 풀이", () => {
  it("모든 사례의 outsideTheory 이름에 풀이가 있다", () => {
    expect(used.size).toBeGreaterThan(0);
    for (const n of used) expect(OUTSIDE_NOTES[n], n).toBeDefined();
  });
  it("풀이 표의 모든 이름은 어떤 사례에서 쓰인다", () => {
    for (const k of Object.keys(OUTSIDE_NOTES)) expect(used.has(k), k).toBe(true);
  });
  it("풀이는 비어 있지 않고 200자 이하이며 해요체로 끝난다", () => {
    for (const [k, v] of Object.entries(OUTSIDE_NOTES)) {
      expect(v.trim().length, k).toBeGreaterThan(0);
      expect(v.length, k).toBeLessThanOrEqual(200);
      expect(v, k).toMatch(/요\.$/);
    }
  });
  it("숨긴 효과로 읽힐 숫자·퍼센트를 담지 않는다", () => {
    for (const [k, v] of Object.entries(OUTSIDE_NOTES)) {
      expect(v, k).not.toMatch(/%/);
      expect(v, k).not.toMatch(/\d/);
    }
  });
  it("플래그 이름(FLAG_LABELS 문구)을 담지 않는다", () => {
    for (const [k, v] of Object.entries(OUTSIDE_NOTES)) for (const [f, label] of Object.entries(FLAG_LABELS)) expect(v.includes(label), `${k}:${f}`).toBe(false);
  });
});
