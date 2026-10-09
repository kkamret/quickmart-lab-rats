import { createHash } from "node:crypto";
import { gaussian, hashSeed, mulberry32 } from "./rng";

/** 공통 난수(CRN)의 키. 설계(design)는 키에 들어가지 않는다 → 설계가 달라도 같은 기간·세그먼트·그룹의 노이즈는 공유. */
export type NoiseKey = {
  case: string;
  phase: string;
  period: number | string;
  segment: string;
  arm: string;
  metric: string;
};

/** 노이즈 스트림: 같은 (SEED, key) 면 항상 같은 표준정규 수열. 한 키에서 여러 개를 뽑을 때 쓴다. */
export function crnStream(seed: number, key: NoiseKey): () => number {
  const h = hashSeed(seed, key.case, key.phase, key.period, key.segment, key.arm, key.metric);
  return gaussian(mulberry32(h));
}

/** 키 하나에 대응하는 단일 표준정규값. */
export function crnZ(seed: number, key: NoiseKey): number {
  return crnStream(seed, key)();
}

/** 키 순서와 상관없이 같은 문자열이 나오는 JSON. */
export function canonicalJSON(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return `[${value.map(canonicalJSON).join(",")}]`;
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${canonicalJSON(obj[k])}`).join(",")}}`;
}

/**
 * 엔진 버전. 시뮬레이터·판정 규칙을 고쳐 같은 설계의 결과가 달라지면 올린다 → sim_runs 의 옛 행이 새 캐시 키와 어긋나
 * 새 결과가 새 행으로 들어간다. 캐시 키에만 쓰고 난수 시드(crnStream/crnZ)에는 쓰지 않으므로 시뮬레이션 숫자는 바뀌지 않는다.
 */
export const ENGINE_VERSION = 2;

/** sim_runs 캐시 키 = sha256(v{ENGINE_VERSION}|case|phase|canonicalJSON(design)) */
export function designHash(caseKey: string, phase: string, design: unknown): string {
  return createHash("sha256").update(`v${ENGINE_VERSION}|${caseKey}|${phase}|${canonicalJSON(design)}`).digest("hex");
}
