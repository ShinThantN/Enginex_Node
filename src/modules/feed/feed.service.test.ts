import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as feedService from "./feed.service.ts";
import { prisma, Prisma } from "../../shared/config/index.ts";

type AsyncMock<T = unknown> = jest.Mock<(...args: unknown[]) => Promise<T>>;
const asAsync = <T = unknown>(fn: unknown) => fn as AsyncMock<T>;
const asMock = (fn: unknown) => fn as jest.Mock;

jest.mock("../../shared/config/index.ts", () => {
  class MockPrismaClientKnownRequestError extends Error {
    code: string;
    constructor(message: string, params: { code: string; clientVersion?: string }) {
      super(message);
      this.code = params.code;
    }
  }

  return {
    prisma: {
      post: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      postLike: {
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      postComment: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
        count: jest.fn(),
      },
      postStat: { deleteMany: jest.fn() },
      $transaction: jest.fn(),
    },
    Prisma: {
      PrismaClientKnownRequestError: MockPrismaClientKnownRequestError,
    },
  };
});

/** Run `prisma.$transaction(cb)` immediately with the mocked client as the tx. */
function runTransactionInline() {
  asMock(prisma.$transaction).mockImplementation(async (arg: unknown) => {
    if (typeof arg === "function") {
      return (arg as (tx: typeof prisma) => unknown)(prisma);
    }
    return Promise.all(arg as unknown[]);
  });
}

