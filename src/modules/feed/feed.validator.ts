import { z } from "zod";

export const createPostSchema = z.object({
  title: z
    .string()
    .trim()
    .min(3, "title must be at least 3 characters long")
    .max(255, "title must be at most 255 characters long"),
  content: z
    .string()
    .trim()
    .min(1, "content is required")
    .max(5000, "content must be at most 5000 characters long"),
  visibility: z.enum(["PUBLIC", "PRIVATE"]).default("PUBLIC"),
  imageUrl: z.string().url().max(500).optional(),
});

export const updatePostSchema = z
  .object({
    title: z.string().trim().min(3).max(255),
    content: z.string().trim().min(1).max(5000),
    visibility: z.enum(["PUBLIC", "PRIVATE"]),
    imageUrl: z.string().url().max(500),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: "At least one field must be provided",
  });

export const feedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  sort: z.enum(["latest", "trending"]).default("latest"),
});

export const searchQuerySchema = z.object({
  q: z.string().trim().min(1, "search query is required"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const createCommentSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, "comment is required")
    .max(2000, "comment must be at most 2000 characters long"),
});

export const updateCommentSchema = z.object({
  comment: z
    .string()
    .trim()
    .min(1, "comment is required")
    .max(2000, "comment must be at most 2000 characters long"),
});

export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type FeedQueryInput = z.infer<typeof feedQuerySchema>;
export type SearchQueryInput = z.infer<typeof searchQuerySchema>;
export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
