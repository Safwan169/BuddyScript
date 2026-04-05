import { Request, Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { Post } from '../models/Post.model';
import { Like } from '../models/Like.model';
import { Comment } from '../models/Comment.model';
import { config } from '../config/env';
import { runInTransaction } from '../utils/dbTx';
import {
  addBeforeCursorFilter,
  buildCursorPage,
  parseCursor,
  parseLimit,
} from '../utils/cursor';
import { resolveImageInputToUrl } from '../services/mediaStorage';
import { getCachedJson, invalidateCachePrefixes, setCachedJson } from '../services/cache';
import { enqueueMediaProcessingJob } from '../services/mediaJobs';

const getAuthorId = (post: any): string => {
  if (!post.author) {
    return '';
  }

  if (typeof post.author === 'string') {
    return post.author;
  }

  if (post.author instanceof mongoose.Types.ObjectId) {
    return post.author.toString();
  }

  return (post.author._id || post.author.id || '').toString();
};

const canUserViewPost = (post: any, userId: string): boolean => {
  const authorId = getAuthorId(post);
  return post.visibility === 'public' || authorId === userId;
};

const normalizeAuthor = (author: any) => {
  if (!author) {
    return null;
  }

  if (typeof author === 'string' || author instanceof mongoose.Types.ObjectId) {
    return { id: author.toString() };
  }

  return {
    id: (author._id || author.id || '').toString(),
    firstName: author.firstName,
    lastName: author.lastName,
    email: author.email,
  };
};

const normalizeLocalImageUrl = (imageUrl?: string): string | undefined => {
  if (!imageUrl) {
    return undefined;
  }

  const trimmed = imageUrl.trim();
  if (!trimmed) {
    return undefined;
  }

  if (trimmed.startsWith('/uploads/')) {
    return `${config.appBaseUrl}${trimmed}`;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  try {
    const parsed = new URL(trimmed);
    const base = new URL(config.appBaseUrl);
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isLocalUploadPath = parsed.pathname.startsWith('/uploads/');

    if (!isLocalHost || !isLocalUploadPath) {
      return trimmed;
    }

    parsed.protocol = base.protocol;
    parsed.hostname = base.hostname;
    parsed.port = base.port;
    return parsed.toString();
  } catch (_error) {
    return trimmed;
  }
};

const normalizePost = (post: any, likedByCurrentUser: boolean, userReaction?: string) => ({
  id: (post._id || post.id).toString(),
  content: post.content,
  imageUrl: normalizeLocalImageUrl(post.imageUrl),
  visibility: post.visibility,
  likeCount: post.likeCount || 0,
  commentCount: post.commentCount || 0,
  createdAt: post.createdAt,
  updatedAt: post.updatedAt,
  likedByCurrentUser,
  userReaction: likedByCurrentUser ? (userReaction || 'like') : null,
  author: normalizeAuthor(post.author),
});

const normalizeFeedPayloadFromCache = (payload: { posts: any[]; nextCursor: any }) => ({
  ...payload,
  posts: Array.isArray(payload.posts)
    ? payload.posts.map((post) => ({
        ...post,
        imageUrl: normalizeLocalImageUrl(post.imageUrl),
      }))
    : [],
});

const normalizeLikeUsers = (likes: any[]) =>
  likes
    .filter((like) => like.user)
    .map((like: any) => ({
      id: (like.user._id || like.user.id).toString(),
      firstName: like.user.firstName,
      lastName: like.user.lastName,
      email: like.user.email,
      reactionType: like.reactionType || 'like',
    }));

const cacheKeys = {
  feed: (userId: string, limit: number) => `feed:user:${userId}:limit:${limit}`,
  feedPrefix: (userId: string) => `feed:user:${userId}:`,
  postLikes: (postId: string, limit: number) => `post-likes:${postId}:limit:${limit}`,
  postLikesPrefix: (postId: string) => `post-likes:${postId}:`,
};

const ensurePostAndAccess = async (postId: string, userId: string) => {
  const post = await Post.findById(postId).populate('author', 'firstName lastName email').lean();

  if (!post) {
    throw new AppError(404, 'Post not found');
  }

  if (!canUserViewPost(post, userId)) {
    throw new AppError(403, 'You are not allowed to view this post');
  }

  return post;
};

const ensurePostAccessOnly = async (postId: string, userId: string) => {
  const post = await Post.findById(postId).select('author visibility').lean();

  if (!post) {
    throw new AppError(404, 'Post not found');
  }

  if (!canUserViewPost(post, userId)) {
    throw new AppError(403, 'You are not allowed to view this post');
  }

  return post;
};

export const createPost = asyncHandler(async (req: Request, res: Response) => {
  const { content, imageUrl, visibility } = req.body;

  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const resolvedImageUrl = await resolveImageInputToUrl(imageUrl);
  if (resolvedImageUrl) {
    await enqueueMediaProcessingJob(resolvedImageUrl, 'post-create');
  }

  const post = await Post.create({
    author: req.user.id,
    content,
    imageUrl: resolvedImageUrl,
    visibility: visibility || 'public',
  });

  const created = await Post.findById(post._id)
    .populate('author', 'firstName lastName email')
    .lean();

  const response: ApiResponse = {
    success: true,
    message: 'Post created successfully',
    data: created ? normalizePost(created, false) : null,
  };

  await invalidateCachePrefixes([cacheKeys.feedPrefix(req.user.id)]);

  res.status(201).json(response);
});

export const getFeed = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const limit = parseLimit(req.query.limit, 10, 50);
  const cursor = parseCursor(req.query.before, req.query.beforeId);
  const userId = req.user.id;

  const baseFilter: Record<string, any> = {
    $or: [{ visibility: 'public' }, { author: new Types.ObjectId(userId) }],
  };
  const canUseCache = !cursor;
  const feedCacheKey = cacheKeys.feed(userId, limit);

  if (canUseCache) {
    const cachedPayload = await getCachedJson<{ posts: any[]; nextCursor: any }>(feedCacheKey);
    if (cachedPayload) {
      const normalizedCachedPayload = normalizeFeedPayloadFromCache(cachedPayload);
      const response: ApiResponse = {
        success: true,
        message: 'Feed retrieved successfully',
        data: normalizedCachedPayload,
      };

      res.status(200).json(response);
      return;
    }
  }

  const filter = addBeforeCursorFilter(baseFilter, cursor);

  const rows = await Post.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('author', 'firstName lastName email')
    .lean();

  const page = buildCursorPage(rows, limit);

  const postIds = page.items.map((post) => post._id);
  const likedRows = postIds.length
    ? await Like.find({
        user: req.user.id,
        targetType: 'post',
        targetId: { $in: postIds },
      })
        .select('targetId reactionType')
        .lean()
    : [];

  const likedReactionMap = new Map<string, string>(
    likedRows.map((row) => [row.targetId.toString(), (row as any).reactionType || 'like'])
  );

  const normalizedPosts = page.items.map((post) => {
    const key = post._id.toString();
    return normalizePost(post, likedReactionMap.has(key), likedReactionMap.get(key));
  });

  const response: ApiResponse = {
    success: true,
    message: 'Feed retrieved successfully',
    data: {
      posts: normalizedPosts,
      nextCursor: page.nextCursor,
    },
  };

  if (canUseCache) {
    await setCachedJson(feedCacheKey, response.data);
  }

  res.status(200).json(response);
});

