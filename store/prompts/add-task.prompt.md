---
name: add-task
agent: cortex
description: "Quick-add a task to the priority matrix."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Add the following task to my priority matrix: $input

1. Read the most recent `{{VAULT_ROOT}}/priority-matrix-*.md`.
2. Determine the appropriate quadrant (🔴 Urgent+Important / 🟡 Important+Not-Urgent / 🟠 Urgent+Not-Important / ⚪ Backlog).
3. Dedupe — if it already exists, refine that row instead of adding a duplicate (idempotent).
4. Write the updated file.

Confirm what was added and where.
