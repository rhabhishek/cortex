---
name: weekly-review
agent: cortex
description: "End-of-week review with carry-forward analysis, through your role-lens."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Run a weekly review through Cortex's task intent check and `{{CORTEX_HOME}}/_shared/conventions.md`. Default to advice in the conversation; saving or changing records needs explicit permission. Reuse supplied role context or read the relevant config slice, and dispatch only needed enabled specialists. Pass the task packet and Allowed effects with each slice; synthesize once rather than repeating every report.

1. **`task-manager`** → read the most recent `{{VAULT_ROOT}}/next-actions-*.md` for this week's activity and completed items.
2. **`sprint-ops`** (if enabled) → Jira `{{JIRA_PROJECT_KEY}}` sprint progress, velocity (per-sprint via the Agile API, not a flat `closedSprints()` search), and what completed.
3. **`planning-portfolio`** (if enabled) → epic/story status vs quarterly goals.
4. **`one-on-one`** (if enabled) → pending follow-ups across the team/reports.

Synthesize:

- **Done this week** — completed across domains
- **Carried forward** — what slipped, with reasons
- **Risks & blockers** — active impediments + cross-domain issues
- **Next week priorities** — recommended focus (through the role-lens)

Close with material caveats or the next action. Ask a closing question only when a decision remains unresolved.
