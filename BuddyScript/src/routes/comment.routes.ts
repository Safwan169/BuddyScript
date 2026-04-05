import { Router } from "express";
import {
  createComment,
  getComments,
  updateComment,
  deleteComment,
  likeComment,
  unlikeComment,
  getCommentLikes,
  createReply,
  getReplies,
  updateReply,
  deleteReply,
  likeReply,
  unlikeReply,
  getReplyLikes,
} from "../controllers/comment.controller";
import { validateRequest } from "../middleware/validateRequest";
import { authenticate } from "../middleware/auth";
import {
  createCommentSchema,
  updateCommentSchema,
  getCommentSchema,
  getCommentsSchema,
  createReplySchema,
  getRepliesSchema,
} from "../validators/comment.validator";
import {
  socialReadRateLimiter,
  socialWriteRateLimiter,
} from "../middleware/rateLimit";
import { z } from "zod";
const objectIdRegex = /^[a-f\d]{24}$/i;

const router = Router();

router.use(authenticate);

router.post("/posts/:postId/comments", socialWriteRateLimiter, validateRequest(createCommentSchema), createComment);
router.get("/posts/:postId/comments", socialReadRateLimiter, validateRequest(getCommentsSchema), getComments);

router.put("/comments/:id", socialWriteRateLimiter, validateRequest(updateCommentSchema), updateComment);
router.delete("/comments/:id", socialWriteRateLimiter, validateRequest(getCommentSchema), deleteComment);

router.post("/comments/:id/like", socialWriteRateLimiter, validateRequest(getCommentSchema), likeComment);
router.delete("/comments/:id/like", socialWriteRateLimiter, validateRequest(getCommentSchema), unlikeComment);
router.get("/comments/:id/likes", socialReadRateLimiter, validateRequest(getCommentSchema), getCommentLikes);

router.post("/comments/:commentId/replies", socialWriteRateLimiter, validateRequest(createReplySchema), createReply);
router.get("/comments/:commentId/replies", socialReadRateLimiter, validateRequest(getRepliesSchema), getReplies);

router.put(
  "/replies/:id",
  socialWriteRateLimiter,
  validateRequest(
    z.object({
      params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid reply id') }),
      body: z.object({ content: z.string().min(1).max(1000).trim() }),
    })
  ),
  updateReply
);

router.delete(
  "/replies/:id",
  socialWriteRateLimiter,
  validateRequest(
    z.object({ params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid reply id') }) })
  ),
  deleteReply
);

router.post(
  "/replies/:id/like",
  socialWriteRateLimiter,
  validateRequest(
    z.object({ params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid reply id') }) })
  ),
  likeReply
);

router.delete(
  "/replies/:id/like",
  socialWriteRateLimiter,
  validateRequest(
    z.object({ params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid reply id') }) })
  ),
  unlikeReply
);

router.get(
  "/replies/:id/likes",
  socialReadRateLimiter,
  validateRequest(
    z.object({ params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid reply id') }) })
  ),
  getReplyLikes
);

export default router;

