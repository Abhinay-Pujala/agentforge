import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  getExecution,
  getExecutionHistory,
} from "../controllers/execution.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  executionIdSchema,
  getExecutionsSchema,
} from "../validators/execution.validator.js";

const router = express.Router();

router.get("/", protect, validate(getExecutionsSchema), getExecutionHistory);

router.get("/:id", protect, validate(executionIdSchema), getExecution);

export default router;
