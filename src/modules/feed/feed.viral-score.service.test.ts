import { describe, expect, it } from "@jest/globals";
import {
  calculateBaseScore,
  calculateViralScore,
} from "./feed.viral-score.service.ts";

describe("Viral Score Service", () => {
  describe("calculateBaseScore", () => {
    it("applies the documented weights (1 / 4 / 12 / 30)", () => {
      const base = calculateBaseScore({
        likeCount: 3,
        commentCount: 2,
        offerCount: 1,
        acceptedContractCount: 1,
      });

      // 3*1 + 2*4 + 1*12 + 1*30 = 53
      expect(base).toBe(53);
    });

    it("returns 0 when there is no engagement", () => {
      expect(
        calculateBaseScore({
          likeCount: 0,
          commentCount: 0,
          offerCount: 0,
          acceptedContractCount: 0,
        }),
      ).toBe(0);
    });
  });

  describe("calculateViralScore", () => {
    const createdAt = new Date("2026-07-06T00:00:00.000Z");

    it("divides the base score by (hours + 2)^1.5 for a fresh post", () => {
      const score = calculateViralScore({
        likeCount: 10,
        commentCount: 0,
        offerCount: 0,
        acceptedContractCount: 0,
        createdAt,
        now: createdAt,
      });

      // base 10 / (0 + 2)^1.5 = 10 / 2.8284271 ≈ 3.5355339
      expect(score).toBeCloseTo(3.5355339, 5);
    });

    it("decays as the post ages", () => {
      const metrics = {
        likeCount: 10,
        commentCount: 0,
        offerCount: 0,
        acceptedContractCount: 0,
        createdAt,
      };

      const fresh = calculateViralScore({ ...metrics, now: createdAt });
      const sixHoursLater = calculateViralScore({
        ...metrics,
        now: new Date(createdAt.getTime() + 6 * 60 * 60 * 1000),
      });

      expect(sixHoursLater).toBeLessThan(fresh);
      // base 10 / (6 + 2)^1.5 = 10 / 22.627417 ≈ 0.4419417
      expect(sixHoursLater).toBeCloseTo(0.4419417, 5);
    });

    it("weights a comment 4x a like at the same age", () => {
      const oneComment = calculateViralScore({
        likeCount: 0,
        commentCount: 1,
        offerCount: 0,
        acceptedContractCount: 0,
        createdAt,
        now: createdAt,
      });
      const oneLike = calculateViralScore({
        likeCount: 1,
        commentCount: 0,
        offerCount: 0,
        acceptedContractCount: 0,
        createdAt,
        now: createdAt,
      });

      expect(oneComment).toBeCloseTo(oneLike * 4, 10);
    });

    it("is 0 for a post with no engagement", () => {
      expect(
        calculateViralScore({
          likeCount: 0,
          commentCount: 0,
          offerCount: 0,
          acceptedContractCount: 0,
          createdAt,
          now: createdAt,
        }),
      ).toBe(0);
    });
  });
});
