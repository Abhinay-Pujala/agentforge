import { z } from "zod";

const workerFields = {
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),

  description: z
    .string()
    .trim()
    .min(1, "Description is required")
    .max(300, "Description must be at most 300 characters"),

  instructions: z.string().trim().min(1, "Instructions are required"),

  model: z.string().trim().min(1, "Model is required"),

  configuration: z.record(z.string(), z.unknown()).default({}),

  enabledTools: z.array(z.string().trim().min(1)).default([]),

  permissions: z.array(z.string().trim().min(1)).default([]),

  status: z.enum(["enabled", "disabled"]),
};

export const createWorkerSchema = z.object({
  body: z.object({
    name: workerFields.name,
    description: workerFields.description,
    instructions: workerFields.instructions,
    model: workerFields.model.optional(),
    configuration: workerFields.configuration.optional(),
    enabledTools: workerFields.enabledTools.optional(),
    permissions: workerFields.permissions.optional(),
    status: workerFields.status.optional(),
  }),
  params: z.object({}),
  query: z.object({}),
});

export const updateWorkerSchema = z.object({
  body: z
    .object({
      name: workerFields.name.optional(),
      description: workerFields.description.optional(),
      instructions: workerFields.instructions.optional(),
      model: workerFields.model.optional(),
      configuration: workerFields.configuration.optional(),
      enabledTools: workerFields.enabledTools.optional(),
      permissions: workerFields.permissions.optional(),
      status: workerFields.status.optional(),
    })
    .refine(
      (data) => Object.keys(data).length > 0,
      "At least one field is required for update",
    ),

  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid worker ID"),
  }),

  query: z.object({}),
});

export const workerIdSchema = z.object({
  body: z.object({}).optional(),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid worker ID"),
  }),
  query: z.object({}),
});
