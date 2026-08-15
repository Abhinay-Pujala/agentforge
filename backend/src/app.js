import express from "express";
import cors from "cors";
import authRoutes from "./routes/auth.routes.js";
import WorkerRoutes from "./routes/worker.routes.js";
import { errorHandler } from "./middleware/error.middleware.js";
import { notFound } from "./middleware/notFound.middleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "AgentForge API is running.",
  });
});

app.use("/api/auth", authRoutes);

app.use("/api/workers", WorkerRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
