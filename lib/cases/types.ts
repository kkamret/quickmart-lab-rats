/** 사례 플러그인 인터페이스 (docs/sim-core.md §5) */
import type { ZodType } from "zod";
import type { CaseKey } from "../cases";
import type { StepKey } from "../steps";
import type { Readout } from "../sim/core/readout";
import type { TheoryKey } from "../theory";

export type PhaseKind = "diagnose" | "design" | "run" | "readout" | "decide";

export type PhaseDef = { key: string; step: StepKey; title: string; kind: PhaseKind };

export type FieldOption = { value: string | number | boolean; label: string; desc?: string };

/** designSchema 와 함께 폼을 자동 렌더링하는 데 쓰는 입력란 메타. 문구는 해요체. */
export type FieldMeta = {
  /** designSchema 안의 점 표기 경로 (예: "scope.os", "metrics.primary") */
  name: string;
  label: string;
  help?: string;
  type: "text" | "textarea" | "number" | "select" | "multiselect" | "boolean";
  options?: FieldOption[];
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
};

export type DecisionOption = { id: string; label: string; desc: string };
/** 결정과 함께 적는 추가 글칸(예: 공지 초안). 필수. */
export type DecisionField = { name: string; label: string; help?: string };
export type DecisionDef = {
  options: DecisionOption[];
  fields?: DecisionField[];
  /** 이 결정 전에 설계가 제출돼 있어야 하는 Phase(기본: 같은 Phase). 설계가 없는 최종 결정은 앞 Phase 를 가리킨다. */
  requires?: string;
};

export interface CasePlugin<D = unknown> {
  key: CaseKey;
  meta: {
    title: string;
    company: string;
    sourceUrl: string;
    sourceTitle: string;
    difficulty: 1 | 2 | 3 | 4;
    concepts: string[];
    /** 이 사례에서 쓰는 이론 개념 (정답 공개 때 "오늘 쓴 개념 ↔ 덱" 표에 쓴다) */
    theory: TheoryKey[];
  };
  phases: PhaseDef[];
  designSchema: Record<string, ZodType>;
  formMeta: Record<string, FieldMeta[]>;
  decisions: Record<string, DecisionDef>;
  /** 폼의 초기값. prev 는 같은 사례의 앞 Phase 에서 제출한 설계(있으면 이어받는다). */
  defaultDesign(phase: string, prev?: Record<string, unknown>): Record<string, unknown>;
  /** 설계가 유효하지 않으면 SimulationRejected 를 던진다 */
  simulate(phase: string, design: D, ctx: { prior: Record<string, Readout> }): Readout;
  /** 서버 전용: 클라이언트 번들에 넣지 않는다 (정답 공개 전에는 조에게 보여주지 않음) */
  rubric: Record<string, string>;
  reveal: Record<string, string>;
}

/** 클라이언트로 보내도 되는 부분(폼·화면에 필요한 것). 시뮬 엔진, 루브릭, 정답 해설은 제외. */
export type ClientCase = Omit<CasePlugin, "simulate" | "rubric" | "reveal">;

/** 시뮬레이션을 돌릴 수 없는 설계. 메시지는 조 화면에 그대로 보여준다. */
export class SimulationRejected extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SimulationRejected";
  }
}
