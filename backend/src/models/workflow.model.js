import mongoose from "mongoose";

const workflowSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
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
    category: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    webhook: {
      provider: {
        type: String,
        enum: ["n8n"],
        required: true,
        default: "n8n",
      },
      url: {
        type: String,
        required: true,
        trim: true,
      },
    },
    status: {
      type: String,
      enum: ["enabled", "disabled"],
      default: "enabled",
    },
    permissions: {
      type: [String],
      default: [],
    },
    inputSchema: {
      type: mongoose.Schema.Types.Mixed,
      default: {
        type: "object",
        properties: {},
        additionalProperties: true,
      },
    },
  },
  {
    timestamps: true,
  },
);

workflowSchema.index({ owner: 1, name: 1 }, { unique: true });

const Workflow = mongoose.model("Workflow", workflowSchema);

export default Workflow;
