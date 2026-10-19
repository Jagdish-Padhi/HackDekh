import mongoose, { Document, Schema } from 'mongoose';

export interface IPendingUser extends Document {
  username: string;
  email: string;
  fullName: string;
  password: string;
  verificationToken: string;
  verificationExpiry: Date;
  createdAt: Date;
}

const pendingUserSchema = new Schema<IPendingUser>(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      lowercase: true,
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
    },
    verificationToken: {
      type: String,
      required: true,
      index: true,
    },
    verificationExpiry: {
      type: Date,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: 86400,
    },
  },
  { timestamps: true }
);

export default mongoose.model<IPendingUser>('PendingUser', pendingUserSchema);
