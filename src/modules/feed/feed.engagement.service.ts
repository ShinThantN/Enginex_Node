import { prisma } from "../../shared/config/index.ts";
import { AppError } from "../../shared/utils/utils.ts";
import { calculateViralScore } from "./feed.viral-score.service.ts";

/**
 * Public engagement interface exposed to other modules (Engineer, Client, ...).
 *
 * This is the ONLY sanctioned way for another module to affect a post's
 * engagement metrics. Other modules must not read or write feed tables directly,
 * and must not contain any viral-score logic — they simply notify the Feed
 * module that a domain event occurred, and the Feed module owns how that maps to
 * counters and how the score is recomputed and persisted.
 *
 * The Feed module, in turn, contains no offer/agreement business logic; it only
 * knows how many of each engagement type a post has accumulated.
 */
export interface FeedEngagementService {
  /** An engineer submitted an offer against the post. */
  registerProjectOffer(postId: number): Promise<void>;
  /** A previously counted offer was withdrawn or rejected. */
  withdrawProjectOffer(postId: number): Promise<void>;
  /** A project agreement/contract was created from the post. */
  registerAcceptedContract(postId: number): Promise<void>;
  /** A previously counted accepted contract was cancelled. */
  withdrawAcceptedContract(postId: number): Promise<void>;
}

interface EngagementDelta {
  offerCount?: number;
  acceptedContractCount?: number;
}

async function applyEngagementDelta(
  postId: number,
  delta: EngagementDelta,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: {
        likeCount: true,
        commentCount: true,
        offerCount: true,
        acceptedContractCount: true,
        createdAt: true,
      },
    });
    if (!post) throw new AppError("Post not found", 404);

    const offerCount = Math.max(0, post.offerCount + (delta.offerCount ?? 0));
    const acceptedContractCount = Math.max(
      0,
      post.acceptedContractCount + (delta.acceptedContractCount ?? 0),
    );

    const viralScore = calculateViralScore({
      ...post,
      offerCount,
      acceptedContractCount,
    });

    await tx.post.update({
      where: { id: postId },
      data: { offerCount, acceptedContractCount, viralScore },
    });
  });
}

export const feedEngagementService: FeedEngagementService = {
  registerProjectOffer: (postId) => applyEngagementDelta(postId, { offerCount: 1 }),
  withdrawProjectOffer: (postId) => applyEngagementDelta(postId, { offerCount: -1 }),
  registerAcceptedContract: (postId) =>
    applyEngagementDelta(postId, { acceptedContractCount: 1 }),
  withdrawAcceptedContract: (postId) =>
    applyEngagementDelta(postId, { acceptedContractCount: -1 }),
};
