'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useCreatePostMutation } from '@/features/feed/feedApi';
import { useUploadImageMutation } from '@/features/media/mediaApi';
import ComposerActionRow from './ComposerActionRow';

const PostField = () => {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [visibility, setVisibility] = useState<'public' | 'private'>('public');
  const [createPost, { isLoading }] = useCreatePostMutation();
  const [uploadImage, { isLoading: uploadingImage }] = useUploadImageMutation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const setSelectedImage = (file: File | null) => {
    if (!file) {
      return;
    }

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    if (previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(previewUrl);
    }

    setImageFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!content.trim()) {
      toast.error('Post text is required');
      return;
    }

    try {
      let finalImageUrl: string | undefined;

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploaded = await uploadImage(formData).unwrap();
        finalImageUrl = uploaded.imageUrl;
      }

      await createPost({
        content: content.trim(),
        imageUrl: finalImageUrl,
        visibility,
      }).unwrap();

      toast.success('Post created successfully');
      setContent('');
      setImageFile(null);
      if (previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
      setPreviewUrl('');
    } catch (error: any) {
      toast.error(error?.data?.message || 'Failed to create post');
    }
  };

  const handleFeatureNotReady = (feature: string) => {
    toast.message(`${feature} composer is coming soon`);
  };

  const submitting = isLoading || uploadingImage;

  return (
    <div className="_feed_inner_text_area _b_radious6 _padd_b24 _padd_t24 _padd_r24 _padd_l24 _mar_b16">
      <form onSubmit={handleSubmit}>
        <div className="_feed_inner_text_area_box">
          <div className="_feed_inner_text_area_box_image">
            <img src="/assets/images/txt_img.png" alt="Profile" className="_txt_img" />
          </div>
          <div className="form-floating _feed_inner_text_area_box_form">
            <textarea
              className="form-control _textarea"
              placeholder="Leave a comment here"
              id="feed-post-composer"
              value={content}
              onChange={(event) => setContent(event.target.value)}
            />
            <label className="_feed_textarea_label" htmlFor="feed-post-composer">
              Write something ...
              <svg xmlns="http://www.w3.org/2000/svg" width="23" height="24" fill="none" viewBox="0 0 23 24">
                <path
                  fill="#666"
                  d="M19.504 19.209c.332 0 .601.289.601.646 0 .326-.226.596-.52.64l-.081.005h-6.276c-.332 0-.602-.289-.602-.645 0-.327.227-.597.52-.64l.082-.006h6.276zM13.4 4.417c1.139-1.223 2.986-1.223 4.125 0l1.182 1.268c1.14 1.223 1.14 3.205 0 4.427L9.82 19.649a2.619 2.619 0 01-1.916.85h-3.64c-.337 0-.61-.298-.6-.66l.09-3.941a3.019 3.019 0 01.794-1.982l8.852-9.5zm-.688 2.562l-7.313 7.85a1.68 1.68 0 00-.441 1.101l-.077 3.278h3.023c.356 0 .698-.133.968-.376l.098-.096 7.35-7.887-3.608-3.87zm3.962-1.65a1.633 1.633 0 00-2.423 0l-.688.737 3.606 3.87.688-.737c.631-.678.666-1.755.105-2.477l-.105-.124-1.183-1.268z"
                />
              </svg>
            </label>
          </div>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="d-none"
          onChange={(event) => setSelectedImage(event.target.files?.[0] || null)}
        />

        {previewUrl && (
          <div className="mt-3">
            <img
              src={previewUrl}
              alt="Post preview"
              style={{ maxHeight: '180px', objectFit: 'cover', borderRadius: '8px' }}
            />
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', padding: '8px 0 4px' }}>
          <button
            type="button"
            className="_feed_inner_text_area_bottom_photo_link"
            style={{ fontSize: '13px', padding: '4px 10px', border: '1px solid var(--color5)', borderRadius: '4px' }}
            onClick={() => setVisibility((v) => (v === 'public' ? 'private' : 'public'))}
          >
            {visibility === 'public' ? '🌐 Public' : '🔒 Private'}
          </button>
        </div>

        <ComposerActionRow
          mode="desktop"
          onPhotoClick={() => fileInputRef.current?.click()}
          onVideoClick={() => handleFeatureNotReady('Video')}
          onEventClick={() => handleFeatureNotReady('Event')}
          onArticleClick={() => handleFeatureNotReady('Article')}
          submitting={submitting}
        />

        <div className="_feed_inner_text_area_bottom_mobile">
          <div className="_feed_inner_text_mobile">
            <ComposerActionRow
              mode="mobile"
              onPhotoClick={() => fileInputRef.current?.click()}
              onVideoClick={() => handleFeatureNotReady('Video')}
              onEventClick={() => handleFeatureNotReady('Event')}
              onArticleClick={() => handleFeatureNotReady('Article')}
              submitting={submitting}
            />
          </div>
        </div>
      </form>
    </div>
  );
};

export default PostField;
