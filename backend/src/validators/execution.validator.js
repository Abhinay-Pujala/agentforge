import { z } from "zod";

const executionStatuses = [
  "QUEUED",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "TIMEOUT",
];

export const getExecutionsSchema = z.object({
  query: z
    .object({
      workerId: z.string().optional(),
      status: z.enum(executionStatuses).optional(),
      from: z.coerce.date().optional(),
      to: z.coerce.date().optional(),
      page: z.coerce.number().int().min(1).optional(),
      limit: z.coerce.number().int().min(1).max(100).optional(),
    })
    .refine(
      (query) => {
        if (!query.from || !query.to) {
          return true;
        }

        return query.from <= query.to;
      },
      {
        message: "'from' date must be before or equal to 'to' date.",
        path: ["from"],
      },
    ),
});

export const executionIdSchema = z.object({
  params: z.object({
    id: z.string().min(1),
  }),
});
