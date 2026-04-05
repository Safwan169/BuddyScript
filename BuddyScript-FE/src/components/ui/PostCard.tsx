'use client';

import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { toast } from 'sonner';
import {
  useCreateCommentMutation,
  useCreateReplyMutation,
  useLazyGetCommentLikesQuery,
  useLazyGetCommentsQuery,
  useLazyGetPostLikesQuery,
  useLazyGetRepliesQuery,
  useLazyGetReplyLikesQuery,
  useLikeCommentMutation,
  useLikePostMutation,
  useLikeReplyMutation,
  useUnlikeCommentMutation,
  useUnlikePostMutation,
  useUnlikeReplyMutation,
} from '@/features/feed/feedApi';
import { mergeUniqueById } from '@/lib/cursorPagination';
import type { Author, FeedCursor, FeedPost, SocialComment } from '@/types/api';

type PostComponentProps = { postData: FeedPost };

type ReactionType = 'like' | 'love' | 'haha' | 'wow' | 'sad' | 'angry';

const REACTIONS: Array<{ type: ReactionType; label: string; emoji: string; color: string }> = [
  { type: 'like', label: 'Like', emoji: '\u{1F44D}', color: '#1b74e4' },
  { type: 'love', label: 'Love', emoji: '\u{2764}\u{FE0F}', color: '#f33e58' },
  { type: 'haha', label: 'Haha', emoji: '\u{1F606}', color: '#f7b125' },
  { type: 'wow', label: 'Wow', emoji: '\u{1F62E}', color: '#f7b125' },
  { type: 'sad', label: 'Sad', emoji: '\u{1F622}', color: '#f7b125' },
  { type: 'angry', label: 'Angry', emoji: '\u{1F621}', color: '#e9710f' },
];

const fullName = (author: Author | null | undefined): string => {
  if (!author) return 'Unknown User';
  const name = `${author.firstName || ''} ${author.lastName || ''}`.trim();
  return name || author.email || 'Unknown User';
};

