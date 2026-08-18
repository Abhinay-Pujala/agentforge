import { z } from "zod";

export const workerExecutionSchema = z.object({
  body: z.object({
    input: z.string().trim().min(1, "Input is required"),
  }),

  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid worker ID"),
  }),

  query: z.object({}),
});
