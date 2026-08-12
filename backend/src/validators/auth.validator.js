import { z } from "zod";

export const syncUserSchema = z.object({
  body: z.object({}),
  params: z.object({}),
  query: z.object({}),
});
