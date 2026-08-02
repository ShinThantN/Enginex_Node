import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import { feedEngagementService } from "./feed.engagement.service.ts";
import { prisma } from "../../shared/config/index.ts";

type AsyncMock<T = unknown> = jest.Mock<(...args: unknown[]) => Promise<T>>;
const asAsync = <T = unknown>(fn: unknown) => fn as AsyncMock<T>;
const asMock = (fn: unknown) => fn as jest.Mock;

jest.mock("../../shared/config/index.ts", () => ({
  prisma: {
    post: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  },
  Prisma: {},
}));

function runTransactionInline() {
  asMock(prisma.$transaction).mockImplementation(async (arg: unknown) =>
    (arg as (tx: typeof prisma) => unknown)(prisma),
  );
}

describe("Feed Engagement Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    runTransactionInline();
  });

  it("registerProjectOffer increments offerCount and recomputes the score", async () => {
    const createdAt = new Date();
    asAsync(prisma.post.findUnique).mockResolvedValue({
      likeCount: 0,
      commentCount: 0,
      offerCount: 1,
      acceptedContractCount: 0,
      createdAt,
    });
    asAsync(prisma.post.update).mockResolvedValue({});

    await feedEngagementService.registerProjectOffer(3);

    const arg = asMock(prisma.post.update).mock.calls[0]![0] as {
      data: { offerCount: number; viralScore: number };
    };
    expect(arg.data.offerCount).toBe(2);
    expect(arg.data.viralScore).toBeGreaterThan(0);
  });

  it("registerAcceptedContract increments acceptedContractCount", async () => {
    asAsync(prisma.post.findUnique).mockResolvedValue({
      likeCount: 0,
      commentCount: 0,
      offerCount: 0,
      acceptedContractCount: 0,
      createdAt: new Date(),
    });
    asAsync(prisma.post.update).mockResolvedValue({});

    await feedEngagementService.registerAcceptedContract(3);

    const arg = asMock(prisma.post.update).mock.calls[0]![0] as {
      data: { acceptedContractCount: number };
    };
    expect(arg.data.acceptedContractCount).toBe(1);
  });

  it("withdrawProjectOffer never drops the counter below zero", async () => {
    asAsync(prisma.post.findUnique).mockResolvedValue({
      likeCount: 0,
      commentCount: 0,
      offerCount: 0,
      acceptedContractCount: 0,
      createdAt: new Date(),
    });
    asAsync(prisma.post.update).mockResolvedValue({});

    await feedEngagementService.withdrawProjectOffer(3);

    const arg = asMock(prisma.post.update).mock.calls[0]![0] as {
      data: { offerCount: number };
    };
    expect(arg.data.offerCount).toBe(0);
  });

  it("throws 404 when the post does not exist", async () => {
    asAsync(prisma.post.findUnique).mockResolvedValue(null);

    await expect(
      feedEngagementService.registerProjectOffer(999),
    ).rejects.toThrow(expect.objectContaining({ statusCode: 404 }));
  });
});
