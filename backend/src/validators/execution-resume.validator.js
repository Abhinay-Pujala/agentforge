import { z } from "zod";

export const executionResumeSchema = z.object({
  body: z.object({
    input: z.string().trim().min(1, "Additional input is required"),
  }),
  params: z.object({
    id: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid worker ID"),
    executionId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid execution ID"),
  }),
  query: z.object({}),
});
