import mongoose from "mongoose";

const executionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    worker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Worker",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: [
        "QUEUED",
        "RUNNING",
        "WAITING_FOR_INPUT",
        "COMPLETED",
        "FAILED",
        "TIMEOUT",
      ],
      default: "QUEUED",
      index: true,
    },
    input: {
      type: String,
      required: true,
      trim: true,
    },
    output: {
      type: String,
      default: null,
    },
    model: {
      type: String,
      default: null,
    },
    workflowId: {
      type: String,
      default: null,
    },
    workflowData: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Durable workflow orchestration state. This is the source of truth for
    // pause/resume; tool-call history remains an audit trail only.
    workflowPlan: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    workflowCheckpoint: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    pendingInput: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    missingFields: {
      type: [String],
      default: [],
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
      category: {
        type: String,
        default: null,
      },
      retryable: {
        type: Boolean,
        default: false,
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
          enum: ["COMPLETED", "FAILED", "TIMEOUT", "WAITING_FOR_INPUT"],
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
          category: {
            type: String,
            default: null,
          },
          retryable: {
            type: Boolean,
            default: false,
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

executionSchema.index({ user: 1, createdAt: -1 });
executionSchema.index({ user: 1, worker: 1, createdAt: -1 });

const Execution = mongoose.model("Execution", executionSchema);

export default Execution;
