/** LLM 리뷰 출력 형식 (docs/review-contract.md). 클라이언트에서도 import 하므로 서버 전용 코드를 두지 않는다. */
import { z } from "zod";

// 모델이 개수 제한을 조금 넘겨도 실패시키지 않고 잘라서 받는다.
const capped = (n: number) => z.array(z.string()).transform((a) => a.slice(0, n));
export const teamReviewSchema = z.object({
  score: z.number().transform((n) => Math.min(100, Math.max(0, Math.round(n)))),
  strengths: capped(6),
  issues: capped(6),
  nudge_questions: capped(5),
  vs_original: z.string().default(""),
});
export type TeamReview = z.infer<typeof teamReviewSchema>;

export const classReviewSchema = z.object({
  summary: z.string(),
  concept_board: z.array(z.object({ concept: z.string(), found_by: z.array(z.string()), missed_by: z.array(z.string()), note: z.string() })),
  team_cards: z.array(z.object({
    team: z.string(), case: z.string(), score: z.number().min(0).max(100), one_liner: z.string(),
    trap_status: z.record(z.string(), z.enum(["found", "missed", "n/a"])),
  })),
  cross_case_insight: z.string(),
  discussion_questions: z.array(z.string()).max(6),
});
export type ClassReview = z.infer<typeof classReviewSchema>;

/** s8 직소 브리핑: 조마다 2분 발표 초안. 계약(docs/review-contract.md §3)의 조별 객체를 한 번의 호출로 모두 만든다. */
export const shareReviewSchema = z.object({
  briefs: z.array(z.object({
    team: z.string(),
    case: z.string(),
    story_in_3_lines: z.array(z.string()).max(3),
    traps_we_hit: z.array(z.string()).max(6),
    one_lesson_for_other_teams: z.string(),
  })),
});
export type ShareReview = z.infer<typeof shareReviewSchema>;

export type ReviewScope = "team" | "class" | "share";
export type ReviewResult<T> = { output: T; model: string; cached: boolean; createdAt: string };
