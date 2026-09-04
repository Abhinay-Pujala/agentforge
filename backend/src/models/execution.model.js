import mongoose from "mongoose";

const executionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
    },
    status: {
      type: String,
      enum: ["QUEUED", "RUNNING", "COMPLETED", "FAILED", "TIMEOUT"],
      default: "QUEUED",
    },
    input: {
      type: String,
      required: true,
    },
    output: {
      type: String,
      default: null,
    },
    model: {
      type: String,
      default: null,
    },
    startedAt: {
      type: Date,
      default: null,
    },
    completedAt: {
      type: Date,
      default: null,
    },
    durationMs: {
      type: Number,
      default: null,
    },
    error: {
      message: {
        type: String,
        default: null,
      },
      code: {
        type: String,
        default: null,
      },
    },
    usage: {
      promptTokens: {
        type: Number,
        default: null,
      },
      completionTokens: {
        type: Number,
        default: null,
      },
      totalTokens: {
        type: Number,
        default: null,
      },
    },
    cost: {
      type: Number,
      default: null,
    },
    toolCalls: [
      {
        id: {
          type: String,
          required: true,
        },
        tool: {
          type: String,
          required: true,
        },
        arguments: {
          type: mongoose.Schema.Types.Mixed,
          default: {},
        },
        result: {
          type: mongoose.Schema.Types.Mixed,
          default: null,
        },
        status: {
          type: String,
          enum: ["COMPLETED", "FAILED", "TIMEOUT"],
          required: true,
        },
        error: {
          message: {
            type: String,
            default: null,
          },
          code: {
            type: String,
            default: null,
          },
        },
        durationMs: {
          type: Number,
          default: null,
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  {
    timestamps: true,
  },
);

const Execution = mongoose.model("Execution", executionSchema);

export default Execution;
