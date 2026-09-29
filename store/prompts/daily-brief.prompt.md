---
name: daily-brief
agent: cortex
description: "Morning briefing — parallel specialist dispatch + synthesis, through your role-lens."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Run a daily brief through Cortex's task intent check and `{{CORTEX_HOME}}/_shared/conventions.md`. Default to advice in the conversation; saving or changing records needs explicit permission. Use supplied role context or the relevant part of `{{VAULT_ROOT}}/config.md` when needed. Pass the task packet and Allowed effects to each relevant enabled specialist.

## Step 1 — Dispatch in parallel

For a full brief, dispatch the relevant enabled specialists concurrently in a single message; for a narrower request, select only the needed owners. Keep shared packet references and ask each for evidence-backed findings without duplicated context:

- **`task-manager`** → "Read the most recent `{{VAULT_ROOT}}/priority-matrix-*.md` and `next-actions-*.md`. Return today's top items grouped by priority with source + brief context. ≤12 lines."
- **`meeting-prep`** → "List today's meetings from `{{VAULT_ROOT}}/04-meetings/` (or calendar integration if configured). For each: time, attendees, prep needed?, open pre-reads. ≤10 lines."
- **`sprint-ops`** (if enabled) → "Query Jira for `{{JIRA_PROJECT_KEY}}`: active blockers and stories stuck >3 days. Return both with links. If `openSprints()` is empty, fall back to `assignee = currentUser() AND statusCategory != Done AND updated >= -7d`."
- **`one-on-one`** (if enabled) → "From `{{VAULT_ROOT}}/01-people/`, return overdue 1:1 follow-ups and anyone not met within cadence. One line each."
- **`initiative-tracker`** → "Read `{{VAULT_ROOT}}/03-initiatives/03-initiatives.md`. Return initiatives with milestones in the next 14 days and any with no update >2 weeks. One line each."

## Step 2 — Attribute

Follow the shared narration protocol and attribute sources in the synthesis. Do not repeat each specialist's full output before the consolidated brief. Retain material evidence gaps even when the user requests a concise answer.

## Step 3 — Synthesize

Add a `─── Synthesis ───` separator, then produce the brief **through the role-lens**:

- **🔴 Urgent** — blockers, escalations, overdue (≤3 bullets)
- **🟡 Today** — meetings needing prep, commitments, stuck items (≤4 bullets)
- **🟢 Track** — initiatives, follow-ups, planning (≤3 bullets)
- **Cross-domain connections** — links no single specialist could see.

Close with material caveats or the next action. Ask a closing question only when a decision remains unresolved.

## Notes

- If a specialist fails (integration down, vault missing), continue with the others and note the gap.
- If the `Task`/subagent capability isn't available, fall back to serial execution: read the vault, query Jira, then synthesize.
