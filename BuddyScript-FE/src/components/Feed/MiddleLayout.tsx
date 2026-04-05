'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { PostComponent } from '../ui/PostCard';
import FeedStories from './FeedStories';
import PostField from './PostField';
import { useGetFeedQuery, useLazyGetFeedQuery } from '@/features/feed/feedApi';
import type { FeedCursor, FeedPost } from '@/types/api';

const mergeUniquePosts = (existing: FeedPost[], incoming: FeedPost[]): FeedPost[] => {
  const map = new Map<string, FeedPost>();

  for (const post of existing) {
    map.set(post.id, post);
  }

  for (const post of incoming) {
    map.set(post.id, post);
  }

  return Array.from(map.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
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

    setPosts(data.posts);
    setNextCursor(data.nextCursor || null);
  }, [data]);

  const canLoadMore = Boolean(nextCursor);

  const sortedPosts = useMemo(
    () => [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [posts]
  );

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

      setPosts((prev) => mergeUniquePosts(prev, result.posts));
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
          ) : sortedPosts.length > 0 ? (
            <>
              {sortedPosts.map((post) => (
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
