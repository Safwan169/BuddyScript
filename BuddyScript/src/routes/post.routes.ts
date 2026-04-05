import { Router } from "express";
import {
  createPost,
  getFeed,
  getPost,
  updatePost,
  deletePost,
  likePost,
  unlikePost,
  getPostLikes,
} from "../controllers/post.controller";
import { validateRequest } from "../middleware/validateRequest";
import { authenticate } from "../middleware/auth";
import {
  createPostSchema,
  updatePostSchema,
  getPostSchema,
  getFeedSchema,
} from "../validators/post.validator";
import {
  feedReadRateLimiter,
  socialReadRateLimiter,
  socialWriteRateLimiter,
} from "../middleware/rateLimit";

const router = Router();

router.use(authenticate);

router
  .route("/")
  .post(socialWriteRateLimiter, validateRequest(createPostSchema), createPost)
  .get(feedReadRateLimiter, validateRequest(getFeedSchema), getFeed);

router
  .route("/:id")
  .get(socialReadRateLimiter, validateRequest(getPostSchema), getPost)
  .put(socialWriteRateLimiter, validateRequest(updatePostSchema), updatePost)
  .delete(socialWriteRateLimiter, validateRequest(getPostSchema), deletePost);

router.post("/:id/like", socialWriteRateLimiter, validateRequest(getPostSchema), likePost);
router.delete("/:id/like", socialWriteRateLimiter, validateRequest(getPostSchema), unlikePost);
router.get("/:id/likes", socialReadRateLimiter, validateRequest(getPostSchema), getPostLikes);

export default router;

