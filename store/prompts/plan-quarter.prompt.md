---
name: plan-quarter
agent: cortex
description: "Quarterly planning review — goals, epics, capacity, risks."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Run a quarterly planning review.

1. Read `{{VAULT_ROOT}}/06-delivery/06-delivery.md` — quarterly goals and epic status.
2. Read `{{VAULT_ROOT}}/03-initiatives/03-initiatives.md` — active initiatives consuming capacity.
3. Query Jira — velocity from the last 4 closed sprints (capacity baseline). Use the Agile API so points are grouped **per sprint** (a flat `closedSprints()` JQL search mixes sprints and truncates at maxResults, making the average unreliable):
   - `GET /rest/agile/1.0/board?projectKeyOrId={{JIRA_PROJECT_KEY}}` → the board id.
   - `GET /rest/agile/1.0/board/{boardId}/sprint?state=closed` → take the last 4 closed sprints.
   - For each, `GET /rest/agile/1.0/sprint/{sprintId}/issue?jql=status=Done&fields=...` and sum the story-points field; average across the 4. Paginate (`startAt`/`maxResults`) when a sprint has more Done issues than one page, or the sum will be quietly low.
4. Query Jira — active epics and completion rate:
   `project = {{JIRA_PROJECT_KEY}} AND issuetype = Epic AND status NOT IN ("Done", "Closed")`
   For each epic, query child stories and calculate % Done.
5. Query Jira — unestimated backlog stories (planning risk):
   `project = {{JIRA_PROJECT_KEY}} AND sprint is EMPTY AND status != "Done" AND "Story Points[Number]" is EMPTY`
   Note: the story-points field name is instance-specific — it may be `"Story point estimate"` (team-managed projects) or a `cf[NNNNN]` custom-field id. If the named field errors, look it up via `GET /rest/api/3/field` and substitute.

Produce:

- **Quarterly goals status** — each goal with progress %.
- **Epic health** — each epic: story count, % done, projected finish at current velocity.
- **Capacity outlook** — sprints remaining × avg velocity vs points remaining.
- **Risks** — goals at risk of missing the quarter (flag if <70% complete with <2 sprints left).
- **Recommendations** — what to cut, defer, or escalate.
