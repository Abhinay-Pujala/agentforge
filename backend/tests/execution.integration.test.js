import { describe, it, expect, beforeEach } from "vitest";
import mongoose from "mongoose";
import Execution from "../src/models/execution.model.js";

describe("Execution Integration", () => {
  let userId;
  let workerId;

  beforeEach(() => {
    userId = new mongoose.Types.ObjectId();
    workerId = new mongoose.Types.ObjectId();
  });

  it("persists a new execution with QUEUED status", async () => {
    const execution = await Execution.create({
      user: userId,
      worker: workerId,
      input: "Run integration test",
      model: "test-model",
    });

    expect(execution._id).toBeDefined();
    expect(execution.status).toBe("QUEUED");

    const savedExecution = await Execution.findById(execution._id);

    expect(savedExecution).not.toBeNull();
    expect(savedExecution.user.toString()).toBe(userId.toString());
    expect(savedExecution.worker.toString()).toBe(workerId.toString());
    expect(savedExecution.input).toBe("Run integration test");
    expect(savedExecution.model).toBe("test-model");
  });

  it("persists a QUEUED to RUNNING transition", async () => {
    const execution = await Execution.create({
      user: userId,
      worker: workerId,
      input: "Lifecycle test",
    });

    execution.status = "RUNNING";
    execution.startedAt = new Date();

    await execution.save();

    const updatedExecution = await Execution.findById(execution._id);

    expect(updatedExecution.status).toBe("RUNNING");
    expect(updatedExecution.startedAt).toBeInstanceOf(Date);
  });

  it("persists a completed execution with result metadata", async () => {
    const execution = await Execution.create({
      user: userId,
      worker: workerId,
      input: "Completion test",
      status: "RUNNING",
      startedAt: new Date(),
    });

    execution.status = "COMPLETED";
    execution.output = "Execution completed successfully";
    execution.completedAt = new Date();
    execution.durationMs = 1250;
    execution.usage = {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150,
    };
    execution.cost = 0.0025;

    await execution.save();

    const completedExecution = await Execution.findById(execution._id);

    expect(completedExecution.status).toBe("COMPLETED");
    expect(completedExecution.output).toBe("Execution completed successfully");
    expect(completedExecution.durationMs).toBe(1250);
    expect(completedExecution.usage.promptTokens).toBe(100);
    expect(completedExecution.usage.completionTokens).toBe(50);
    expect(completedExecution.usage.totalTokens).toBe(150);
    expect(completedExecution.cost).toBe(0.0025);
    expect(completedExecution.completedAt).toBeInstanceOf(Date);
  });

  it("persists a failed execution with normalized error data", async () => {
    const execution = await Execution.create({
      user: userId,
      worker: workerId,
      input: "Failure test",
    });

    execution.status = "FAILED";
    execution.error = {
      message: "Provider request failed",
      code: "PROVIDER_ERROR",
    };

    await execution.save();

    const failedExecution = await Execution.findById(execution._id);

    expect(failedExecution.status).toBe("FAILED");
    expect(failedExecution.error.message).toBe("Provider request failed");
    expect(failedExecution.error.code).toBe("PROVIDER_ERROR");
  });

  it("persists a timeout execution", async () => {
    const execution = await Execution.create({
      user: userId,
      worker: workerId,
      input: "Timeout test",
    });

    execution.status = "TIMEOUT";
    execution.error = {
      message: "Execution timed out",
      code: "TIMEOUT",
    };

    await execution.save();

    const timeoutExecution = await Execution.findById(execution._id);

    expect(timeoutExecution.status).toBe("TIMEOUT");
    expect(timeoutExecution.error.message).toBe("Execution timed out");
    expect(timeoutExecution.error.code).toBe("TIMEOUT");
  });
});
