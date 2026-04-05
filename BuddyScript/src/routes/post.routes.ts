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

const router = Router();

router.use(authenticate);

router.route("/").post(validateRequest(createPostSchema), createPost).get(validateRequest(getFeedSchema), getFeed);

router
  .route("/:id")
  .get(validateRequest(getPostSchema), getPost)
  .put(validateRequest(updatePostSchema), updatePost)
  .delete(validateRequest(getPostSchema), deletePost);

router.post("/:id/like", validateRequest(getPostSchema), likePost);
router.delete("/:id/like", validateRequest(getPostSchema), unlikePost);
router.get("/:id/likes", validateRequest(getPostSchema), getPostLikes);

export default router;

