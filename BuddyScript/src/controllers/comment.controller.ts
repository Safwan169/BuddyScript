import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { ApiResponse } from '../types';
import { Post } from '../models/Post.model';
import { Comment } from '../models/Comment.model';
import { Like } from '../models/Like.model';
import { config } from '../config/env';
import { runInTransaction } from '../utils/dbTx';
import {
  addBeforeCursorFilter,
  buildCursorPage,
  parseCursor,
  parseLimit,
} from '../utils/cursor';
import { getCachedJson, invalidateCachePrefixes, setCachedJson } from '../services/cache';

const normalizeAuthor = (author: any) => {
  if (!author) {
    return null;
  }

  return {
    id: (author._id || author.id).toString(),
    firstName: author.firstName,
    lastName: author.lastName,
    email: author.email,
  };
};

const normalizeComment = (comment: any, likedByCurrentUser: boolean, userReaction?: string) => ({
  id: (comment._id || comment.id).toString(),
  postId: comment.post.toString(),
  parentCommentId: comment.parentComment ? comment.parentComment.toString() : null,
  content: comment.content,
  likeCount: comment.likeCount || 0,
  replyCount: comment.replyCount || 0,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  likedByCurrentUser,
  userReaction: likedByCurrentUser ? (userReaction || 'like') : null,
  author: normalizeAuthor(comment.author),
});

const ensurePostAccess = async (postId: Types.ObjectId | string, userId: string) => {
  const post = await Post.findById(postId).select('author visibility').lean();

  if (!post) {
    throw new AppError(404, 'Post not found');
  }

  const authorId = post.author.toString();
  const canView = post.visibility === 'public' || authorId === userId;

  if (!canView) {
    throw new AppError(403, 'You are not allowed to access this post');
  }

  return post;
};

const ensureTopLevelComment = async (commentId: string) => {
  const comment = await Comment.findById(commentId);

  if (!comment || comment.parentComment) {
    throw new AppError(404, 'Comment not found');
  }

  return comment;
};

const ensureReply = async (replyId: string) => {
  const reply = await Comment.findById(replyId);

  if (!reply || !reply.parentComment) {
    throw new AppError(404, 'Reply not found');
  }

  return reply;
};

const loadLikedIdSet = async (
  targetType: 'comment' | 'reply',
  targetIds: Types.ObjectId[],
  userId: string
): Promise<Map<string, string>> => {
  if (targetIds.length === 0) {
    return new Map<string, string>();
  }

  const likedRows = await Like.find({
    user: userId,
    targetType,
    targetId: { $in: targetIds },
  })
    .select('targetId reactionType')
    .lean();

  return new Map(likedRows.map((row) => [row.targetId.toString(), (row as any).reactionType || 'like']));
};

const normalizeLikeUsers = (likes: any[]) =>
  likes
    .map((like) => like.user)
    .filter(Boolean)
    .map((user: any) => ({
      id: (user._id || user.id).toString(),
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    }));

const cacheKeys = {
  comments: (postId: string, limit: number) => `comments:${postId}:limit:${limit}`,
  commentsPrefix: (postId: string) => `comments:${postId}:`,
  replies: (commentId: string, limit: number) => `replies:${commentId}:limit:${limit}`,
  repliesPrefix: (commentId: string) => `replies:${commentId}:`,
  likes: (targetType: 'comment' | 'reply', targetId: string, limit: number) =>
    `${targetType}-likes:${targetId}:limit:${limit}`,
  likesPrefix: (targetType: 'comment' | 'reply', targetId: string) => `${targetType}-likes:${targetId}:`,
  feedPrefix: (userId: string) => `feed:user:${userId}:`,
};

