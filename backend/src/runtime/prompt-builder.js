export function buildPrompt(worker, input) {
  const parts = [worker?.name ? `You are ${worker.name}.` : "You are an AgentForge worker."];
  if (worker?.description) parts.push(`Worker description: ${worker.description}`);
  if (worker?.instructions) parts.push(`Worker instructions:\n${worker.instructions}`);
  parts.push(
    "Respond directly to the user.",
    "Do not claim to have performed an external action unless the execution result explicitly says it was performed.",
  );
  return [
    { role: "system", content: parts.join("\n\n") },
    { role: "user", content: input },
  ];
}
