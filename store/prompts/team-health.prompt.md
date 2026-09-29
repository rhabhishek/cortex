---
name: team-health
agent: cortex
description: "Team health dashboard — parallel specialist dispatch + synthesis."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Generate a team health overview using **parallel specialist dispatch**. Only dispatch specialists enabled for the active profile.

## Step 1 — Dispatch in parallel

In a **single message**, dispatch these specialists concurrently (do not await between them):

1. **`one-on-one`** → "Read all people profiles in `{{VAULT_ROOT}}/01-people/` and the most recent `{{VAULT_ROOT}}/people-follow-ups-*.md`. For each person, return: name, role, last 1:1 date, days since last 1:1, open follow-ups (count + oldest), growth-goal / SME-area status, and any flagged concerns from recent notes."
2. **`sprint-ops`** (if enabled) → "Query Jira workload across the current sprint: `project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() ORDER BY assignee ASC`. Group by assignee: count of stories, sum of points, count of blocked items. Also run `project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() AND (flagged = Impediment OR labels = 'blocked')` for currently blocked items per person. Read `{{VAULT_ROOT}}/02-sprints/capacity-{sprint}.md` for PTO context if available."
3. **`task-manager`** → "Read the most recent `{{VAULT_ROOT}}/next-actions-*.md` and `priority-matrix-*.md`. Return any action items owed *to* specific people (so we can cross-reference with 1:1 follow-ups)."

## Step 2 — Narrate

Render each specialist's output under a `→ {agent}` header so the multi-agent flow is visible. Skip headers if the user said "quiet" / "just the dashboard".

## Step 3 — Synthesize

Add a `─── Synthesis ───` separator, then produce a per-person table:

| Person | Stories | Points | Blocked? | Open Follow-ups | Last 1:1 | SME Status | Signals |

Then highlight risks below the table:

- **Overloaded** — anyone with high points *and* a blocker.
- **Stale 1:1s** — anyone without a 1:1 in >2 weeks (weekly cadence) or >4 weeks (biweekly).
- **Stuck follow-ups** — items >1 week old.
- **SME at risk** — areas with no progress in >2 weeks.
- **Patterns** — anything that should come up in the next 1:1 (note which person).

End with 2–3 recommended actions for the week.

## Notes

- Continue if any specialist fails; note the gap.
- Treat 1:1 notes as **confidential** — never expose one person's private context in cross-references.
- Fall back to serial execution if parallel subagent dispatch isn't available.
