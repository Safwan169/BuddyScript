'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { PostComponent } from '../ui/PostCard';
import FeedStories from './FeedStories';
import PostField from './PostField';
import { useGetFeedQuery, useLazyGetFeedQuery } from '@/features/feed/feedApi';
import type { FeedCursor, FeedPost } from '@/types/api';

const mergeUniquePosts = (existing: FeedPost[], incoming: FeedPost[]): FeedPost[] => {
  const byId = new Map(existing.map((post) => [post.id, post]));
  const merged = [...existing];

  for (const post of incoming) {
    if (byId.has(post.id)) {
      const index = merged.findIndex((item) => item.id === post.id);
      if (index >= 0) {
        merged[index] = post;
      }
      continue;
    }

    byId.set(post.id, post);
    merged.push(post);
  }

  return merged;
};

const MAX_RENDERED_POSTS = 200;

const keepRenderableWindow = (posts: FeedPost[]): FeedPost[] => {
  if (posts.length <= MAX_RENDERED_POSTS) {
    return posts;
  }

  // Keep the newest posts in memory/DOM to prevent long-session UI slowdown.
  return posts.slice(0, MAX_RENDERED_POSTS);
};

const MiddleLayout = () => {
  const { data, isLoading } = useGetFeedQuery({ limit: 20 });
  const [fetchFeedPage, { isFetching: loadingMore }] = useLazyGetFeedQuery();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [nextCursor, setNextCursor] = useState<FeedCursor | null>(null);

  useEffect(() => {
    if (!data) {
      return;
    }

    setPosts(keepRenderableWindow(data.posts));
    setNextCursor(data.nextCursor || null);
  }, [data]);

  const canLoadMore = Boolean(nextCursor);

  const handleLoadMore = async () => {
    if (!nextCursor) {
      return;
    }

    try {
      const result = await fetchFeedPage({
        limit: 20,
        before: nextCursor.before,
        beforeId: nextCursor.beforeId,
      }).unwrap();

      setPosts((prev) => keepRenderableWindow(mergeUniquePosts(prev, result.posts)));
      setNextCursor(result.nextCursor || null);
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to load more posts');
    }
  };

  return (
    <div className="col-xl-6 col-lg-6 col-md-12 col-sm-12">
      <div className="_layout_middle_wrap">
        <div className="_layout_middle_inner">
          <FeedStories />
          <PostField />

          {isLoading ? (
            <div className="text-center py-4">Loading feed...</div>
          ) : posts.length > 0 ? (
            <>
              {posts.map((post) => (
                <PostComponent key={post.id} postData={post} />
              ))}

              {canLoadMore && (
                <div className="d-flex justify-content-center py-3">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={handleLoadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Loading...' : 'Load More'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">No posts yet. Create the first post.</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MiddleLayout;