export const getPost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const post = await ensurePostAndAccess(req.params.id, req.user.id);

  const existingLike = await Like.findOne({
    user: req.user.id,
    targetType: 'post',
    targetId: req.params.id,
  }).select('reactionType').lean();

  const likedByCurrentUser = Boolean(existingLike);

  const response: ApiResponse = {
    success: true,
    message: 'Post retrieved successfully',
    data: normalizePost(post, likedByCurrentUser, (existingLike as any)?.reactionType),
  };

  res.status(200).json(response);
});

export const updatePost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const post = await Post.findById(req.params.id);

  if (!post) {
    throw new AppError(404, 'Post not found');
  }

  if (post.author.toString() !== req.user.id) {
    throw new AppError(403, 'You are not allowed to edit this post');
  }

  const { content, imageUrl, visibility } = req.body;

  if (content !== undefined) {
    post.content = content;
  }

  if (imageUrl !== undefined) {
    const nextImageUrl = await resolveImageInputToUrl(imageUrl);
    post.imageUrl = nextImageUrl;

    if (nextImageUrl) {
      await enqueueMediaProcessingJob(nextImageUrl, 'post-update');
    }
  }

  if (visibility !== undefined) {
    post.visibility = visibility;
  }

  await post.save();

  const updated = await Post.findById(post._id)
    .populate('author', 'firstName lastName email')
    .lean();

  const likedByCurrentUser = Boolean(
    await Like.exists({
      user: req.user.id,
      targetType: 'post',
      targetId: req.params.id,
    })
  );

  const response: ApiResponse = {
    success: true,
    message: 'Post updated successfully',
    data: updated ? normalizePost(updated, likedByCurrentUser) : null,
  };

  await invalidateCachePrefixes([cacheKeys.feedPrefix(req.user.id), cacheKeys.postLikesPrefix(req.params.id)]);

  res.status(200).json(response);
});

