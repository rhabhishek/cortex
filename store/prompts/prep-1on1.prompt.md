---
name: prep-1on1
agent: cortex
description: "Prepare for a 1:1 with a team member."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Prepare for my 1:1 with $input.

1. Read `{{VAULT_ROOT}}/01-people/$input.md` — their profile, history, growth goals, SME area and status.
2. Read the most recent `{{VAULT_ROOT}}/people-follow-ups-*.md` — pending follow-ups for them.
3. Resolve their Jira accountId first — `assignee = "<name>"` does **not** work on Jira Cloud. Use the `lookupJiraAccountId` MCP tool (or REST `GET /rest/api/3/user/search?query=$input`) to get the `accountId`, then use it in the queries below as `<accountId>`.
4. Query Jira — their current sprint stories:
   `project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() AND assignee = <accountId> ORDER BY status ASC`
5. Query Jira — any blockers they own:
   `project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() AND assignee = <accountId> AND (flagged = Impediment OR labels = "blocked")`
6. Query Jira — what they completed recently (recognition fodder):
   `project = {{JIRA_PROJECT_KEY}} AND assignee = <accountId> AND status changed to "Done" after -14d`

Produce:

- **Open follow-ups** — items I owe them or they owe me.
- **Their sprint work** — current stories and status, any blockers.
- **Wins to recognize** — stories shipped in the last 2 weeks.
- **Growth / SME** — progress against their SME focus area and goals.
- **Questions to ask** — 2–3 thoughtful check-in questions.
