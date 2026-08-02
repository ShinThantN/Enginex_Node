import express from "express";
import { authenticateUser, requireRole } from "../../shared/middlewares/index.ts";
import * as feedController from "./feed.controller.ts";

// Mounted at /api/posts
const postsRouter = express.Router();

// Every feed interaction requires an authenticated user.
postsRouter.use(authenticateUser);

// Reads — available to all authenticated roles (client, engineer, team).
postsRouter.get("/feed", feedController.getFeed);
postsRouter.get("/search", feedController.searchPosts);
postsRouter.get("/:id/comments", feedController.getComments);

// Create a post — engineers and teams only.
// (Clients create project posts through the Project module, not here.)
postsRouter.post("/", requireRole("ENGINEER", "COMPANY"), feedController.createPost);

// Update / delete a post — ownership is enforced in the service layer.
postsRouter.patch("/:id", feedController.updatePost);
postsRouter.delete("/:id", feedController.deletePost);

// Likes — one per user, enforced by a unique constraint.
postsRouter.post("/:id/like", feedController.likePost);
postsRouter.delete("/:id/like", feedController.unlikePost);

// Comments on a post.
postsRouter.post("/:id/comments", feedController.createComment);

// Mounted at /api/comments
const commentsRouter = express.Router();

commentsRouter.use(authenticateUser);

// Update / delete a comment — ownership is enforced in the service layer.
commentsRouter.patch("/:id", feedController.updateComment);
commentsRouter.delete("/:id", feedController.deleteComment);

export { postsRouter, commentsRouter };
export default postsRouter;