const invalidateCommentRelatedCaches = async ({
  postId,
  commentId,
  replyId,
  userId,
}: {
  postId: string;
  commentId?: string;
  replyId?: string;
  userId: string;
}) => {
  const prefixes = [
    cacheKeys.feedPrefix(userId),
    cacheKeys.commentsPrefix(postId),
  ];

  if (commentId) {
    prefixes.push(cacheKeys.repliesPrefix(commentId));
    prefixes.push(cacheKeys.likesPrefix('comment', commentId));
    prefixes.push('reply-likes:');
  }

  if (replyId) {
    prefixes.push(cacheKeys.likesPrefix('reply', replyId));
  }

  await invalidateCachePrefixes(prefixes);
};

const createLikesResponse = async (
  targetType: 'comment' | 'reply',
  targetId: string,
  page: number,
  limit: number,
  cursor: ReturnType<typeof parseCursor>,
  legacyPageMode: boolean
) => {
  const canUseCache = !legacyPageMode && !cursor;
  const cacheKey = cacheKeys.likes(targetType, targetId, limit);

  if (!config.enableLegacyPagePagination && legacyPageMode && !cursor) {
    throw new AppError(400, 'Page-based pagination is disabled. Use cursor-based pagination.');
  }

  if (config.enableLegacyPagePagination && legacyPageMode && !cursor) {
    const skip = (page - 1) * limit;

    const [likes, total] = await Promise.all([
      Like.find({ targetType, targetId })
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('user', 'firstName lastName email')
        .lean(),
      Like.countDocuments({ targetType, targetId }),
    ]);

    return {
      users: normalizeLikeUsers(likes),
      nextCursor: null,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    };
  }

  if (canUseCache) {
    const cachedPayload = await getCachedJson<{ users: any[]; nextCursor: any }>(cacheKey);
    if (cachedPayload) {
      return cachedPayload;
    }
  }

  const baseFilter: Record<string, any> = {
    targetType,
    targetId: new Types.ObjectId(targetId),
  };

  const filter = addBeforeCursorFilter(baseFilter, cursor);

  const rows = await Like.find(filter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('user', 'firstName lastName email')
    .lean();

  const likesPage = buildCursorPage(rows, limit);

  const payload = {
    users: normalizeLikeUsers(likesPage.items),
    nextCursor: likesPage.nextCursor,
  };

  if (canUseCache) {
    await setCachedJson(cacheKey, payload);
  }

  return payload;
};

export const createComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const post = await ensurePostAccess(req.params.postId, req.user.id);

  const created = await runInTransaction(async (session) => {
    const commentDocs = await Comment.create(
      [
        {
          post: post._id,
          author: req.user!.id,
          content: req.body.content,
          parentComment: null,
        },
      ],
      session ? { session } : undefined
    );

    await Post.updateOne(
      { _id: post._id },
      { $inc: { commentCount: 1 } },
      session ? { session } : undefined
    );

    const query = Comment.findById(commentDocs[0]._id)
      .populate('author', 'firstName lastName email')
      .lean();

    if (session) {
      query.session(session);
    }

    return query;
  });

  const response: ApiResponse = {
    success: true,
    message: 'Comment created successfully',
    data: created ? normalizeComment(created, false) : null,
  };

  await invalidateCommentRelatedCaches({
    postId: post._id.toString(),
    userId: req.user.id,
  });

  res.status(201).json(response);
});

