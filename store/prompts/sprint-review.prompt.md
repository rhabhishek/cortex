---
name: sprint-review
agent: cortex
description: "Sprint review / retro preparation."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Prepare sprint review and retro materials.

1. Query Jira — completed stories this sprint:
   `project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() AND status = "Done" ORDER BY updated DESC`
2. Query Jira — incomplete stories (carrying over):
   `project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() AND statusCategory != Done`
3. Query Jira — velocity from the last 3 closed sprints (for trend). Use the Agile API so points are grouped **per sprint** (a flat `closedSprints()` search mixes sprints and truncates at maxResults): `GET /rest/agile/1.0/board?projectKeyOrId={{JIRA_PROJECT_KEY}}` for the board id, then `GET /rest/agile/1.0/board/{boardId}/sprint?state=closed` for the last 3 closed sprints, then sum the story-points field of Done issues per sprint (paginate if a sprint has more Done issues than one page).
4. Query Jira — blockers that hit this sprint:
   `project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() AND flagged = Impediment`
5. Read `{{VAULT_ROOT}}/02-sprints/retro-notes.md` — action items from the last retro; check which are resolved.
6. Read `{{VAULT_ROOT}}/06-delivery/06-delivery.md` — epic progress impact.

Produce:

- **Sprint goal status** — Met / Partially Met / Missed (with rationale).
- **Committed vs delivered** — story count and points.
- **Velocity trend** — last 3 sprints + current.
- **Highlights** — what went well (pull from Done stories).
- **Blockers hit** — what slowed us down (from Jira impediments).
- **Last retro actions** — Done ✅ / Still open ⚠️ / Dropped ❌.
- **Retro starters** — start/stop/continue suggestions based on the sprint data.
