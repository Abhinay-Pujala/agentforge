import mongoose from "mongoose";

const workerSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },
    description: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },
    instructions: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      default: "gemini-3.6-flash-lite",
      trim: true,
    },
    configuration: {
      type: Object,
      default: {},
    },
    status: {
      type: String,
      enum: ["enabled", "disabled"],
      default: "enabled",
    },
  },
  {
    timestamps: true,
  },
);

const Worker = mongoose.model("Worker", workerSchema);

export default Worker;