export const getComments = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  await ensurePostAccess(req.params.postId, req.user.id);

  const legacyPageQuery = typeof req.query.page === 'string';
  const page = parseLimit(req.query.page, 1, 100000);
  const limit = parseLimit(req.query.limit, 20, 100);
  const cursor = parseCursor(req.query.before, req.query.beforeId);
  const canUseCache = !legacyPageQuery && !cursor;
  const commentsCacheKey = cacheKeys.comments(req.params.postId, limit);

  const filter = {
    post: new Types.ObjectId(req.params.postId),
    parentComment: null,
  };

  if (!config.enableLegacyPagePagination && legacyPageQuery && !cursor) {
    throw new AppError(400, 'Page-based pagination is disabled. Use cursor-based pagination.');
  }

  if (config.enableLegacyPagePagination && legacyPageQuery && !cursor) {
    const skip = (page - 1) * limit;

    const [comments, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'firstName lastName email')
        .lean(),
      Comment.countDocuments(filter),
    ]);

    const commentIds = comments.map((comment) => comment._id);
    const likedMap = await loadLikedIdSet('comment', commentIds, req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Comments retrieved successfully',
      data: {
        comments: comments.map((comment) => {
          const key = comment._id.toString();
          return normalizeComment(comment, likedMap.has(key), likedMap.get(key));
        }),
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
    const cachedPayload = await getCachedJson<{ comments: any[]; nextCursor: any }>(commentsCacheKey);
    if (cachedPayload) {
      const response: ApiResponse = {
        success: true,
        message: 'Comments retrieved successfully',
        data: cachedPayload,
      };

      res.status(200).json(response);
      return;
    }
  }

  const cursorFilter = addBeforeCursorFilter(filter, cursor);

  const rows = await Comment.find(cursorFilter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('author', 'firstName lastName email')
    .lean();

  const commentsPage = buildCursorPage(rows, limit);
  const commentIds = commentsPage.items.map((comment) => comment._id);
  const likedMap = await loadLikedIdSet('comment', commentIds, req.user.id);

  const response: ApiResponse = {
    success: true,
    message: 'Comments retrieved successfully',
    data: {
      comments: commentsPage.items.map((comment) => {
        const key = comment._id.toString();
        return normalizeComment(comment, likedMap.has(key), likedMap.get(key));
      }),
      nextCursor: commentsPage.nextCursor,
    },
  };

  if (canUseCache) {
    await setCachedJson(commentsCacheKey, response.data);
  }

  res.status(200).json(response);
});

export const updateComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const comment = await ensureTopLevelComment(req.params.id);

  await ensurePostAccess(comment.post, req.user.id);

  if (comment.author.toString() !== req.user.id) {
    throw new AppError(403, 'You are not allowed to update this comment');
  }

  comment.content = req.body.content;
  await comment.save();

  const updated = await Comment.findById(comment._id)
    .populate('author', 'firstName lastName email')
    .lean();

  const liked = Boolean(
    await Like.exists({
      user: req.user.id,
      targetType: 'comment',
      targetId: comment._id,
    })
  );

  const response: ApiResponse = {
    success: true,
    message: 'Comment updated successfully',
    data: updated ? normalizeComment(updated, liked) : null,
  };

  await invalidateCommentRelatedCaches({
    postId: comment.post.toString(),
    commentId: comment._id.toString(),
    userId: req.user.id,
  });

  res.status(200).json(response);
});

export const deleteComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const comment = await ensureTopLevelComment(req.params.id);

  await ensurePostAccess(comment.post, req.user.id);

  if (comment.author.toString() !== req.user.id) {
    throw new AppError(403, 'You are not allowed to delete this comment');
  }

  await runInTransaction(async (session) => {
    const repliesQuery = Comment.find({ parentComment: comment._id }).select('_id').lean();
    if (session) {
      repliesQuery.session(session);
    }
    const replies = await repliesQuery;
    const replyIds = replies.map((reply) => reply._id);

    const likeConditions: Record<string, any>[] = [{ targetType: 'comment', targetId: comment._id }];
    if (replyIds.length > 0) {
      likeConditions.push({ targetType: 'reply', targetId: { $in: replyIds } });
    }

    await Promise.all([
      Comment.deleteMany(
        {
          $or: [{ _id: comment._id }, { parentComment: comment._id }],
        },
        session ? { session } : undefined
      ),
      Like.deleteMany({ $or: likeConditions }, session ? { session } : undefined),
      Post.updateOne(
        { _id: comment.post, commentCount: { $gt: 0 } },
        { $inc: { commentCount: -1 } },
        session ? { session } : undefined
      ),
    ]);
  });

  const response: ApiResponse = {
    success: true,
    message: 'Comment deleted successfully',
    data: null,
  };

  await invalidateCommentRelatedCaches({
    postId: comment.post.toString(),
    commentId: comment._id.toString(),
    userId: req.user.id,
  });

  res.status(200).json(response);
});

