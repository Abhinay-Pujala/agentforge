import express from "express";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import {
  createWorkflowController,
  deleteWorkflowController,
  getWorkflow,
  getWorkflowList,
  updateWorkflowController,
} from "../controllers/workflow.controller.js";
import {
  createWorkflowSchema,
  getWorkflowsSchema,
  updateWorkflowSchema,
  workflowIdSchema,
} from "../validators/workflow.validator.js";

const router = express.Router();

router.post("/", protect, validate(createWorkflowSchema), createWorkflowController);
router.get("/", protect, validate(getWorkflowsSchema), getWorkflowList);
router.get("/:id", protect, validate(workflowIdSchema), getWorkflow);
router.put("/:id", protect, validate(updateWorkflowSchema), updateWorkflowController);
router.delete("/:id", protect, validate(workflowIdSchema), deleteWorkflowController);

export default router;
