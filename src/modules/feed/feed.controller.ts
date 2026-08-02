import type { Request, Response } from "express";
import { AppError } from "../../shared/utils/utils.ts";
import * as feedService from "./feed.service.ts";
import {
  createPostSchema,
  updatePostSchema,
  feedQuerySchema,
  searchQuerySchema,
  paginationQuerySchema,
  createCommentSchema,
  updateCommentSchema,
} from "./feed.validator.ts";

function handleError(res: Response, error: unknown): void {
  if (error instanceof AppError) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(error);
  res.status(500).json({ error: "Internal server error" });
}

function parseId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function createPost(req: Request, res: Response) {
  const parsed = createPostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const post = await feedService.createPost(req.user!.id, parsed.data);
    res.status(201).json({ data: post });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getFeed(req: Request, res: Response) {
  const parsed = feedQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const result = await feedService.getFeed(parsed.data);
    res.json({ data: result.items, meta: result.pagination });
  } catch (error) {
    handleError(res, error);
  }
}

export async function searchPosts(req: Request, res: Response) {
  const parsed = searchQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const result = await feedService.searchPosts(parsed.data);
    res.json({ data: result.items, meta: result.pagination });
  } catch (error) {
    handleError(res, error);
  }
}

export async function updatePost(req: Request, res: Response) {
  const id = parseId(req.params["id"]);
  if (id === null) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const parsed = updatePostSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const post = await feedService.updatePost(req.user!.id, id, parsed.data);
    res.json({ data: post });
  } catch (error) {
    handleError(res, error);
  }
}

export async function deletePost(req: Request, res: Response) {
  const id = parseId(req.params["id"]);
  if (id === null) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  try {
    await feedService.deletePost(req.user!.id, id);
    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
}

export async function likePost(req: Request, res: Response) {
  const id = parseId(req.params["id"]);
  if (id === null) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  try {
    const post = await feedService.likePost(req.user!.id, id);
    res.status(201).json({ data: post });
  } catch (error) {
    handleError(res, error);
  }
}

export async function unlikePost(req: Request, res: Response) {
  const id = parseId(req.params["id"]);
  if (id === null) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  try {
    const post = await feedService.unlikePost(req.user!.id, id);
    res.json({ data: post });
  } catch (error) {
    handleError(res, error);
  }
}

export async function createComment(req: Request, res: Response) {
  const id = parseId(req.params["id"]);
  if (id === null) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const parsed = createCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const comment = await feedService.addComment(req.user!.id, id, parsed.data);
    res.status(201).json({ data: comment });
  } catch (error) {
    handleError(res, error);
  }
}

export async function getComments(req: Request, res: Response) {
  const id = parseId(req.params["id"]);
  if (id === null) {
    res.status(400).json({ error: "Invalid post ID" });
    return;
  }

  const parsed = paginationQuerySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const result = await feedService.getComments(id, parsed.data);
    res.json({ data: result.items, meta: result.pagination });
  } catch (error) {
    handleError(res, error);
  }
}

export async function updateComment(req: Request, res: Response) {
  const id = parseId(req.params["id"]);
  if (id === null) {
    res.status(400).json({ error: "Invalid comment ID" });
    return;
  }

  const parsed = updateCommentSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.issues });
    return;
  }

  try {
    const comment = await feedService.updateComment(req.user!.id, id, parsed.data);
    res.json({ data: comment });
  } catch (error) {
    handleError(res, error);
  }
}

export async function deleteComment(req: Request, res: Response) {
  const id = parseId(req.params["id"]);
  if (id === null) {
    res.status(400).json({ error: "Invalid comment ID" });
    return;
  }

  try {
    await feedService.deleteComment(req.user!.id, id);
    res.status(204).send();
  } catch (error) {
    handleError(res, error);
  }
}
