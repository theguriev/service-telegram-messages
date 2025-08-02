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
    didntSend: {
      type: Boolean,
      required: false,
    },
  },
  { timestamps: true }
);

export default messageSchema;
