const ACTIONS = new Map([
  ["search", ["search","find","lookup","check","show","view","list","read","get","retrieve","fetch"]],
  ["reply", ["reply","respond"]],
  ["send", ["send","deliver","forward"]],
  ["draft", ["draft","compose","write"]],
  ["create", ["create","add","make","book"]],
  ["update", ["update","edit","change","modify","reschedule"]],
  ["delete", ["delete","remove","cancel"]],
  ["schedule", ["schedule","book","arrange"]],
  ["run", ["run","execute","trigger","perform"]],
]);

const DOMAINS = {
  email: ["email","emails","mail","gmail","inbox","message","messages"],
  calendar: ["calendar","meeting","meetings","event","events","appointment","appointments"],
  sheets: ["sheet","sheets","spreadsheet","spreadsheets"],
  github: ["github","repository","repo","pull","issue","commit"],
  notion: ["notion","page","pages","database","databases"],
  discord: ["discord","channel","channels","server"],
  slack: ["slack","channel","channels","workspace"],
};

const KNOWLEDGE = [
  /^(hi|hello|hey|yo|thanks|thank you|good morning|good afternoon|good evening)[!.\s]*$/i,
  /^(what is|what are|who is|who are|why is|why are|explain|tell me about)\b/i,
  /^(how do i|how can i|can you explain|could you explain)\b/i,
];

function tokens(value) {
  return [...new Set(String(value || "").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean))];
}
function workflowText(workflow) {
  return tokens([workflow.name, workflow.description, workflow.category, ...(workflow.capabilities || [])].join(" "));
}
function domainFor(workflow) {
  const haystack = new Set(workflowText(workflow));
  for (const [domain, aliases] of Object.entries(DOMAINS)) {
    if (aliases.some((alias) => haystack.has(alias))) return domain;
  }
  return String(workflow.category || "").toLowerCase();
}
function actionMatches(workflow, inputTokens) {
  const caps = new Set(tokens((workflow.capabilities || []).join(" ")));
  return [...ACTIONS.entries()].reduce((score, [action, aliases]) => {
    if (!aliases.some((alias) => inputTokens.has(alias))) return score;
    return score + (aliases.some((alias) => caps.has(alias)) ? 12 : 0);
  }, 0);
}
function score(workflow, input) {
  const inputTokens = new Set(tokens(input));
  const text = new Set(workflowText(workflow));
  let value = 0;
  for (const token of inputTokens) if (text.has(token)) value += 2;
  value += actionMatches(workflow, inputTokens);
  const domain = domainFor(workflow);
  if (DOMAINS[domain]?.some((alias) => inputTokens.has(alias))) value += 15;
  return value;
}

export function routeWorkflow(input, workflowCatalog = []) {
  const text = String(input || "").trim();
  if (!text || !Array.isArray(workflowCatalog) || workflowCatalog.length === 0) {
    return { needsWorkflow: false, workflow: null, reason: "NO_WORKFLOWS" };
  }

  const inputTokens = new Set(tokens(text));
  const hasAction = [...ACTIONS.values()].some((aliases) => aliases.some((word) => inputTokens.has(word)));
  const hasQueryAction = ["show","list","check","find","search","get","fetch","retrieve","read","view","see","latest","recent","unread","today","tomorrow","upcoming"].some((word) => inputTokens.has(word));

  if (KNOWLEDGE.some((pattern) => pattern.test(text)) && !hasAction && !hasQueryAction) {
    return { needsWorkflow: false, workflow: null, reason: "NORMAL_CONVERSATION" };
  }

  const ranked = workflowCatalog
    .filter((workflow) => workflow?.status !== "disabled")
    .map((workflow) => ({ workflow, score: score(workflow, text) }))
    .filter((item) => item.score > 0)
    .sort((a,b) => b.score - a.score);

  if (!ranked.length) return { needsWorkflow: false, workflow: null, reason: "NO_MATCH" };

  const best = ranked[0];
  const second = ranked[1];
  if (second && best.score === second.score) {
    return {
      needsWorkflow: false, workflow: null, reason: "AMBIGUOUS",
      candidates: ranked.slice(0,5).map(({workflow, score}) => ({ workflowId: workflow.id, workflowName: workflow.name, score })),
    };
  }

  const domain = domainFor(best.workflow);
  const hasDomain = DOMAINS[domain]?.some((alias) => inputTokens.has(alias));
  if (!hasAction && !hasQueryAction && !hasDomain) {
    return { needsWorkflow: false, workflow: null, reason: "NOT_ACTIONABLE" };
  }

  return { needsWorkflow: true, workflow: best.workflow, reason: "WORKFLOW_MATCH", score: best.score };
}
