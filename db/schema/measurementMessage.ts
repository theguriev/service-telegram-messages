import { Schema } from "mongoose";

const measurementMessageSchema = new Schema(
  {
    userId: {
      type: String,
      required: true,
      ref: "User",
    },
    measurements: {
      type: [{
        type: {
          type: String,
          required: true,
        },
        value: {
          type: Number,
          required: true,
        },
        lastValue: {
          type: Number,
          required: false,
        },
        startValue: {
          type: Number,
          required: false,
        },
        goal: {
          type: Number,
          required: false,
        },
      }],
      required: true,
    },
    receiverId: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default measurementMessageSchema;
