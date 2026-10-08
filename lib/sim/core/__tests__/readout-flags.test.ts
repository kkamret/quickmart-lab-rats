import { describe, expect, it } from "vitest";
import { ALL_FLAGS, CASE_FLAGS, COMMON_FLAGS, FLAG_LABELS, isFlag } from "../flags";
import { toTeamView, type Readout } from "../readout";

const readout: Readout = {
  caseKey: "toss",
  phase: "s4",
  designHash: "abc",
  periods: [],
  metrics: [],
  panels: { composition: { visible: true }, _trueEffect: { dC: -0.003 } },
  flags: ["RATIO_COMPOSITION", "SRM"],
};

describe("flags", () => {
  it("공통 15개 + 사례 전용 3개, 라벨이 모두 있다", () => {
    expect(COMMON_FLAGS).toHaveLength(15);
    expect(CASE_FLAGS).toHaveLength(3);
    for (const f of ALL_FLAGS) expect(FLAG_LABELS[f]).toBeTruthy();
    expect(new Set(ALL_FLAGS).size).toBe(ALL_FLAGS.length);
  });
  it("isFlag", () => {
    expect(isFlag("SRM")).toBe(true);
    expect(isFlag("nope")).toBe(false);
  });
});

describe("toTeamView (규칙 3: 숨긴 효과와 플래그는 조 화면으로 내려보내지 않는다)", () => {
  it("flags 와 '_' 패널을 제거한다", () => {
    const v = toTeamView(readout) as Record<string, unknown>;
    expect("flags" in v).toBe(false);
    expect(Object.keys(v.panels as object)).toEqual(["composition"]);
  });
  it("직렬화한 응답에 플래그 이름과 숨김 값이 없다", () => {
    const json = JSON.stringify(toTeamView(readout));
    expect(json).not.toContain("RATIO_COMPOSITION");
    expect(json).not.toContain("SRM");
    expect(json).not.toContain("trueEffect");
  });
  it("achievedPower 는 진짜 효과에서 계산한 값이라 조 화면 응답에서 뺀다", () => {
    const v = toTeamView({ ...readout, achievedPower: 0.25 }) as Record<string, unknown>;
    expect("achievedPower" in v).toBe(false);
    expect(JSON.stringify(v)).not.toContain("achievedPower");
  });
  it("원본은 바꾸지 않는다", () => {
    toTeamView(readout);
    expect(readout.flags).toEqual(["RATIO_COMPOSITION", "SRM"]);
    expect(Object.keys(readout.panels)).toContain("_trueEffect");
  });
});
