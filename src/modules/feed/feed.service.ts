import { prisma, Prisma } from "../../shared/config/index.ts";
import { AppError } from "../../shared/utils/utils.ts";
import { calculateViralScore } from "./feed.viral-score.service.ts";
import type {
  CreatePostInput,
  UpdatePostInput,
  FeedQueryInput,
  SearchQueryInput,
  PaginationQueryInput,
  CreateCommentInput,
  UpdateCommentInput,
} from "./feed.validator.ts";

/**
 * Author data is always returned through the relation, never duplicated onto
 * the post/comment rows. A narrow `select` keeps payloads small and avoids
 * leaking sensitive user fields.
 */
const authorSelect = {
  id: true,
  fullName: true,
  profileImage: true,
  role: true,
} satisfies Prisma.UserSelect;

const postSelect = {
  id: true,
  userId: true,
  title: true,
  content: true,
  imageUrl: true,
  visibility: true,
  likeCount: true,
  commentCount: true,
  viralScore: true,
  createdAt: true,
  updatedAt: true,
  user: { select: authorSelect },
} satisfies Prisma.PostSelect;

const commentSelect = {
  id: true,
  postId: true,
  userId: true,
  comment: true,
  createdAt: true,
  user: { select: authorSelect },
} satisfies Prisma.PostCommentSelect;

/**
 * Fields required to recompute a post's viral score. Selected up-front so the
 * recalculation never triggers an extra round trip inside a transaction.
 */
const viralInputSelect = {
  likeCount: true,
  commentCount: true,
  offerCount: true,
  acceptedContractCount: true,
  createdAt: true,
} satisfies Prisma.PostSelect;

type PostRecord = Prisma.PostGetPayload<{ select: typeof postSelect }>;
type CommentRecord = Prisma.PostCommentGetPayload<{ select: typeof commentSelect }>;

function buildPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  };
}

/** Expose the author id explicitly while still sourcing author data relationally. */
function toPostResponse(post: PostRecord) {
  const { userId, user, ...rest } = post;
  return { ...rest, authorId: userId, author: user };
}

function toCommentResponse(comment: CommentRecord) {
  const { userId, user, ...rest } = comment;
  return { ...rest, authorId: userId, author: user };
}

export async function createPost(userId: number, input: CreatePostInput) {
  const post = await prisma.post.create({
    data: {
      userId,
      title: input.title,
      content: input.content,
      visibility: input.visibility,
      imageUrl: input.imageUrl ?? null,
      // likeCount, commentCount, offerCount, acceptedContractCount and
      // viralScore all start at their column defaults (0).
    },
    select: postSelect,
  });

  return toPostResponse(post);
}

export async function getFeed(query: FeedQueryInput) {
  const { page, limit, sort } = query;
  const skip = (page - 1) * limit;

  // Trending reads the stored viralScore (never recomputed per request);
  // createdAt is the tie-breaker. Both orderings are index-backed.
  const orderBy: Prisma.PostOrderByWithRelationInput[] =
    sort === "trending"
      ? [{ viralScore: "desc" }, { createdAt: "desc" }]
      : [{ createdAt: "desc" }];

  const where: Prisma.PostWhereInput = { visibility: "PUBLIC" };

  const [items, total] = await Promise.all([
    prisma.post.findMany({ where, orderBy, skip, take: limit, select: postSelect }),
    prisma.post.count({ where }),
  ]);

  return { items: items.map(toPostResponse), pagination: buildPagination(page, limit, total) };
}

export async function searchPosts(query: SearchQueryInput) {
  const { q, page, limit } = query;
  const skip = (page - 1) * limit;

  // The `OR` array is the extension point: additional matchers (e.g. a future
  // `tags` relation) can be appended here without changing callers or signature.
  const where: Prisma.PostWhereInput = {
    visibility: "PUBLIC",
    OR: [{ title: { contains: q } }, { content: { contains: q } }],
  };

  const [items, total] = await Promise.all([
    prisma.post.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: limit,
      select: postSelect,
    }),
    prisma.post.count({ where }),
  ]);

  return { items: items.map(toPostResponse), pagination: buildPagination(page, limit, total) };
}

export async function updatePost(userId: number, postId: number, input: UpdatePostInput) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });
  if (!post) throw new AppError("Post not found", 404);
  if (post.userId !== userId) throw new AppError("You can only modify your own posts", 403);

  const updated = await prisma.post.update({
    where: { id: postId },
    data: {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.content !== undefined ? { content: input.content } : {}),
      ...(input.visibility !== undefined ? { visibility: input.visibility } : {}),
      ...(input.imageUrl !== undefined
        ? { imageUrl: input.imageUrl, imageData: null, imageType: null }
        : {}),
    },
    select: postSelect,
  });

  return toPostResponse(updated);
}

