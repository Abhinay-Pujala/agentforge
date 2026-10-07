import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import {
  createWorker,
  deleteWorker,
  getWorkerById,
  getWorkers,
  updateWorker,
  runWorker,
} from "../controllers/worker.controller.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createWorkerSchema,
  updateWorkerSchema,
  workerIdSchema,
} from "../validators/worker.validator.js";
import { workerExecutionSchema } from "../validators/worker-execution.validator.js";

const router = express.Router();

router.post("/", protect, validate(createWorkerSchema), createWorker);

router.get("/", protect, getWorkers);

router.get("/:id", protect, validate(workerIdSchema), getWorkerById);

router.put("/:id", protect, validate(updateWorkerSchema), updateWorker);

router.delete("/:id", protect, validate(workerIdSchema), deleteWorker);

router.post("/:id/run", protect, validate(workerExecutionSchema), runWorker);

export default router;
