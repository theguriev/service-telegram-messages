import { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    content: {
      type: String,
      required: true,
    },
    receiverId: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default messageSchema;
