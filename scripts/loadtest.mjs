#!/usr/bin/env node
/**
 * 조 N개가 동시에 입장 → 사례 선택 → 설계 제출 → 시뮬레이션(실행·결과)을 하는 수업 한 회차를 흉내 내는 부하 점검 (M9).
 *
 * 사용: node scripts/loadtest.mjs <배포주소> <수업코드> [조 수=10] [시뮬 반복=3] [최대조수/사례=2]
 * 준비: 강사가 수업을 만들고 s0_pick, s2_design, s3_run, s4_readout 스텝을 모두 "열기" 해 둔다.
 * 주의: 실제 DB 에 조·제출·시뮬 기록이 남는다(이름 "부하N조"). 테스트용 수업에서만 돌리고, 끝나면 수업을 지운다.
 * 이 스크립트는 강사 비밀번호나 키를 쓰지 않는다(조 화면이 쓰는 공개 API 만 호출).
 */
const [base, code, nTeams = "10", sims = "3", maxPer = "2"] = process.argv.slice(2);
if (!base || !code) {
  console.error("사용: node scripts/loadtest.mjs <배포주소> <수업코드> [조 수=10] [시뮬 반복=3] [최대조수/사례=2]");
  process.exit(1);
}
const N = +nTeams, REPEAT = +sims, MAX_PER = +maxPer;

const hyp = { action: "무반응 푸시를 쉬게 해요", behavior: "관심 없는 푸시가 줄어 남은 푸시를 더 봐요", impact: "CTR 이 오르고 클릭은 유지돼요" };
const DESIGNS = {
  baemin: {
    phase: "p1", hypothesis: { action: "안내해요", behavior: "바로 주문해요", impact: "이탈이 줄어요" },
    scope: { os: "android", surface: "store_home" }, unit: "session",
    metrics: { primary: "abandon", guardrails: ["conv", "crash"], secondary: ["aov"] },
    alpha: 0.05, power: 0.8, mde_pp: 2, duration_days: 7, allocation: 1, ramp: "none", include_ramp_days: true, stopping: "fixed", count_basis: "assignment",
  },
  toss: {
    phase: "p1", hypothesis: hyp, variants: { V1: { N: 3, W: 14, C: 14, G: "same_service" }, V2: { N: 4, W: 30, C: 14, G: "same_service" } },
    sample_fraction: 0.06, duration_weeks: 8, primary: "push_ctr", hypothesis_type: { clicks_per_user: "non_inferiority" }, ni_margin_pct: -1,
    guardrails: ["app_open_au"], secondary: ["clicks_per_user", "sends_per_user"], ctr_analysis_unit: "user_delta", cuped: false, correction: "none",
    stopping: "fixed", stakeholder_alignment: true,
  },
  daangn: {
    phase: "p1", assignment_timing: "review_screen_open", analysis_population: "review_screen_open", metric_definition: "submitted_72h",
    guardrails: ["short_review_rate"], alpha: 0.05, power: 0.8, mde_pp: 2, duration_days: 14, stopping: "fixed", data_source: "server_db", run_aa_first: true,
  },
  netflix: {
    phase: "p1", method: "interleaving", il_scheme: "team_draft", il_credit: "qualified_play_10min", il_members_per_pair: 10000, il_days: 7,
    candidates: ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"], correction: "bh", advance_rule: "보정 후 유의 + 선호 0.51 이상",
  },
};
const CASES = Object.keys(DESIGNS);

const stats = new Map(); // endpoint -> { ms: number[], err: Map<string, number> }
async function call(label, path, body) {
  const t0 = performance.now();
  let status = 0, data = null;
  try {
    const res = await fetch(base + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    status = res.status;
    data = await res.json().catch(() => null);
  } catch (e) {
    status = -1;
    data = { error: String(e.cause?.code ?? e.message) };
  }
  const ms = performance.now() - t0;
  const s = stats.get(label) ?? { ms: [], err: new Map() };
  s.ms.push(ms);
  if (status < 200 || status >= 300) {
    const k = `${status} ${data?.error ?? ""}`.trim();
    s.err.set(k, (s.err.get(k) ?? 0) + 1);
  }
  stats.set(label, s);
  return { status, data, ms };
}

const picks = []; // 사례 선택 결과 (경쟁 상태 점검용)
async function team(i) {
  const name = `부하${i + 1}조`;
  const j = await call("team/join", "/api/team/join", { code, name });
  if (j.status !== 200) return { name, ok: false, why: "join" };
  const teamId = j.data.teamId;

  // 사례 선택: 선호 사례부터 차례로 시도 (정원이 차면 다음 사례)
  let picked = null;
  for (let k = 0; k < CASES.length && !picked; k++) {
    const c = CASES[(i + k) % CASES.length];
    const r = await call("team/case", "/api/team/case", { code, teamId, caseKey: c });
    if (r.status === 200) picked = c;
  }
  picks.push({ name, picked });
  if (!picked) return { name, ok: false, why: "case" };

  const sub = await call("submit(design)", "/api/submit", { code, teamId, step: "s2_design", phase: "p1", kind: "design", payload: DESIGNS[picked] });
  if (sub.status !== 200) return { name, ok: false, why: "submit" };
  for (let r = 0; r < REPEAT; r++) {
    await call("simulate(p1_run)", "/api/simulate", { code, teamId, phase: "p1_run", mode: "main" });
    await call("simulate(p1_readout)", "/api/simulate", { code, teamId, phase: "p1_readout", mode: "main" });
  }
  return { name, ok: true, picked };
}

const pct = (a, p) => a.slice().sort((x, y) => x - y)[Math.min(a.length - 1, Math.floor((p / 100) * a.length))];
console.log(`대상 ${base} · 수업 ${code} · 조 ${N}개 동시 · 시뮬 ${REPEAT}회 반복 · 사례당 최대 ${MAX_PER}조\n`);
const t0 = performance.now();
const results = await Promise.all(Array.from({ length: N }, (_, i) => team(i)));
const total = (performance.now() - t0) / 1000;

console.log("엔드포인트".padEnd(22), "건수".padStart(5), "p50".padStart(8), "p95".padStart(8), "max".padStart(8), " 오류");
for (const [k, s] of stats) {
  const errs = [...s.err].map(([e, n]) => `${e} ×${n}`).join("; ");
  console.log(k.padEnd(22), String(s.ms.length).padStart(5), `${pct(s.ms, 50).toFixed(0)}ms`.padStart(8), `${pct(s.ms, 95).toFixed(0)}ms`.padStart(8), `${Math.max(...s.ms).toFixed(0)}ms`.padStart(8), errs ? ` ${errs}` : "");
}
const byCase = {};
for (const p of picks) if (p.picked) byCase[p.picked] = (byCase[p.picked] ?? 0) + 1;
const over = Object.entries(byCase).filter(([, n]) => n > MAX_PER);
console.log(`\n사례 분포: ${JSON.stringify(byCase)}${over.length ? `  ← 정원(${MAX_PER}) 초과: ${over.map(([c, n]) => `${c} ${n}조`).join(", ")} (동시 선택 경쟁 상태)` : "  (정원 초과 없음)"}`);
const failed = results.filter((r) => !r.ok);
console.log(`완주 ${results.length - failed.length}/${results.length}조 · 총 ${total.toFixed(1)}초${failed.length ? ` · 실패: ${failed.map((f) => `${f.name}(${f.why})`).join(", ")}` : ""}`);
process.exit(failed.length || over.length ? 2 : 0);
