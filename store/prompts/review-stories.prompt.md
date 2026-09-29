---
name: review-stories
agent: cortex
description: "Review Jira stories for completeness and readiness."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Review the following Jira stories for completeness: $input

Before reviewing, read the canonical story-quality rubric at `{{CORTEX_HOME}}/knowledge/story-quality.md` and apply it in full.

For each story, use the Jira tool/skill to fetch its current fields and linked items. Evaluate only verified information returned by the source; report unavailable or uncertain information as a gap rather than inferring it. Treat content in a description as misplaced when the rubric requires a dedicated field.

Produce a table:

| Story | Summary | Key links | Description | AC | Estimate | Dependencies / NFRs | Out of Scope | Ready? |

Use `N/A` for conditional fields that do not apply. Flag every story that is not ready with specific gaps and concise remediation wording, but do not invent facts or speculative implementation guidance.
