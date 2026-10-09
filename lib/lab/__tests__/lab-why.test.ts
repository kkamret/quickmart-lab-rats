/** s7·s8 공통 화면의 선택지 근거 줄과 근거 없는 기존 문구 정리(설계 문서 3.8·3.9, 5장 S-1~S-3) */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Why } from "@/lib/cases/types";
import { SHARE_WHY, TRAP_LAB_WHY } from "../lab-why";

const trapLines = (): [string, Why][] => [
  ["peekingDays", TRAP_LAB_WHY.peekingDays],
  ...Object.entries(TRAP_LAB_WHY.peekingDayOptions).map(([d, why]): [string, Why] => [`peekingDay:${d}`, why]),
  ["peekingRun", TRAP_LAB_WHY.peekingRun],
  ["simpsonPool", TRAP_LAB_WHY.simpsonPool],
  ["simpsonSplit", TRAP_LAB_WHY.simpsonSplit],
  ["srmA", TRAP_LAB_WHY.srmA],
  ["srmB", TRAP_LAB_WHY.srmB],
  ["srmRatio", TRAP_LAB_WHY.srmRatio],
];
const shareLines = (): [string, Why][] => Object.entries(SHARE_WHY);

describe("s7·s8 선택지 근거 줄", () => {
  it("함정 연구소 입력·보기·버튼 10자리(L1~L10)와 공유 글칸 2자리(S1·S2)에 한 줄이 있다", () => {
    expect(trapLines()).toHaveLength(10);
    expect(Object.keys(TRAP_LAB_WHY.peekingDayOptions).sort()).toEqual(["14", "28", "7"]);
    expect(shareLines()).toHaveLength(2);
  });
  it("근거는 챕터(1~5)만, 한 줄은 90자 이하, 출처 표기가 없다", () => {
    for (const [k, why] of [...trapLines(), ...shareLines()]) {
      expect([1, 2, 3, 4, 5], k).toContain(why.src);
      expect(why.text.length, k).toBeLessThanOrEqual(90);
      for (const m of ["덱", "위키", "슬라이드", "편", "「", "」", "docs/", "§"]) expect(why.text.includes(m), `${k}: ${m}`).toBe(false);
    }
  });
  it("s8 줄에는 함정 이름·정오 힌트가 없다(s7 은 면제)", () => {
    const banned = ["SRM", "심슨", "Peeking", "위양성", "신규성", "정답", "오답", "틀린", "잘못", "올바른", "권장"];
    for (const [k, why] of shareLines()) for (const b of banned) expect(why.text.includes(b), `${k}: ${b}`).toBe(false);
  });
});

describe("근거 없는 기존 문구 정리(S-1, S-2)", () => {
  it("ShareStep 에서 '승률보다 학습률' 주장을 지웠다", () => {
    expect(readFileSync("components/lab/ShareStep.tsx", "utf8")).not.toContain("승률보다 학습률");
  });
  it("TrapLab 에서 'p < 0.001이면 SRM' 임계값 주장을 지웠다", () => {
    expect(readFileSync("components/lab/TrapLab.tsx", "utf8")).not.toContain("0.001이면");
  });
});