export const likeComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const comment = await ensureTopLevelComment(req.params.id);
  await ensurePostAccess(comment.post, req.user.id);

  const reactionType: string = (req.body?.reactionType as string) || 'like';

  const data = await runInTransaction(async (session) => {
    let created = false;

    try {
      await Like.create(
        [
          {
            user: req.user!.id,
            targetType: 'comment',
            targetId: comment._id,
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
      await Like.updateOne(
        { user: req.user!.id, targetType: 'comment', targetId: comment._id },
        { reactionType },
        session ? { session } : undefined
      );
    }

    if (created) {
      await Comment.updateOne(
        { _id: comment._id },
        { $inc: { likeCount: 1 } },
        session ? { session } : undefined
      );
    }

    const query = Comment.findById(comment._id).select('likeCount').lean();
    if (session) {
      query.session(session);
    }
    const latest = await query;

    return {
      liked: true,
      likeCount: latest?.likeCount || 0,
      reactionType,
    };
  });

  const response: ApiResponse = {
    success: true,
    message: 'Comment liked successfully',
    data,
  };

  await invalidateCommentRelatedCaches({
    postId: comment.post.toString(),
    commentId: comment._id.toString(),
    userId: req.user.id,
  });

  res.status(200).json(response);
});

export const unlikeComment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const comment = await ensureTopLevelComment(req.params.id);
  await ensurePostAccess(comment.post, req.user.id);

  const data = await runInTransaction(async (session) => {
    const deleted = await Like.deleteOne(
      {
        user: req.user!.id,
        targetType: 'comment',
        targetId: comment._id,
      },
      session ? { session } : undefined
    );

    if (deleted.deletedCount && deleted.deletedCount > 0) {
      await Comment.updateOne(
        { _id: comment._id, likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1 } },
        session ? { session } : undefined
      );
    }

    const query = Comment.findById(comment._id).select('likeCount').lean();
    if (session) {
      query.session(session);
    }
    const latest = await query;

    return {
      liked: false,
      likeCount: latest?.likeCount || 0,
    };
  });

  const response: ApiResponse = {
    success: true,
    message: 'Comment unliked successfully',
    data,
  };

  await invalidateCommentRelatedCaches({
    postId: comment.post.toString(),
    commentId: comment._id.toString(),
    userId: req.user.id,
  });

  res.status(200).json(response);
});

export const getCommentLikes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const comment = await ensureTopLevelComment(req.params.id);
  await ensurePostAccess(comment.post, req.user.id);

  const page = parseLimit(req.query.page, 1, 100000);
  const limit = parseLimit(req.query.limit, 20, 100);
  const cursor = parseCursor(req.query.before, req.query.beforeId);
  const legacyPageMode = typeof req.query.page === 'string';

  const data = await createLikesResponse(
    'comment',
    req.params.id,
    page,
    limit,
    cursor,
    legacyPageMode
  );

  const response: ApiResponse = {
    success: true,
    message: 'Comment likes retrieved successfully',
    data,
  };

  res.status(200).json(response);
});

export const createReply = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const parent = await ensureTopLevelComment(req.params.commentId);
  await ensurePostAccess(parent.post, req.user.id);

  const created = await runInTransaction(async (session) => {
    const replyDocs = await Comment.create(
      [
        {
          post: parent.post,
          author: req.user!.id,
          parentComment: parent._id,
          content: req.body.content,
        },
      ],
      session ? { session } : undefined
    );

    await Comment.updateOne(
      { _id: parent._id },
      { $inc: { replyCount: 1 } },
      session ? { session } : undefined
    );

    const query = Comment.findById(replyDocs[0]._id)
      .populate('author', 'firstName lastName email')
      .lean();

    if (session) {
      query.session(session);
    }

    return query;
  });

  const response: ApiResponse = {
    success: true,
    message: 'Reply created successfully',
    data: created ? normalizeComment(created, false) : null,
  };

  await invalidateCommentRelatedCaches({
    postId: parent.post.toString(),
    commentId: parent._id.toString(),
    userId: req.user.id,
  });

  res.status(201).json(response);
});