export async function deletePost(userId: number, postId: number) {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true, userId: true },
  });
  if (!post) throw new AppError("Post not found", 404);
  if (post.userId !== userId) throw new AppError("You can only delete your own posts", 403);

  // Remove dependent rows and the post atomically (children first).
  await prisma.$transaction([
    prisma.postLike.deleteMany({ where: { postId } }),
    prisma.postComment.deleteMany({ where: { postId } }),
    prisma.postStat.deleteMany({ where: { postId } }),
    prisma.post.delete({ where: { id: postId } }),
  ]);
}

export async function likePost(userId: number, postId: number) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: viralInputSelect,
    });
    if (!post) throw new AppError("Post not found", 404);

    try {
      await tx.postLike.create({ data: { postId, userId } });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        throw new AppError("You have already liked this post", 409);
      }
      throw error;
    }

    const likeCount = post.likeCount + 1;
    const viralScore = calculateViralScore({ ...post, likeCount });

    const updated = await tx.post.update({
      where: { id: postId },
      data: { likeCount, viralScore },
      select: postSelect,
    });

    return toPostResponse(updated);
  });
}

export async function unlikePost(userId: number, postId: number) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: viralInputSelect,
    });
    if (!post) throw new AppError("Post not found", 404);

    const like = await tx.postLike.findUnique({
      where: { postId_userId: { postId, userId } },
    });
    if (!like) throw new AppError("You have not liked this post", 409);

    await tx.postLike.delete({ where: { id: like.id } });

    const likeCount = Math.max(0, post.likeCount - 1);
    const viralScore = calculateViralScore({ ...post, likeCount });

    const updated = await tx.post.update({
      where: { id: postId },
      data: { likeCount, viralScore },
      select: postSelect,
    });

    return toPostResponse(updated);
  });
}

export async function addComment(
  userId: number,
  postId: number,
  input: CreateCommentInput,
) {
  return prisma.$transaction(async (tx) => {
    const post = await tx.post.findUnique({
      where: { id: postId },
      select: viralInputSelect,
    });
    if (!post) throw new AppError("Post not found", 404);

    const comment = await tx.postComment.create({
      data: { postId, userId, comment: input.comment },
      select: commentSelect,
    });

    const commentCount = post.commentCount + 1;
    const viralScore = calculateViralScore({ ...post, commentCount });

    await tx.post.update({
      where: { id: postId },
      data: { commentCount, viralScore },
    });

    return toCommentResponse(comment);
  });
}

export async function getComments(postId: number, query: PaginationQueryInput) {
  const { page, limit } = query;
  const skip = (page - 1) * limit;

  const post = await prisma.post.findUnique({
    where: { id: postId },
    select: { id: true },
  });
  if (!post) throw new AppError("Post not found", 404);

  const where: Prisma.PostCommentWhereInput = { postId };

  const [items, total] = await Promise.all([
    prisma.postComment.findMany({
      where,
      orderBy: [{ createdAt: "desc" }],
      skip,
      take: limit,
      select: commentSelect,
    }),
    prisma.postComment.count({ where }),
  ]);

  return { items: items.map(toCommentResponse), pagination: buildPagination(page, limit, total) };
}

export async function updateComment(
  userId: number,
  commentId: number,
  input: UpdateCommentInput,
) {
  const comment = await prisma.postComment.findUnique({
    where: { id: commentId },
    select: { id: true, userId: true },
  });
  if (!comment) throw new AppError("Comment not found", 404);
  if (comment.userId !== userId) {
    throw new AppError("You can only modify your own comments", 403);
  }

  const updated = await prisma.postComment.update({
    where: { id: commentId },
    data: { comment: input.comment },
    select: commentSelect,
  });

  return toCommentResponse(updated);
}

export async function deleteComment(userId: number, commentId: number) {
  return prisma.$transaction(async (tx) => {
    const comment = await tx.postComment.findUnique({
      where: { id: commentId },
      select: { id: true, userId: true, postId: true },
    });
    if (!comment) throw new AppError("Comment not found", 404);
    if (comment.userId !== userId) {
      throw new AppError("You can only delete your own comments", 403);
    }

    await tx.postComment.delete({ where: { id: commentId } });

    const post = await tx.post.findUnique({
      where: { id: comment.postId },
      select: viralInputSelect,
    });
    if (post) {
      const commentCount = Math.max(0, post.commentCount - 1);
      const viralScore = calculateViralScore({ ...post, commentCount });
      await tx.post.update({
        where: { id: comment.postId },
        data: { commentCount, viralScore },
      });
    }
  });
}
