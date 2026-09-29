---
name: standup
agent: cortex
description: "Standup talking points — yesterday, today, blockers."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Prepare standup talking points.

1. Ask `sprint-ops` (if enabled) to query Jira `{{JIRA_PROJECT_KEY}}` for your in-progress stories changed since yesterday and any active blockers.
2. Ask `task-manager` to read the most recent `{{VAULT_ROOT}}/next-actions-*.md` for what you logged yesterday and the latest `priority-matrix-*.md` for today's focus.
3. Synthesize into three tight sections (2–3 bullets each):

- **Yesterday** — what completed
- **Today** — what you're picking up
- **Blockers** — with Jira links; flag who can unblock

Keep it under ~12 lines total. End with "Anything to add before standup?"