export const getReplies = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const parent = await ensureTopLevelComment(req.params.commentId);
  await ensurePostAccess(parent.post, req.user.id);

  const legacyPageQuery = typeof req.query.page === 'string';
  const page = parseLimit(req.query.page, 1, 100000);
  const limit = parseLimit(req.query.limit, 20, 100);
  const cursor = parseCursor(req.query.before, req.query.beforeId);
  const canUseCache = !legacyPageQuery && !cursor;
  const repliesCacheKey = cacheKeys.replies(req.params.commentId, limit);

  const filter = {
    parentComment: new Types.ObjectId(req.params.commentId),
  };

  if (!config.enableLegacyPagePagination && legacyPageQuery && !cursor) {
    throw new AppError(400, 'Page-based pagination is disabled. Use cursor-based pagination.');
  }

  if (config.enableLegacyPagePagination && legacyPageQuery && !cursor) {
    const skip = (page - 1) * limit;

    const [replies, total] = await Promise.all([
      Comment.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .populate('author', 'firstName lastName email')
        .lean(),
      Comment.countDocuments(filter),
    ]);

    const replyIds = replies.map((reply) => reply._id);
    const likedMap = await loadLikedIdSet('reply', replyIds, req.user.id);

    const response: ApiResponse = {
      success: true,
      message: 'Replies retrieved successfully',
      data: {
        replies: replies.map((reply) => {
          const key = reply._id.toString();
          return normalizeComment(reply, likedMap.has(key), likedMap.get(key));
        }),
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
    const cachedPayload = await getCachedJson<{ replies: any[]; nextCursor: any }>(repliesCacheKey);
    if (cachedPayload) {
      const response: ApiResponse = {
        success: true,
        message: 'Replies retrieved successfully',
        data: cachedPayload,
      };

      res.status(200).json(response);
      return;
    }
  }

  const cursorFilter = addBeforeCursorFilter(filter, cursor);

  const rows = await Comment.find(cursorFilter)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .populate('author', 'firstName lastName email')
    .lean();

  const repliesPage = buildCursorPage(rows, limit);
  const replyIds = repliesPage.items.map((reply) => reply._id);
  const likedMap = await loadLikedIdSet('reply', replyIds, req.user.id);

  const response: ApiResponse = {
    success: true,
    message: 'Replies retrieved successfully',
    data: {
      replies: repliesPage.items.map((reply) => {
        const key = reply._id.toString();
        return normalizeComment(reply, likedMap.has(key), likedMap.get(key));
      }),
      nextCursor: repliesPage.nextCursor,
    },
  };

  if (canUseCache) {
    await setCachedJson(repliesCacheKey, response.data);
  }

  res.status(200).json(response);
});

export const updateReply = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const reply = await ensureReply(req.params.id);
  await ensurePostAccess(reply.post, req.user.id);

  if (reply.author.toString() !== req.user.id) {
    throw new AppError(403, 'You are not allowed to update this reply');
  }

  reply.content = req.body.content;
  await reply.save();

  const updated = await Comment.findById(reply._id)
    .populate('author', 'firstName lastName email')
    .lean();

  const liked = Boolean(
    await Like.exists({
      user: req.user.id,
      targetType: 'reply',
      targetId: reply._id,
    })
  );

  const response: ApiResponse = {
    success: true,
    message: 'Reply updated successfully',
    data: updated ? normalizeComment(updated, liked) : null,
  };

  await invalidateCommentRelatedCaches({
    postId: reply.post.toString(),
    commentId: reply.parentComment!.toString(),
    replyId: reply._id.toString(),
    userId: req.user.id,
  });

  res.status(200).json(response);
});