export const deletePost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const post = await Post.findById(req.params.id).select('author');

  if (!post) {
    throw new AppError(404, 'Post not found');
  }

  if (post.author.toString() !== req.user.id) {
    throw new AppError(403, 'You are not allowed to delete this post');
  }

  const relatedComments = await Comment.find({ post: post._id })
    .select('_id parentComment')
    .lean();

  const replyIds = relatedComments
    .filter((comment) => Boolean(comment.parentComment))
    .map((comment) => comment._id);

  const likeConditions: Record<string, any>[] = [{ targetType: 'post', targetId: post._id }];

  const commentIds = relatedComments
    .filter((comment) => !comment.parentComment)
    .map((comment) => comment._id);

  if (commentIds.length > 0) {
    likeConditions.push({ targetType: 'comment', targetId: { $in: commentIds } });
  }

  if (replyIds.length > 0) {
    likeConditions.push({ targetType: 'reply', targetId: { $in: replyIds } });
  }

  await Promise.all([
    Like.deleteMany({ $or: likeConditions }),
    Comment.deleteMany({ post: post._id }),
    Post.deleteOne({ _id: post._id }),
  ]);

  const response: ApiResponse = {
    success: true,
    message: 'Post deleted successfully',
    data: null,
  };

  await invalidateCachePrefixes([cacheKeys.feedPrefix(req.user.id), cacheKeys.postLikesPrefix(req.params.id)]);

  res.status(200).json(response);
});

export const likePost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  await ensurePostAccessOnly(req.params.id, req.user.id);

  const reactionType: string = (req.body?.reactionType as string) || 'like';

  const data = await runInTransaction(async (session) => {
    let created = false;

    try {
      await Like.create(
        [
          {
            user: req.user!.id,
            targetType: 'post',
            targetId: req.params.id,
            reactionType,
          },
        ],
        session ? { session } : undefined
      );
      created = true;
    } catch (error: any) {
      if (error?.code !== 11000) {
        throw error;
      }
      // Already liked — update reaction type in place
      await Like.updateOne(
        { user: req.user!.id, targetType: 'post', targetId: req.params.id },
        { reactionType },
        session ? { session } : undefined
      );
    }

    if (created) {
      await Post.updateOne(
        { _id: req.params.id },
        { $inc: { likeCount: 1 } },
        session ? { session } : undefined
      );
    }

    const query = Post.findById(req.params.id).select('likeCount').lean();
    if (session) {
      query.session(session);
    }

    const post = await query;

    return {
      liked: true,
      likeCount: post?.likeCount || 0,
      reactionType,
    };
  });

  const response: ApiResponse = {
    success: true,
    message: 'Post liked successfully',
    data,
  };

  await invalidateCachePrefixes([cacheKeys.feedPrefix(req.user.id), cacheKeys.postLikesPrefix(req.params.id)]);

  res.status(200).json(response);
});

