import mongoose, { Document, Schema, Types } from 'mongoose';

export type PostVisibility = 'public' | 'private';

export interface IPost extends Document {
  author: Types.ObjectId;
  content: string;
  imageUrl?: string;
  visibility: PostVisibility;
  likeCount: number;
  commentCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const postSchema = new Schema<IPost>(
  {
    author: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    content: {
      type: String,
      required: [true, 'Post content is required'],
      trim: true,
      maxlength: [5000, 'Post content cannot exceed 5000 characters'],
    },
    imageUrl: {
      type: String,
      trim: true,
      maxlength: [2000, 'Image URL cannot exceed 2000 characters'],
    },
    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
      index: true,
    },
    likeCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    commentCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform: (_doc, ret: any) => {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

postSchema.index({ visibility: 1, createdAt: -1, _id: -1 });
postSchema.index({ author: 1, createdAt: -1, _id: -1 });
postSchema.index({ createdAt: -1, _id: -1 });

export const Post = mongoose.model<IPost>('Post', postSchema);
