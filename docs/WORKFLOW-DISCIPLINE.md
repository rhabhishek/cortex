# Workflow discipline

Cortex follows task intent, permissions, specialist ownership, and verified evidence. External coaching tools provide optional recommendations, not runtime dependencies, gates, or quotas. A long session or cross-domain brief is not inherently unproductive; missing telemetry is not a demonstrated behavior defect. No session data is shipped with Cortex.

## Contract

The Cortex agent owns routing, and shared operating conventions own the compact task packet: Intent, Goal, Anchor, Constraints / non-goals, Acceptance evidence, and Allowed effects. Router examples are an optional reference. The same packet reaches each specialist or top-level Forge without prescribing its implementation strategy or expanding permissions.

Answer/advice is read-only by default. An explicit saved artifact permits only that destination, not other vault changes or publication. Role context is retrieved only when relevant; fresh Jira facts still come from the domain owner, never a cached vault summary. Briefs synthesize once with attribution and explicit gaps. Existing host model defaults are preserved; no coaching signal automatically changes models or effort.

Repeated actions without new evidence trigger a checkpoint and a materially corrected check or a partial result. Permission failures are not bypassed; uncertain mutations are reconciled before retry. A resume packet carries current task fields, artifacts, evidence freshness, unknowns, and the next action. Save it only when authorized, and revalidate live facts and permissions on resume. Keep related work together; do not clear chat or create sessions to satisfy a heuristic.

## Parallel delegation

Cortex dispatches every relevant independent specialist slice together and asks specialists to parallelize independent reads, live lookups, and evidence checks inside their slice. A specialist may edit several files directly within its own task without a separate worktree. Separate isolated worktrees or branches are for multiple concurrent writers that could otherwise clobber the same tree, not merely disjoint files. Only true dependencies, shared resources, host capacity, context quality, or explicit user constraints make work serial. There is no arbitrary specialist, tool, file, or message cap; one reroute per sub-question remains an anti-loop guard.

## Validation

`node --test test/workflow.test.mjs test/install.test.mjs` checks rendered intent ordering, handoff fields, shared-reference resolution, brief permissions, and existing model defaults across adapters and personas. The full suite covers core and installation behavior. These are instruction-contract tests, not proof of model compliance or host-level enforcement.

Use a disposable vault, read-only integrations, and host tool policies to evaluate runtime behavior:

| Request or situation | Expected behavior |
| --- | --- |
| Explain the previous recommendation | Answer from sufficient supplied evidence without another briefing or vault scan |
| A daily/weekly brief, no saves | Only relevant owners; fresh live facts; one synthesis; no notes, tasks, or checkpoints written |
| Save a draft to a named note | Only the authorized note changes; no implied publication |
| Hand off an engineering plan, no code changes | Top-level intent-aware Forge receives advice and the same restrictions |
| Hand off implementation | Forge owns decomposition, applicable verification, and independent review; Cortex does not prescribe strategy |
| Repeated failed lookup or ambiguous mutation outcome | Correct a material cause or return a gap; reconcile state before retrying |
| A long, useful cross-domain task | Preserve legitimate progress; no tool/message quota or automatic reset |
| A real task switch or resumed session | Compact packet, current permissions, and refreshed live facts; no replay of completed work |

Log observed tool effects and distinguish enforced host restrictions from guidance-only behavior. Optional evaluation should compare like task types and include retries and delegated work while preserving accuracy, permissions, and useful outputs. Aggregate scores, raw activity volume, and missing cache fields are not success criteria.