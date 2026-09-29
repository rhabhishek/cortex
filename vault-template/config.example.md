---
type: cortex-config
role: "{{ROLE}}"
---

# Cortex — Config (your profile)

> This is the **identity** layer: stable facts about you and your context. Keep it concise (≤ ~150 lines). Durable *operating lessons* live separately in [`_memory/learnings.md`](_memory/learnings.md) — do not put lessons here. Every agent reads this file first.

## Identity

| Field            | Value                |
| ---------------- | -------------------- |
| Owner            | {{OWNER}}            |
| Role             | {{ROLE_TITLE}}       |
| Team             | {{TEAM}}             |
| Vault root       | {{VAULT_ROOT}}       |
| Jira project key | {{JIRA_PROJECT_KEY}} |

## Org / Relationships

> Who you work with — agents use this to resolve names, route 1:1s, frame stakeholder comms, and map cross-team dependencies. Run **`/onboard`** in chat to fill this in conversationally, or edit it here. People you track in depth also get their own note in `01-people/`.

| Relationship        | People                         |
| ------------------- | ------------------------------ |
| Manager             | <name>                         |
| Skip-level          | <name>                         |
| Peers               | <name, name, …>                |
| Direct reports      | <name, name, …>                |
| Cross-team partners | <name (team), …>               |
| Key stakeholders    | <name (role), …>               |

## Role lens

> {{ROLE_LENS}}

Cortex adapts vocabulary and what it leads with to this lens.

## Conventions (optional — keep minimal, only non-obvious things)

- _Add only constraints an agent could not infer (e.g. "status reports go to the EM every Friday", "never ping stakeholders before 9am ET")._

## Links

- Global operating lessons: [`_memory/learnings.md`](_memory/learnings.md)
- Scoped lessons live inline in the relevant note (a "Lessons / preferences" section in a person/initiative file).