export const unlikePost = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  await ensurePostAccessOnly(req.params.id, req.user.id);

  const data = await runInTransaction(async (session) => {
    const deleted = await Like.deleteOne(
      {
        user: req.user!.id,
        targetType: 'post',
        targetId: req.params.id,
      },
      session ? { session } : undefined
    );

    if (deleted.deletedCount && deleted.deletedCount > 0) {
      await Post.updateOne(
        { _id: req.params.id, likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1 } },
        session ? { session } : undefined
      );
    }

    const query = Post.findById(req.params.id).select('likeCount').lean();
    if (session) {
      query.session(session);
    }

    const post = await query;

    return {
      liked: false,
      likeCount: post?.likeCount || 0,
    };
  });

  const response: ApiResponse = {
    success: true,
    message: 'Post unliked successfully',
    data,
  };

  await invalidateCachePrefixes([cacheKeys.feedPrefix(req.user.id), cacheKeys.postLikesPrefix(req.params.id)]);

  res.status(200).json(response);
});

export const getPostLikes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  await ensurePostAccessOnly(req.params.id, req.user.id);

  const legacyPageQuery = typeof req.query.page === 'string';
  const limit = parseLimit(req.query.limit, 20, 100);
  const page = parseLimit(req.query.page, 1, 100000);
  const cursor = parseCursor(req.query.before, req.query.beforeId);
  const allowLegacyPageMode = config.enableLegacyPagePagination;
  const canUseCache = !legacyPageQuery && !cursor;
  const likesCacheKey = cacheKeys.postLikes(req.params.id, limit);

  if (!allowLegacyPageMode && legacyPageQuery && !cursor) {
    throw new AppError(400, 'Page-based pagination is disabled. Use cursor-based pagination.');
  }

  if (allowLegacyPageMode && legacyPageQuery && !cursor) {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      Like.find({ targetType: 'post', targetId: req.params.id })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName email')
        .lean(),
      Like.countDocuments({ targetType: 'post', targetId: req.params.id }),
    ]);

    const response: ApiResponse = {
      success: true,
      message: 'Post likes retrieved successfully',
      data: {
        users: normalizeLikeUsers(likes),
        nextCursor: null,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    };

    res.status(200).json(response);
    return;
  }

  if (canUseCache) {
    const cachedPayload = await getCachedJson<{ users: any[]; nextCursor: any }>(likesCacheKey);
    if (cachedPayload) {
      const response: ApiResponse = {
        success: true,
        message: 'Post likes retrieved successfully',
        data: cachedPayload,
      };

      res.status(200).json(response);
      return;
    }
  }

  const baseFilter: Record<string, any> = {
    targetType: 'post',
    targetId: new Types.ObjectId(req.params.id),
  };
  const filter = addBeforeCursorFilter(baseFilter, cursor);

  const rows = await Like.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('user', 'firstName lastName email')
    .lean();

  const likesPage = buildCursorPage(rows, limit);

  const response: ApiResponse = {
    success: true,
    message: 'Post likes retrieved successfully',
    data: {
      users: normalizeLikeUsers(likesPage.items),
      nextCursor: likesPage.nextCursor,
    },
  };

  if (canUseCache) {
    await setCachedJson(likesCacheKey, response.data);
  }

  res.status(200).json(response);
});
