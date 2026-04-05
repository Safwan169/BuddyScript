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
import { z } from "zod";
const objectIdRegex = /^[a-f\d]{24}$/i;

const router = Router();

router.use(authenticate);

router.post("/posts/:postId/comments", validateRequest(createCommentSchema), createComment);
router.get("/posts/:postId/comments", validateRequest(getCommentsSchema), getComments);

router.put("/comments/:id", validateRequest(updateCommentSchema), updateComment);
router.delete("/comments/:id", validateRequest(getCommentSchema), deleteComment);

router.post("/comments/:id/like", validateRequest(getCommentSchema), likeComment);
router.delete("/comments/:id/like", validateRequest(getCommentSchema), unlikeComment);
router.get("/comments/:id/likes", validateRequest(getCommentSchema), getCommentLikes);

router.post("/comments/:commentId/replies", validateRequest(createReplySchema), createReply);
router.get("/comments/:commentId/replies", validateRequest(getRepliesSchema), getReplies);

router.put(
  "/replies/:id",
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
  validateRequest(
    z.object({ params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid reply id') }) })
  ),
  deleteReply
);

router.post(
  "/replies/:id/like",
  validateRequest(
    z.object({ params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid reply id') }) })
  ),
  likeReply
);

router.delete(
  "/replies/:id/like",
  validateRequest(
    z.object({ params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid reply id') }) })
  ),
  unlikeReply
);

router.get(
  "/replies/:id/likes",
  validateRequest(
    z.object({ params: z.object({ id: z.string().regex(objectIdRegex, 'Invalid reply id') }) })
  ),
  getReplyLikes
);

export default router;

