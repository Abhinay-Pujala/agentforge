import { z } from "zod";

const executionStatuses = [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "TIMEOUT",
];

export const getExecutionsSchema = z.object({
  query: z.object({
    workerId: z.string().optional(),
    status: z.enum(executionStatuses).optional(),
    page: z.coerce.number().int().min(1).optional(),
    limit: z.coerce.number().int().min(1).max(100).optional(),
  }),
});

export const executionIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
