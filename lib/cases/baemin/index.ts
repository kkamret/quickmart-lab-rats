import type { CasePlugin } from "../types";
import { SimulationRejected } from "../types";
import { judgeBaemin } from "./judge";
import { rubric, reveal } from "./rubric";
import type { Design } from "./schema";
import { simulateBaemin } from "./simulate";
import { baeminClient } from "./ui";

/** 서버 전용 플러그인: 클라이언트용 정의 + 시뮬 엔진 + 루브릭 + 정답 해설 */
export const baeminPlugin: CasePlugin<Design> = {
  ...baeminClient,
  /** phase 는 'p1'~'p4' (또는 'p1_run' 처럼 접두가 p1~p4 인 키). 진단은 시뮬레이션이 없다. */
  simulate(phase, design) {
    const sim = phase.slice(0, 2);
    if (!["p1", "p2", "p3", "p4"].includes(sim)) throw new SimulationRejected("이 단계에는 시뮬레이션이 없어요.");
    return simulateBaemin({ ...design, phase: sim });
  },
  rubric,
  reveal,
  judge: judgeBaemin,
};

export { simulateBaemin, validateDesign } from "./simulate";