const formatTimeAgo = (value: string): string => {
  const target = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - target);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))} minute ago`;
  if (diff < day) return `${Math.floor(diff / hour)} hour ago`;
  return `${Math.floor(diff / day)} day ago`;
};

const compactAgo = (value: string): string => {
  const target = new Date(value).getTime();
  const diff = Math.max(0, Date.now() - target);
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diff < hour) return `${Math.max(1, Math.floor(diff / minute))}m`;
  if (diff < day) return `${Math.max(1, Math.floor(diff / hour))}h`;
  return `${Math.max(1, Math.floor(diff / day))}d`;
};

const resolveApiOrigin = (): string => {
  const configured = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (configured) {
    try {
      const parsed = new URL(configured);
      const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
      if (isLocalHost && parsed.port && parsed.port !== '5000') {
        parsed.port = '5000';
      }
      return `${parsed.protocol}//${parsed.host}`;
    } catch (_error) {
      // fallback below
    }
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:5000`;
  }

  return 'http://localhost:5000';
};

const normalizeLocalUploadUrl = (value: string): string => {
  if (!value) return value;

  const apiOrigin = resolveApiOrigin();

  if (value.startsWith('/uploads/')) {
    return `${apiOrigin}${value}`;
  }

  if (!/^https?:\/\//i.test(value)) {
    return value;
  }

  try {
    const parsed = new URL(value);
    const isLocalHost = parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1';
    const isLocalUpload = isLocalHost && parsed.pathname.startsWith('/uploads/');

    if (!isLocalUpload) {
      return value;
    }

    const target = new URL(apiOrigin);
    parsed.protocol = target.protocol;
    parsed.hostname = target.hostname;
    parsed.port = target.port;
    return parsed.toString();
  } catch (_error) {
    return value;
  }
};

const mergeById = <T extends { id: string }>(current: T[], incoming: T[]): T[] => mergeUniqueById(current, incoming);

const LikeHandIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1b74e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z" />
    <path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
  </svg>
);

const TimelineCommentInput = ({
  value,
  onChange,
  onSubmit,
}: {
  value: string;
  onChange: (v: string) => void;
  onSubmit: (e: FormEvent) => void;
}) => (
  <div className="_feed_inner_comment_box">
    <form onSubmit={onSubmit} className="_feed_inner_comment_box_form">
      <div className="_feed_inner_comment_box_content">
        <div className="_feed_inner_comment_box_content_image">
          <img src="/assets/images/comment_img.png" alt="" className="_comment_img" />
        </div>
        <div className="_feed_inner_comment_box_content_txt">
          <textarea
            className="form-control _comment_textarea"
            placeholder="Write a comment"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
        </div>
      </div>
      <div className="_feed_inner_comment_box_icon">
        <button type="button" className="_feed_inner_comment_box_icon_btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16"><path fill="#000" fillOpacity=".46" fillRule="evenodd" d="M13.167 6.534a.5.5 0 01.5.5c0 3.061-2.35 5.582-5.333 5.837V14.5a.5.5 0 01-1 0v-1.629C4.35 12.616 2 10.096 2 7.034a.5.5 0 011 0c0 2.679 2.168 4.859 4.833 4.859 2.666 0 4.834-2.18 4.834-4.86a.5.5 0 01.5-.5zM7.833.667a3.218 3.218 0 013.208 3.22v3.126c0 1.775-1.439 3.22-3.208 3.22a3.218 3.218 0 01-3.208-3.22V3.887c0-1.776 1.44-3.22 3.208-3.22zm0 1a2.217 2.217 0 00-2.208 2.22v3.126c0 1.223.991 2.22 2.208 2.22a2.217 2.217 0 002.208-2.22V3.887c0-1.224-.99-2.22-2.208-2.22z" clipRule="evenodd" /></svg>
        </button>
        <button type="submit" className="_feed_inner_comment_box_icon_btn">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 16 16"><path fill="#000" fillOpacity=".46" fillRule="evenodd" d="M10.867 1.333c2.257 0 3.774 1.581 3.774 3.933v5.435c0 2.352-1.517 3.932-3.774 3.932H5.101c-2.254 0-3.767-1.58-3.767-3.932V5.266c0-2.352 1.513-3.933 3.767-3.933h5.766zm0 1H5.101c-1.681 0-2.767 1.152-2.767 2.933v5.435c0 1.782 1.086 2.932 2.767 2.932h5.766c1.685 0 2.774-1.15 2.774-2.932V5.266c0-1.781-1.089-2.933-2.774-2.933z" clipRule="evenodd" /></svg>
        </button>
      </div>
    </form>
  </div>
);

const CommentItem = ({
  comment,
  postId,
  onRefresh,
}: {
  comment: SocialComment;
  postId: string;
  onRefresh: () => Promise<void>;
}) => {
  const [likeComment, { isLoading: liking }] = useLikeCommentMutation();
  const [unlikeComment, { isLoading: unliking }] = useUnlikeCommentMutation();
  const [createReply, { isLoading: creatingReply }] = useCreateReplyMutation();
  const [fetchReplies, { isFetching: repliesLoading }] = useLazyGetRepliesQuery();
  const [fetchCommentLikes] = useLazyGetCommentLikesQuery();
  const [showReplies, setShowReplies] = useState(false);
  const [showLikePopup, setShowLikePopup] = useState(false);
  const [showCommentLikes, setShowCommentLikes] = useState(false);
  const [commentLikedUsers, setCommentLikedUsers] = useState<Author[]>([]);
  const [replyText, setReplyText] = useState('');
  const [replies, setReplies] = useState<SocialComment[]>([]);
  const [repliesCursor, setRepliesCursor] = useState<FeedCursor | null>(null);
  const [selectedReaction, setSelectedReaction] = useState<ReactionType | null>(
    comment.likedByCurrentUser ? ((comment.userReaction as ReactionType) || 'like') : null
  );

  useEffect(() => {
    if (comment.likedByCurrentUser) {
      setSelectedReaction((comment.userReaction as ReactionType) || 'like');
      return;
    }
    setSelectedReaction(null);
  }, [comment.likedByCurrentUser, comment.userReaction]);

  const activeReaction = REACTIONS.find((reaction) => reaction.type === selectedReaction) || null;

  const loadReplies = async (append: boolean) => {
    try {
      if (append && !repliesCursor) return;
      const result = await fetchReplies({
        commentId: comment.id,
        limit: 20,
        before: append ? repliesCursor?.before : undefined,
        beforeId: append ? repliesCursor?.beforeId : undefined,
      }).unwrap();

      setReplies((prev) => (append ? mergeById(prev, result.replies) : result.replies));
      setRepliesCursor(result.nextCursor || null);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load replies');
    }
  };

  const handleCommentLike = async () => {
    try {
      if (comment.likedByCurrentUser) {
        await unlikeComment({ commentId: comment.id, postId }).unwrap();
        setSelectedReaction(null);
      } else {
        const reaction: ReactionType = selectedReaction || 'like';
        await likeComment({ commentId: comment.id, postId, reactionType: reaction }).unwrap();
        setSelectedReaction(reaction);
      }
      await onRefresh();
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update comment like');
    }
  };

  const selectCommentReaction = async (reaction: ReactionType) => {
    try {
      await likeComment({ commentId: comment.id, postId, reactionType: reaction }).unwrap();
      await onRefresh();
      setSelectedReaction(reaction);
      setShowLikePopup(false);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update comment like');
    }
  };

  const handleShowCommentLikes = async () => {
    if (showCommentLikes) {
      setShowCommentLikes(false);
      return;
    }
    try {
      const result = await fetchCommentLikes({ commentId: comment.id, limit: 10 }).unwrap();
      setCommentLikedUsers(result.users);
      setShowCommentLikes(true);
    } catch {
      toast.error('Failed to load comment likes');
    }
  };

  const toggleReplies = () => {
    const next = !showReplies;
    setShowReplies(next);
    if (next) {
      void loadReplies(false);
    }
  };

  const submitReply = async (e: FormEvent) => {
    e.preventDefault();
    if (!replyText.trim()) return;

    try {
      await createReply({ commentId: comment.id, postId, content: replyText.trim() }).unwrap();
      setReplyText('');
      setShowReplies(true);
      await Promise.all([loadReplies(false), onRefresh()]);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create reply');
    }
  };

  return (
    <div className="_comment_main">
      <div className="_comment_image">
        <a href="#0" className="_comment_image_link" onClick={(e) => e.preventDefault()}>
          <img src="/assets/images/txt_img.png" alt="" className="_comment_img1" />
        </a>
      </div>
      <div className="_comment_area">
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <a href="#0" onClick={(e) => e.preventDefault()}>
                <h4 className="_comment_name_title">{fullName(comment.author)}</h4>
              </a>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text"><span>{comment.content}</span></p>
          </div>
          <div className="_total_reactions">
            <div className="_total_react">
              {selectedReaction === 'love' ? (
                <span className="_reaction_heart">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                </span>
              ) : selectedReaction ? (
                <span className="_reaction_like">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                </span>
              ) : (
                <>
                  <span className="_reaction_like">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  </span>
                  <span className="_reaction_heart">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </span>
                </>
              )}
            </div>
            <span
              className="_total"
              style={{ cursor: 'pointer' }}
              title="See who liked"
              onClick={() => void handleShowCommentLikes()}
            >{comment.likeCount}</span>
          </div>
          {showCommentLikes && (
            <div style={{ padding: '4px 0 8px' }}>
              {commentLikedUsers.length === 0 ? (
                <p className="_feed_inner_timline_para">No likes yet</p>
              ) : commentLikedUsers.map((u) => (
                <p key={u.id} className="_feed_inner_timline_para" style={{ padding: '2px 0' }}>
                  {fullName(u)}
                </p>
              ))}
            </div>
          )}
          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list">
                <li className="_fb_comment_like_item">
                  <div className="_fb_comment_like_wrap" onMouseEnter={() => setShowLikePopup(true)} onMouseLeave={() => setShowLikePopup(false)}>
                    <span onClick={() => !(liking || unliking) && void handleCommentLike()}>
                      {comment.likedByCurrentUser ? activeReaction?.label || 'Like' : 'Like'}.
                    </span>
                    <div className={`_fb_reaction_panel _fb_comment_reaction_panel${showLikePopup ? ' _fb_reaction_panel_show' : ''}`}>
                      {REACTIONS.map((reaction) => (
                        <button
                          key={reaction.type}
                          type="button"
                          className="_fb_reaction_panel_btn"
                          title={reaction.label}
                          onClick={() => void selectCommentReaction(reaction.type)}
                        >
                          {reaction.emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                </li>
                <li><span onClick={toggleReplies}>Reply.</span></li>
                <li><span>Share</span></li>
                <li><span className="_time_link">.{compactAgo(comment.createdAt)}</span></li>
              </ul>
            </div>
          </div>
        </div>

        {showReplies && (
          <div className="_comment_replies_wrap">
            {repliesLoading && replies.length === 0 ? (
              <p className="_feed_inner_timline_para">Loading replies...</p>
            ) : replies.length > 0 ? (
              replies.map((reply) => (
                <ReplyItem key={reply.id} reply={reply} commentId={comment.id} />
              ))
            ) : (
              <p className="_feed_inner_timline_para">No replies yet.</p>
            )}

            {repliesCursor && (
              <button type="button" className="_previous_comment_txt" onClick={() => void loadReplies(true)} disabled={repliesLoading}>
                {repliesLoading ? 'Loading...' : 'Load more replies'}
              </button>
            )}
          </div>
        )}

        <div style={{ marginTop: '8px' }}>
          <TimelineCommentInput value={replyText} onChange={setReplyText} onSubmit={submitReply} />
        </div>
        {creatingReply && <p className="_feed_inner_timline_para" style={{ marginTop: '8px' }}>Posting reply...</p>}
      </div>
    </div>
  );
};

const ReplyItem = ({
  reply,
  commentId,
}: {
  reply: SocialComment;
  commentId: string;
}) => {
  const [likeReply, { isLoading: liking }] = useLikeReplyMutation();
  const [unlikeReply, { isLoading: unliking }] = useUnlikeReplyMutation();
  const [fetchReplyLikes] = useLazyGetReplyLikesQuery();
  const [replyLiked, setReplyLiked] = useState(reply.likedByCurrentUser);
  const [replyLikeCount, setReplyLikeCount] = useState(reply.likeCount);
  const [showReplyLikes, setShowReplyLikes] = useState(false);
  const [replyLikedUsers, setReplyLikedUsers] = useState<Author[]>([]);

  useEffect(() => {
    setReplyLiked(reply.likedByCurrentUser);
    setReplyLikeCount(reply.likeCount);
  }, [reply.likedByCurrentUser, reply.likeCount]);

  const handleLike = async () => {
    if (liking || unliking) return;
    try {
      if (replyLiked) {
        await unlikeReply({ replyId: reply.id, commentId }).unwrap();
        setReplyLiked(false);
        setReplyLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        await likeReply({ replyId: reply.id, commentId, reactionType: 'like' }).unwrap();
        setReplyLiked(true);
        setReplyLikeCount((prev) => prev + 1);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update reply like');
    }
  };

  const handleShowReplyLikes = async () => {
    if (showReplyLikes) {
      setShowReplyLikes(false);
      return;
    }
    try {
      const result = await fetchReplyLikes({ replyId: reply.id, limit: 10 }).unwrap();
      setReplyLikedUsers(result.users);
      setShowReplyLikes(true);
    } catch {
      toast.error('Failed to load reply likes');
    }
  };

  return (
    <div className="_comment_main" style={{ marginLeft: '58px', marginTop: '10px' }}>
      <div className="_comment_image">
        <a href="#0" className="_comment_image_link" onClick={(e) => e.preventDefault()}>
          <img src="/assets/images/txt_img.png" alt="" className="_comment_img1" />
        </a>
      </div>
      <div className="_comment_area">
        <div className="_comment_details">
          <div className="_comment_details_top">
            <div className="_comment_name">
              <a href="#0" onClick={(e) => e.preventDefault()}>
                <h4 className="_comment_name_title">{fullName(reply.author)}</h4>
              </a>
            </div>
          </div>
          <div className="_comment_status">
            <p className="_comment_status_text"><span>{reply.content}</span></p>
          </div>
          <div className="_total_reactions">
            <div className="_total_react">
              {replyLiked ? (
                <span className="_reaction_like">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#1b74e4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                </span>
              ) : (
                <>
                  <span className="_reaction_like">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3z"/><path d="M7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
                  </span>
                  <span className="_reaction_heart">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
                  </span>
                </>
              )}
            </div>
            <span
              className="_total"
              style={{ cursor: 'pointer' }}
              title="See who liked"
              onClick={() => void handleShowReplyLikes()}
            >{replyLikeCount}</span>
          </div>
          {showReplyLikes && (
            <div style={{ padding: '4px 0 8px' }}>
              {replyLikedUsers.length === 0 ? (
                <p className="_feed_inner_timline_para">No likes yet</p>
              ) : replyLikedUsers.map((u) => (
                <p key={u.id} className="_feed_inner_timline_para" style={{ padding: '2px 0' }}>
                  {fullName(u)}
                </p>
              ))}
            </div>
          )}
          <div className="_comment_reply">
            <div className="_comment_reply_num">
              <ul className="_comment_reply_list">
                <li>
                  <span
                    style={{ cursor: 'pointer', color: replyLiked ? '#1b74e4' : undefined }}
                    onClick={() => void handleLike()}
                  >
                    {replyLiked ? 'Liked' : 'Like'}.
                  </span>
                </li>
                <li><span>Reply.</span></li>
                <li><span>Share</span></li>
                <li><span className="_time_link">.{compactAgo(reply.createdAt)}</span></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DropdownItem = ({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) => (
  <li className="_feed_timeline_dropdown_item">
    <a href="#0" className="_feed_timeline_dropdown_link" onClick={(e) => { e.preventDefault(); onClick(); }}>
      <span>{icon}</span>
      {label}
    </a>
  </li>
);

export const PostComponent = ({ postData }: PostComponentProps) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [commentText, setCommentText] = useState('');

  const [postLiked, setPostLiked] = useState(postData.likedByCurrentUser);
  const [postLikeCount, setPostLikeCount] = useState(postData.likeCount);
  const [postCommentCount, setPostCommentCount] = useState(postData.commentCount);
  const [selectedReaction, setSelectedReaction] = useState<ReactionType | null>(
    postData.likedByCurrentUser ? ((postData.userReaction as ReactionType) || 'like') : null
  );

  const [comments, setComments] = useState<SocialComment[]>([]);
  const [commentsCursor, setCommentsCursor] = useState<FeedCursor | null>(null);

  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const likesPopupRef = useRef<HTMLDivElement | null>(null);

  const [likePost, { isLoading: likingPost }] = useLikePostMutation();
  const [unlikePost, { isLoading: unlikingPost }] = useUnlikePostMutation();
  const [createComment] = useCreateCommentMutation();
  const [fetchComments, { isFetching: commentsLoading }] = useLazyGetCommentsQuery();
  const [fetchPostLikes] = useLazyGetPostLikesQuery();
  const [showPostLikes, setShowPostLikes] = useState(false);
  const [postLikedUsers, setPostLikedUsers] = useState<Author[]>([]);

  useEffect(() => {
    setPostLiked(postData.likedByCurrentUser);
    setPostLikeCount(postData.likeCount);
    setPostCommentCount(postData.commentCount);
    setSelectedReaction(
      postData.likedByCurrentUser ? ((postData.userReaction as ReactionType) || 'like') : null
    );
  }, [postData.commentCount, postData.likeCount, postData.likedByCurrentUser, postData.userReaction]);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
      if (likesPopupRef.current && !likesPopupRef.current.contains(event.target as Node)) {
        setShowPostLikes(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const loadComments = async (append: boolean) => {
    try {
      if (append && !commentsCursor) return;
      const result = await fetchComments({
        postId: postData.id,
        limit: 20,
        before: append ? commentsCursor?.before : undefined,
        beforeId: append ? commentsCursor?.beforeId : undefined,
      }).unwrap();
      setComments((prev) => (append ? mergeById(prev, result.comments) : result.comments));
      setCommentsCursor(result.nextCursor || null);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load comments');
    }
  };

  const togglePostLike = async () => {
    try {
      if (postLiked) {
        await unlikePost({ postId: postData.id }).unwrap();
        setPostLiked(false);
        setSelectedReaction(null);
        setPostLikeCount((prev) => Math.max(0, prev - 1));
      } else {
        const reaction: ReactionType = selectedReaction || 'like';
        await likePost({ postId: postData.id, reactionType: reaction }).unwrap();
        setPostLiked(true);
        setSelectedReaction(reaction);
        setPostLikeCount((prev) => prev + 1);
      }
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update post like');
    }
  };

  const selectReaction = async (reaction: ReactionType) => {
    try {
      if (!postLiked) {
        await likePost({ postId: postData.id, reactionType: reaction }).unwrap();
        setPostLiked(true);
        setPostLikeCount((prev) => prev + 1);
      } else {
        await likePost({ postId: postData.id, reactionType: reaction }).unwrap();
      }
      setSelectedReaction(reaction);
      setShowReactionPicker(false);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to update post like');
    }
  };

  const handleCommentSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await createComment({ postId: postData.id, content: commentText.trim() }).unwrap();
      setCommentText('');
      setShowComments(true);
      setPostCommentCount((prev) => prev + 1);
      await loadComments(false);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to add comment');
    }
  };

  const handleShowPostLikes = async () => {
    if (showPostLikes) {
      setShowPostLikes(false);
      return;
    }
    try {
      const result = await fetchPostLikes({ postId: postData.id, limit: 10 }).unwrap();
      setPostLikedUsers(result.users);
      setShowPostLikes(true);
    } catch {
      toast.error('Failed to load post likes');
    }
  };

  const activeReaction = REACTIONS.find((reaction) => reaction.type === selectedReaction) || null;

  const normalizedPostImageUrl = postData.imageUrl ? normalizeLocalUploadUrl(postData.imageUrl) : '';

  return (
    <div className="_feed_inner_timeline_post_area _b_radious6 _padd_b24 _padd_t24 _mar_b16">
      <div className="_feed_inner_timeline_content _padd_r24 _padd_l24">
        <div className="_feed_inner_timeline_post_top">
          <div className="_feed_inner_timeline_post_box">
            <div className="_feed_inner_timeline_post_box_image">
              <img src="/assets/images/post_img.png" alt="" className="_post_img" />
            </div>
            <div className="_feed_inner_timeline_post_box_txt">
              <h4 className="_feed_inner_timeline_post_box_title">{fullName(postData.author)}</h4>
              <p className="_feed_inner_timeline_post_box_para">{formatTimeAgo(postData.createdAt)} . <a href="#0">{postData.visibility === 'private' ? '🔒 Private' : '🌐 Public'}</a></p>
            </div>
          </div>
          <div className="_feed_inner_timeline_post_box_dropdown" ref={dropdownRef}>
            <div className="_feed_timeline_post_dropdown">
              <button type="button" className="_feed_timeline_post_dropdown_link" onClick={() => setShowDropdown((v) => !v)}>
                <svg xmlns="http://www.w3.org/2000/svg" width="4" height="17" fill="none" viewBox="0 0 4 17"><circle cx="2" cy="2" r="2" fill="#C4C4C4" /><circle cx="2" cy="8" r="2" fill="#C4C4C4" /><circle cx="2" cy="15" r="2" fill="#C4C4C4" /></svg>
              </button>
            </div>
            <div className={`_feed_timeline_dropdown${showDropdown ? ' show' : ''}`}>
              <ul className="_feed_timeline_dropdown_list">
                <DropdownItem icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18"><path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14.25 15.75L9 12l-5.25 3.75v-12a1.5 1.5 0 011.5-1.5h7.5a1.5 1.5 0 011.5 1.5v12z"/></svg>} label="Save Post" onClick={() => { setShowDropdown(false); toast.message('Save Post'); }} />
                <DropdownItem icon={<svg xmlns="http://www.w3.org/2000/svg" width="20" height="22" fill="none" viewBox="0 0 20 22"><path fill="#377DFF" fillRule="evenodd" d="M7.547 19.55c.533.59 1.218.915 1.93.915.714 0 1.403-.324 1.938-.916a.777.777 0 011.09-.056c.318.284.344.77.058 1.084-.832.917-1.927 1.423-3.086 1.423h-.002c-1.155-.001-2.248-.506-3.077-1.424a.762.762 0 01.057-1.083.774.774 0 011.092.057z" clipRule="evenodd"/></svg>} label="Turn On Notification" onClick={() => { setShowDropdown(false); toast.message('Turn On Notification'); }} />
                <DropdownItem icon={<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 18 18"><path stroke="#1890FF" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.2" d="M14.25 2.25H3.75a1.5 1.5 0 00-1.5 1.5v10.5a1.5 1.5 0 001.5 1.5h10.5a1.5 1.5 0 001.5-1.5V3.75a1.5 1.5 0 00-1.5-1.5zM6.75 6.75l4.5 4.5M11.25 6.75l-4.5 4.5"/></svg>} label="Hide" onClick={() => { setShowDropdown(false); toast.message('Hide'); }} />
              </ul>
            </div>
          </div>
        </div>

        <h4 className="_feed_inner_timeline_post_title">{postData.content}</h4>
        {normalizedPostImageUrl && <div className="_feed_inner_timeline_image"><img src={normalizedPostImageUrl} alt="post image" className="_time_img" /></div>}
      </div>
      <div className="_feed_inner_timeline_total_reacts _padd_r24 _padd_l24 _mar_b26">
          <div style={{ position: 'relative' }} ref={likesPopupRef}>
            {(() => {
              // Derive top unique reaction types (max 3) from loaded users or current user
              const topTypes: ReactionType[] = [];
              if (postLikedUsers.length > 0) {
                for (const u of postLikedUsers) {
                  const t = (u.reactionType || 'like') as ReactionType;
                  if (!topTypes.includes(t)) topTypes.push(t);
                  if (topTypes.length === 3) break;
                }
              } else {
                if (selectedReaction) topTypes.push(selectedReaction);
                if (!topTypes.includes('like')) topTypes.push('like');
              }
              const reactionLabel = (() => {
                if (postLikeCount === 0) return null;
                if (postLiked && postLikeCount === 1) return 'You';
                if (postLiked && postLikeCount > 1) return `You and ${postLikeCount - 1} ${postLikeCount - 1 === 1 ? 'other' : 'others'}`;
                return `${postLikeCount}`;
              })();
              return (
                <div
                  className="_feed_inner_timeline_total_reacts_image"
                  style={{ cursor: postLikeCount > 0 ? 'pointer' : 'default', userSelect: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}
                  onClick={() => postLikeCount > 0 && void handleShowPostLikes()}
                  title={postLikeCount > 0 ? 'See who liked this' : undefined}
                >
                  {postLikeCount > 0 && (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {topTypes.slice(0, 3).map((type, i) => {
                          const r = REACTIONS.find((x) => x.type === type) || REACTIONS[0];
                          return (
                            <span key={type} style={{
                              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                              width: '20px', height: '20px', borderRadius: '50%',
                              background: r.color,
                              border: '2px solid var(--bg2)',
                              fontSize: '11px', lineHeight: 1, flexShrink: 0,
                              marginLeft: i > 0 ? '-6px' : '0',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.18)',
                              zIndex: 3 - i,
                              position: 'relative',
                            }}>{r.emoji}</span>
                          );
                        })}
                      </div>
                      <span style={{ fontSize: '14px', color: 'var(--color8, rgba(0,0,0,0.55))', fontWeight: 400, lineHeight: 1 }}>{reactionLabel}</span>
                    </>
                  )}
                </div>
              );
            })()}
            {showPostLikes && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 8px)', left: 0, zIndex: 100,
                background: 'var(--bg2)', borderRadius: '10px',
                boxShadow: '0 4px 20px rgba(0,0,0,0.18)', minWidth: '240px',
                overflow: 'hidden',
              }}>
                <div style={{
                  display: 'flex', alignItems: 'center', padding: '12px 16px',
                  borderBottom: '1px solid var(--color5)', gap: '6px',
                }}>
                  <span style={{ fontSize: '18px' }}>{activeReaction ? activeReaction.emoji : '👍'}</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color6)' }}>All · {postLikeCount}</span>
                  <button
                    type="button"
                    onClick={() => setShowPostLikes(false)}
                    style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#65676b', lineHeight: 1, padding: '0 2px' }}
                  >✕</button>
                </div>
                <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                  {postLikedUsers.map((u) => {
                    const initials = (fullName(u)[0] || '?').toUpperCase();
                    const userReaction = REACTIONS.find((r) => r.type === u.reactionType) || REACTIONS[0];
                    return (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 16px', gap: '10px' }}>
                        <div style={{
                          width: '36px', height: '36px', borderRadius: '50%', flexShrink: 0,
                          background: userReaction.color, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '14px', fontWeight: 700, color: '#fff', position: 'relative',
                        }}>
                          {initials}
                          <span style={{
                            position: 'absolute', bottom: '-2px', right: '-2px',
                            width: '16px', height: '16px', borderRadius: '50%',
                            background: userReaction.color, border: '1.5px solid var(--bg2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '9px',
                          }}>{userReaction.emoji}</span>
                        </div>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color6)' }}>{fullName(u)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
        </div>
        <div className="_feed_inner_timeline_total_reacts_txt">
          <p className="_feed_inner_timeline_total_reacts_para1"><a href="#0" onClick={(e) => { e.preventDefault(); const next = !showComments; setShowComments(next); if (next) void loadComments(false); }}><span>{postCommentCount}</span> Comment</a></p>
          <p className="_feed_inner_timeline_total_reacts_para2"><span>122</span> Share</p>
        </div>
      </div>

      <div className="_feed_inner_timeline_reaction _padd_r24 _padd_l24">
        <div className="_fb_like_reaction_wrap" onMouseEnter={() => setShowReactionPicker(true)} onMouseLeave={() => setShowReactionPicker(false)}>
          <button type="button" className={`_feed_inner_timeline_reaction_emoji _feed_reaction ${postLiked ? '_feed_reaction_active' : ''}`} onClick={() => void togglePostLike()} disabled={likingPost || unlikingPost}>
            <span className="_feed_inner_timeline_reaction_link"><span style={{ display: 'flex', alignItems: 'center', gap: '6px', ...(postLiked && activeReaction ? { color: activeReaction.color } : {}) }}>{postLiked ? <span className="_fb_reaction_btn_emoji" style={{ margin: 0 }}>{activeReaction?.emoji || '\u{1F44D}'}</span> : <LikeHandIcon />}{postLiked ? activeReaction?.label || 'Like' : 'Like'}</span></span>
          </button>
          <div className={`_fb_reaction_panel${showReactionPicker ? ' _fb_reaction_panel_show' : ''}`}>
            {REACTIONS.map((reaction) => (
              <button key={reaction.type} type="button" className="_fb_reaction_panel_btn" title={reaction.label} onClick={() => void selectReaction(reaction.type)}>{reaction.emoji}</button>
            ))}
          </div>
        </div>

        <button type="button" className="_feed_inner_timeline_reaction_comment _feed_reaction" onClick={() => { const next = !showComments; setShowComments(next); if (next) void loadComments(false); }}>
          <span className="_feed_inner_timeline_reaction_link"><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="21" height="21" fill="none" viewBox="0 0 21 21"><path stroke="#000" d="M1 10.5c0-.464 0-.696.009-.893A9 9 0 019.607 1.01C9.804 1 10.036 1 10.5 1v0c.464 0 .696 0 .893.009a9 9 0 018.598 8.598c.009.197.009.429.009.893v6.046c0 1.36 0 2.041-.317 2.535a2 2 0 01-.602.602c-.494.317-1.174.317-2.535.317H10.5c-.464 0-.696 0-.893-.009a9 9 0 01-8.598-8.598C1 11.196 1 10.964 1 10.5v0z"/><path stroke="#000" strokeLinecap="round" strokeLinejoin="round" d="M6.938 9.313h7.125M10.5 14.063h3.563"/></svg>Comment</span></span>
        </button>
        <button type="button" className="_feed_inner_timeline_reaction_share _feed_reaction" onClick={() => toast.message('Share feature is coming soon')}>
          <span className="_feed_inner_timeline_reaction_link"><span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><svg className="_reaction_svg" xmlns="http://www.w3.org/2000/svg" width="24" height="21" fill="none" viewBox="0 0 24 21"><path stroke="#000" strokeLinejoin="round" d="M23 10.5L12.917 1v5.429C3.267 6.429 1 13.258 1 20c2.785-3.52 5.248-5.429 11.917-5.429V20L23 10.5z"/></svg>Share</span></span>
        </button>
      </div>

      {showComments && (
        <>
          <div className="_feed_inner_timeline_cooment_area">
            <TimelineCommentInput value={commentText} onChange={setCommentText} onSubmit={handleCommentSubmit} />
          </div>
          <div className="_timline_comment_main">
            <div className="_previous_comment"><button type="button" className="_previous_comment_txt">View {comments.length} previous comments</button></div>
            {commentsLoading && comments.length === 0 ? (
              <p className="_feed_inner_timline_para">Loading comments...</p>
            ) : comments.length > 0 ? (
              <>
                {comments.map((comment) => <CommentItem key={comment.id} comment={comment} postId={postData.id} onRefresh={() => loadComments(false)} />)}
                {commentsCursor && <button type="button" className="_previous_comment_txt" onClick={() => void loadComments(true)} disabled={commentsLoading}>{commentsLoading ? 'Loading...' : 'Load more comments'}</button>}
              </>
            ) : (
              <p className="_feed_inner_timline_para">No comments yet.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
};
