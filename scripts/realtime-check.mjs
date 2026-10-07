#!/usr/bin/env node
/**
 * Realtime 점검: 조 화면이 쓰는 것과 같은 방식(anon 키 + postgres_changes)으로 수업의 step_states / classes / teams 변경을 구독하고,
 * 강사가 화면에서 스텝을 열고 닫거나 정답 공개를 바꿀 때 이벤트가 오는지, 얼마나 걸리는지 출력한다.
 *
 * 사용: node --env-file=.env.local scripts/realtime-check.mjs <수업코드> [대기초=120]
 * 필요한 환경변수: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY (공개 키만 사용, 값은 출력하지 않는다)
 */
import { createClient } from "@supabase/supabase-js";

const [code, secs = "120"] = process.argv.slice(2);
if (!code) {
  console.error("사용: node --env-file=.env.local scripts/realtime-check.mjs <수업코드> [대기초=120]");
  process.exit(1);
}
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error("NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 가 필요해요.");
  process.exit(1);
}

const db = createClient(url, anon, { realtime: { params: { eventsPerSecond: 10 } } });
const { data: cls, error } = await db.from("classes").select("id, code, reveal_answers").eq("code", code.toUpperCase()).maybeSingle();
if (error || !cls) {
  console.error("수업을 찾지 못했어요:", error?.message ?? code);
  process.exit(1);
}
console.log(`수업 ${cls.code} (정답 공개: ${cls.reveal_answers ? "켜짐" : "꺼짐"})`);

const t0 = Date.now();
const stamp = () => `+${((Date.now() - t0) / 1000).toFixed(1)}s`;
const events = [];
const log = (kind, text) => {
  events.push(kind);
  console.log(`${stamp()}  ${kind}  ${text}`);
};

const filter = `class_id=eq.${cls.id}`;
const channel = db
  .channel(`check:${cls.id}`)
  .on("postgres_changes", { event: "*", schema: "public", table: "step_states", filter }, (p) => log("step_states", `${p.new?.step} → ${p.new?.status}`))
  .on("postgres_changes", { event: "*", schema: "public", table: "teams", filter }, (p) => log("teams", `${p.eventType} ${p.new?.name ?? ""} ${p.new?.case_key ?? ""}`.trim()))
  .on("postgres_changes", { event: "UPDATE", schema: "public", table: "classes", filter: `id=eq.${cls.id}` }, (p) => log("classes", `reveal_answers=${p.new?.reveal_answers}`))
  .subscribe((status, err) => {
    console.log(`${stamp()}  구독 상태: ${status}${err ? ` (${err.message})` : ""}`);
    if (status === "SUBSCRIBED") console.log(`지금부터 ${secs}초 동안 강사 화면에서 스텝을 열기/마감/잠금으로 바꿔 보세요.`);
  });

await new Promise((r) => setTimeout(r, +secs * 1000));
await db.removeChannel(channel);
const n = (k) => events.filter((e) => e === k).length;
console.log(`\n수신: step_states ${n("step_states")}건, teams ${n("teams")}건, classes ${n("classes")}건`);
process.exit(events.length ? 0 : 2);
