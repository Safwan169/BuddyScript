import mongoose, { Document, Schema, Types } from 'mongoose';

export type LikeTargetType = 'post' | 'comment' | 'reply';

export interface ILike extends Document {
  user: Types.ObjectId;
  targetType: LikeTargetType;
  targetId: Types.ObjectId;
  reactionType: string;
  createdAt: Date;
  updatedAt: Date;
}

const likeSchema = new Schema<ILike>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['post', 'comment', 'reply'],
      required: true,
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    reactionType: {
      type: String,
      default: 'like',
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

likeSchema.index({ user: 1, targetType: 1, targetId: 1 }, { unique: true });
likeSchema.index({ targetType: 1, targetId: 1, createdAt: -1, _id: -1 });

export const Like = mongoose.model<ILike>('Like', likeSchema);