describe("Feed Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runTransactionInline();
  });

  describe("createPost", () => {
    it("persists the post and surfaces the author relationally", async () => {
      const createdAt = new Date();
      const created = {
        id: 1,
        userId: 12,
        title: "Hello",
        content: "World",
        imageUrl: null,
        visibility: "PUBLIC",
        likeCount: 0,
        commentCount: 0,
        viralScore: 0,
        createdAt,
        updatedAt: createdAt,
        user: { id: 12, fullName: "Eng", profileImage: null, role: "ENGINEER" },
      };
      asAsync(prisma.post.create).mockResolvedValue(created);

      const result = await feedService.createPost(12, {
        title: "Hello",
        content: "World",
        visibility: "PUBLIC",
      });

      expect(prisma.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 12,
            title: "Hello",
            content: "World",
            visibility: "PUBLIC",
            imageUrl: null,
          }),
        }),
      );
      expect(result.authorId).toBe(12);
      expect(result.author).toEqual(created.user);
      expect(result).not.toHaveProperty("userId");
      expect(result).not.toHaveProperty("user");
    });
  });

  describe("getFeed", () => {
    it("orders by stored viralScore then createdAt when trending", async () => {
      asAsync(prisma.post.findMany).mockResolvedValue([]);
      asAsync(prisma.post.count).mockResolvedValue(0);

      await feedService.getFeed({ page: 1, limit: 10, sort: "trending" });

      const arg = asMock(prisma.post.findMany).mock.calls[0]![0] as {
        orderBy: unknown;
        where: unknown;
      };
      expect(arg.orderBy).toEqual([{ viralScore: "desc" }, { createdAt: "desc" }]);
      expect(arg.where).toEqual({ visibility: "PUBLIC" });
    });

    it("orders by createdAt when latest", async () => {
      asAsync(prisma.post.findMany).mockResolvedValue([]);
      asAsync(prisma.post.count).mockResolvedValue(0);

      await feedService.getFeed({ page: 2, limit: 5, sort: "latest" });

      const arg = asMock(prisma.post.findMany).mock.calls[0]![0] as {
        orderBy: unknown;
        skip: number;
        take: number;
      };
      expect(arg.orderBy).toEqual([{ createdAt: "desc" }]);
      expect(arg.skip).toBe(5);
      expect(arg.take).toBe(5);
    });
  });

  describe("searchPosts", () => {
    it("builds an OR filter across title and content", async () => {
      asAsync(prisma.post.findMany).mockResolvedValue([]);
      asAsync(prisma.post.count).mockResolvedValue(0);

      const result = await feedService.searchPosts({ q: "bridge", page: 1, limit: 10 });

      const arg = asMock(prisma.post.findMany).mock.calls[0]![0] as {
        where: { OR: unknown };
      };
      expect(arg.where.OR).toEqual([
        { title: { contains: "bridge" } },
        { content: { contains: "bridge" } },
      ]);
      expect(result.pagination).toEqual({ page: 1, limit: 10, total: 0, totalPages: 0 });
    });
  });

  describe("likePost", () => {
    it("increments likeCount and recomputes viralScore", async () => {
      const createdAt = new Date();
      asAsync(prisma.post.findUnique).mockResolvedValue({
        likeCount: 2,
        commentCount: 0,
        offerCount: 0,
        acceptedContractCount: 0,
        createdAt,
      });
      asAsync(prisma.postLike.create).mockResolvedValue({});
      asAsync(prisma.post.update).mockResolvedValue({
        id: 1,
        userId: 9,
        title: "t",
        content: "c",
        imageUrl: null,
        visibility: "PUBLIC",
        likeCount: 3,
        commentCount: 0,
        viralScore: 1,
        createdAt,
        updatedAt: createdAt,
        user: { id: 9, fullName: "A", profileImage: null, role: "CLIENT" },
      });

      const result = await feedService.likePost(9, 1);

      const updateArg = asMock(prisma.post.update).mock.calls[0]![0] as {
        data: { likeCount: number; viralScore: number };
      };
      expect(updateArg.data.likeCount).toBe(3);
      expect(updateArg.data.viralScore).toBeGreaterThan(0);
      expect(result.authorId).toBe(9);
    });

    it("rejects a duplicate like with 409", async () => {
      asAsync(prisma.post.findUnique).mockResolvedValue({
        likeCount: 1,
        commentCount: 0,
        offerCount: 0,
        acceptedContractCount: 0,
        createdAt: new Date(),
      });
      asAsync(prisma.postLike.create).mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "test",
        }),
      );

      await expect(feedService.likePost(5, 1)).rejects.toThrow(
        expect.objectContaining({ statusCode: 409 }),
      );
    });

    it("returns 404 when the post does not exist", async () => {
      asAsync(prisma.post.findUnique).mockResolvedValue(null);

      await expect(feedService.likePost(5, 999)).rejects.toThrow(
        expect.objectContaining({ statusCode: 404 }),
      );
    });
  });

  describe("unlikePost", () => {
    it("returns 409 when the user has not liked the post", async () => {
      asAsync(prisma.post.findUnique).mockResolvedValue({
        likeCount: 0,
        commentCount: 0,
        offerCount: 0,
        acceptedContractCount: 0,
        createdAt: new Date(),
      });
      asAsync(prisma.postLike.findUnique).mockResolvedValue(null);

      await expect(feedService.unlikePost(5, 1)).rejects.toThrow(
        expect.objectContaining({ statusCode: 409 }),
      );
    });
  });

  describe("addComment", () => {
    it("increments commentCount, recomputes score, and returns the comment", async () => {
      const createdAt = new Date();
      asAsync(prisma.post.findUnique).mockResolvedValue({
        likeCount: 0,
        commentCount: 1,
        offerCount: 0,
        acceptedContractCount: 0,
        createdAt,
      });
      asAsync(prisma.postComment.create).mockResolvedValue({
        id: 5,
        postId: 3,
        userId: 8,
        comment: "nice",
        createdAt,
        user: { id: 8, fullName: "C", profileImage: null, role: "CLIENT" },
      });
      asAsync(prisma.post.update).mockResolvedValue({});

      const result = await feedService.addComment(8, 3, { comment: "nice" });

      const updateArg = asMock(prisma.post.update).mock.calls[0]![0] as {
        data: { commentCount: number; viralScore: number };
      };
      expect(updateArg.data.commentCount).toBe(2);
      expect(updateArg.data.viralScore).toBeGreaterThan(0);
      expect(result.authorId).toBe(8);
      expect(result.comment).toBe("nice");
    });
  });

  describe("updatePost", () => {
    it("returns 404 when the post is missing", async () => {
      asAsync(prisma.post.findUnique).mockResolvedValue(null);

      await expect(
        feedService.updatePost(1, 1, { title: "x" }),
      ).rejects.toThrow(expect.objectContaining({ statusCode: 404 }));
    });

    it("forbids editing another user's post", async () => {
      asAsync(prisma.post.findUnique).mockResolvedValue({ id: 1, userId: 99 });

      await expect(
        feedService.updatePost(1, 1, { title: "x" }),
      ).rejects.toThrow(expect.objectContaining({ statusCode: 403 }));
    });
  });

  describe("deleteComment", () => {
    it("forbids deleting another user's comment", async () => {
      asAsync(prisma.postComment.findUnique).mockResolvedValue({
        id: 1,
        userId: 77,
        postId: 3,
      });

      await expect(feedService.deleteComment(1, 1)).rejects.toThrow(
        expect.objectContaining({ statusCode: 403 }),
      );
    });
  });
});
