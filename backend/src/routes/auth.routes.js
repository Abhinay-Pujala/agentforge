import express from "express";
import { syncUser } from "../controllers/auth.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.middleware.js";
import { syncUserSchema } from "../validators/auth.validator.js";

const router = express.Router();

router.post("/sync", protect, validate(syncUserSchema), syncUser);

export default router;
