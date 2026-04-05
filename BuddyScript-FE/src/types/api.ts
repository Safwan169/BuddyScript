export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  token?: string;
}

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  age?: number;
}

export type PostVisibility = 'public' | 'private';

export interface Author {
  id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  reactionType?: string;
}

export interface FeedPost {
  id: string;
  content: string;
  imageUrl?: string;
  visibility: PostVisibility;
  likeCount: number;
  commentCount: number;
  createdAt: string;
  updatedAt: string;
  likedByCurrentUser: boolean;
  userReaction?: string | null;
  author: Author | null;
}

export interface FeedCursor {
  before: string;
  beforeId: string;
}

export interface FeedPayload {
  posts: FeedPost[];
  nextCursor: FeedCursor | null;
}

export interface SocialComment {
  id: string;
  postId: string;
  parentCommentId: string | null;
  content: string;
  likeCount: number;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
  likedByCurrentUser: boolean;
  userReaction?: string | null;
  author: Author | null;
}

export interface PaginatedResult<T> {
  page: number;
  limit: number;
  total: number;
  pages: number;
  items: T[];
}

export interface LikesPayload {
  users: Author[];
  nextCursor?: FeedCursor | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface CommentsPayload {
  comments: SocialComment[];
  nextCursor?: FeedCursor | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface RepliesPayload {
  replies: SocialComment[];
  nextCursor?: FeedCursor | null;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
