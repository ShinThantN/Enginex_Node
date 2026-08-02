/**
 * Viral score service.
 *
 * A dedicated, side-effect-free calculation so it can be unit tested in
 * isolation and reused by both the Feed module (on like/comment events) and the
 * public engagement service that other modules call into (on offer/agreement
 * events). It never touches the database — persistence is the caller's concern.
 *
 * Formula:
 *   baseScore  = (likes * 1) + (comments * 4) + (offers * 12) + (contracts * 30)
 *   viralScore = baseScore / (hoursSinceCreated + 2)^1.5
 */

export interface ViralScoreInput {
  likeCount: number;
  commentCount: number;
  offerCount: number;
  acceptedContractCount: number;
  createdAt: Date;
  /** Reference time. Defaults to the current time; injectable for tests. */
  now?: Date;
}

export const VIRAL_SCORE_WEIGHTS = {
  like: 1,
  comment: 4,
  offer: 12,
  acceptedContract: 30,
} as const;

const GRAVITY = 1.5;
const TIME_OFFSET_HOURS = 2;
const MS_PER_HOUR = 1000 * 60 * 60;

export function calculateBaseScore(
  metrics: Pick<
    ViralScoreInput,
    "likeCount" | "commentCount" | "offerCount" | "acceptedContractCount"
  >,
): number {
  return (
    metrics.likeCount * VIRAL_SCORE_WEIGHTS.like +
    metrics.commentCount * VIRAL_SCORE_WEIGHTS.comment +
    metrics.offerCount * VIRAL_SCORE_WEIGHTS.offer +
    metrics.acceptedContractCount * VIRAL_SCORE_WEIGHTS.acceptedContract
  );
}

export function calculateViralScore(input: ViralScoreInput): number {
  const now = input.now ?? new Date();
  const baseScore = calculateBaseScore(input);

  const hoursSinceCreated = Math.max(
    0,
    (now.getTime() - input.createdAt.getTime()) / MS_PER_HOUR,
  );
  const denominator = Math.pow(hoursSinceCreated + TIME_OFFSET_HOURS, GRAVITY);

  return baseScore / denominator;
}
