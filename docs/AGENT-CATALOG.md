# Agent Catalog

Cortex is a **router + specialists** swarm. `cortex` is the single entry point; it routes to specialists and synthesizes cross-domain briefings. Only the agents enabled for your **persona profile** are installed.

Before context loading or delegation, Cortex classifies **answer**, **advice**, or **delivery**. Supplied evidence can support a narrow direct answer; specialized judgment and fresh status still use the owners below. Answer/advice does not authorize vault, checkpoint, graph, or remote writes. Daily and weekly briefs inherit these restrictions.

## Agents

| Agent | What it does | When to route here | Model tier |
| ----- | ------------ | ------------------ | ---------- |
| `cortex` | Router + synthesizer; the command center | "What should I focus on?", any multi-domain ask | reasoning |
| `task-manager` | Priority matrix (2x2), action items, daily focus | task tracking, "what's next?", quick add | standard |
| `meeting-prep` | Calendar, meeting prep, action-item extraction | before/after meetings, follow-ups | standard |
| `sprint-ops` | Sprint health, standups, Jira ops, velocity (live) | sprint/standup/blocker/story questions | standard |
| `planning-portfolio` | Epics/stories, content quality, roadmap, dependencies | quarterly planning, epic review, status | standard |
| `one-on-one` | 1:1 prep, growth/performance, team/report health | 1:1s, people topics, feedback | standard |
| `initiative-tracker` | POCs/initiatives, decisions, stakeholder maps | initiative status, cross-team work | standard |
| `content-strategist` | Highlights, exec briefs, demos, posts | status comms, visibility, storytelling | standard |

## Sibling: Forge (code delivery)

Cortex is a **role-OS** — it runs your role and never writes code itself. Its sibling **Forge** is the **code-delivery** swarm (a bounded implement → review → refine loop at a staff-engineer bar). The handoff is **one-way**: `cortex` routes any implementation/refactor/bug-fix/test work to the `forge` agent (if installed) and folds Forge's structured result (summary, diff, test status, residual risks) into status/sprint comms; `forge` never calls back into `cortex`. Cortex **passes the task, not the strategy** — it never pre-decides decomposition, parallelization, or subagents (Forge owns its gate, contract, and loop) — and it steers the work to **top-level** Forge, because Forge only runs its full swarm when it is the top-level agent; a nested Task subagent can't fan out and silently collapses to a single pass. So Cortex hands off by having the user invoke the `forge` agent directly (or run `/ship`) rather than wrapping Forge in a nested subagent. This keeps Cortex pure while giving you a single front door — e.g. get ticket context from `sprint-ops`, then route the build to top-level Forge.

The Cortex-to-Forge handoff carries Intent, Goal, Anchor, Constraints / non-goals, Acceptance evidence, and Allowed effects. It cannot authorize implementation for an advice request or publication for a draft. Advice requires an intent-aware Forge version or a read-only host mode; do not silently invoke an older delivery-only workflow. See [WORKFLOW-DISCIPLINE.md](WORKFLOW-DISCIPLINE.md) for recovery and validation cases.

## Personas (role presets)

**Every persona enables all 8 agents.** The differentiator is the **role-lens** (in `config.md`) plus vocabulary and what `cortex` leads with — not which agents are installed. Everyone gets `one-on-one`, because everyone has 1:1s (running them and/or attending their own). Prompts and skills are universal too.

| Persona id | Role | Lens leads with |
| ---------- | ---- | --------------- |
| `anchor` | Anchor (Tech Lead) | Priorities, sprint health, blockers, technical decisions |
| `people-manager` | People Manager (Supervisor / Project Manager) | Team health, 1:1s, growth/performance, project & delivery status |
| `engineering-manager` | Engineering Manager (Scrum Master) | Sprint health, ceremonies, impediments, velocity, capacity |
| `product-manager` | Product Manager (Products & Roadmaps) | Roadmap, product priorities, milestones, stakeholders, risks |

An IC persona and new role-specific agents (e.g. risk/dependency, ceremony facilitation, performance) are planned for a later phase.

## Capabilities (mapped per tool at install)

Agents declare neutral capabilities (`read-file`, `write-file`, `jira`, `github`, `web-fetch`, `calendar`, `confluence`). The installer maps these to each tool's concrete tool names — so the agent prose stays portable across Copilot, Cursor, and OpenCode.
