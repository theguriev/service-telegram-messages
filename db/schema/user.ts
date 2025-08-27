import { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    id: Number,
    firstName: String,
    lastName: String,
    username: String,
    photoUrl: String,
    authDate: Number,
    hash: String,
    role: String,
    privateKey: { type: String, select: false },
    address: String,
    meta: {
      type: Map,
      of: Schema.Types.Mixed,
    },
  },
  { timestamps: true }
);

export default userSchema;