export const deleteReply = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const reply = await ensureReply(req.params.id);
  await ensurePostAccess(reply.post, req.user.id);

  if (reply.author.toString() !== req.user.id) {
    throw new AppError(403, 'You are not allowed to delete this reply');
  }

  await runInTransaction(async (session) => {
    await Promise.all([
      Comment.deleteOne({ _id: reply._id }, session ? { session } : undefined),
      Like.deleteMany({ targetType: 'reply', targetId: reply._id }, session ? { session } : undefined),
      Comment.updateOne(
        { _id: reply.parentComment, replyCount: { $gt: 0 } },
        { $inc: { replyCount: -1 } },
        session ? { session } : undefined
      ),
    ]);
  });

  const response: ApiResponse = {
    success: true,
    message: 'Reply deleted successfully',
    data: null,
  };

  await invalidateCommentRelatedCaches({
    postId: reply.post.toString(),
    commentId: reply.parentComment!.toString(),
    replyId: reply._id.toString(),
    userId: req.user.id,
  });

  res.status(200).json(response);
});

export const likeReply = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const reply = await ensureReply(req.params.id);
  await ensurePostAccess(reply.post, req.user.id);

  const reactionType: string = (req.body?.reactionType as string) || 'like';

  const data = await runInTransaction(async (session) => {
    let created = false;

    try {
      await Like.create(
        [
          {
            user: req.user!.id,
            targetType: 'reply',
            targetId: reply._id,
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
      await Like.updateOne(
        { user: req.user!.id, targetType: 'reply', targetId: reply._id },
        { reactionType },
        session ? { session } : undefined
      );
    }

    if (created) {
      await Comment.updateOne(
        { _id: reply._id },
        { $inc: { likeCount: 1 } },
        session ? { session } : undefined
      );
    }

    const query = Comment.findById(reply._id).select('likeCount').lean();
    if (session) {
      query.session(session);
    }
    const latest = await query;

    return {
      liked: true,
      likeCount: latest?.likeCount || 0,
      reactionType,
    };
  });

  const response: ApiResponse = {
    success: true,
    message: 'Reply liked successfully',
    data,
  };

  await invalidateCommentRelatedCaches({
    postId: reply.post.toString(),
    commentId: reply.parentComment!.toString(),
    replyId: reply._id.toString(),
    userId: req.user.id,
  });

  res.status(200).json(response);
});

export const unlikeReply = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const reply = await ensureReply(req.params.id);
  await ensurePostAccess(reply.post, req.user.id);

  const data = await runInTransaction(async (session) => {
    const deleted = await Like.deleteOne(
      {
        user: req.user!.id,
        targetType: 'reply',
        targetId: reply._id,
      },
      session ? { session } : undefined
    );

    if (deleted.deletedCount && deleted.deletedCount > 0) {
      await Comment.updateOne(
        { _id: reply._id, likeCount: { $gt: 0 } },
        { $inc: { likeCount: -1 } },
        session ? { session } : undefined
      );
    }

    const query = Comment.findById(reply._id).select('likeCount').lean();
    if (session) {
      query.session(session);
    }
    const latest = await query;

    return {
      liked: false,
      likeCount: latest?.likeCount || 0,
    };
  });

  const response: ApiResponse = {
    success: true,
    message: 'Reply unliked successfully',
    data,
  };

  await invalidateCommentRelatedCaches({
    postId: reply.post.toString(),
    commentId: reply.parentComment!.toString(),
    replyId: reply._id.toString(),
    userId: req.user.id,
  });

  res.status(200).json(response);
});

export const getReplyLikes = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user?.id) {
    throw new AppError(401, 'Unauthorized');
  }

  const reply = await ensureReply(req.params.id);
  await ensurePostAccess(reply.post, req.user.id);

  const page = parseLimit(req.query.page, 1, 100000);
  const limit = parseLimit(req.query.limit, 20, 100);
  const cursor = parseCursor(req.query.before, req.query.beforeId);
  const legacyPageMode = typeof req.query.page === 'string';

  const data = await createLikesResponse(
    'reply',
    req.params.id,
    page,
    limit,
    cursor,
    legacyPageMode
  );

  const response: ApiResponse = {
    success: true,
    message: 'Reply likes retrieved successfully',
    data,
  };

  res.status(200).json(response);
});
