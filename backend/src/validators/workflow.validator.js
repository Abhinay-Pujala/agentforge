import { z } from "zod";

const workflowBody = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().min(1).max(300),
  category: z.string().trim().min(1).max(50),
  webhook: z.object({
    provider: z.literal("n8n"),
    url: z.string().trim().url(),
  }),
  status: z.enum(["enabled", "disabled"]).optional(),
  permissions: z.array(z.string().trim().min(1)).default([]),
  inputSchema: z.record(z.string(), z.unknown()).default({
    type: "object",
    properties: {},
    additionalProperties: true,
  }),
});

export const createWorkflowSchema = z.object({
  body: workflowBody,
  params: z.object({}),
  query: z.object({}),
});

export const updateWorkflowSchema = z.object({
  body: workflowBody.partial().refine(
    (data) => Object.keys(data).length > 0,
    "At least one field is required for update",
  ),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workflow ID"),
  }),
  query: z.object({}),
});

export const workflowIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid workflow ID"),
  }),
  query: z.object({}),
});

export const getWorkflowsSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({}),
  query: z.object({
    status: z.enum(["enabled", "disabled"]).optional(),
    category: z.string().trim().optional(),
  }),
});
