# How to Use Cortex (day-to-day)

This is the **usage** guide. It assumes Cortex is already installed — if not, start with [GETTING-STARTED.md](GETTING-STARTED.md). For what each agent does, see [AGENT-CATALOG.md](AGENT-CATALOG.md); for fixes, see [FAQ.md](FAQ.md).

The model is simple: you talk to **one** agent (`cortex`), it dispatches the right specialists, and it synthesizes a single answer. Your "memory" is a folder of markdown (the **vault**). You teach it over time with `/remember`.

## Invoking Cortex

In your AI tool's chat, you have two entry points:

1. **The `cortex` agent** — the router. Ask it anything cross-domain ("what should I focus on today?", "prep me for the leadership sync", "where are we on the migration initiative?"). It routes to specialists, narrates each hand-off, and stitches the results together.
2. **Slash-command prompts** — self-contained shortcuts for the common rituals. All run through `cortex`:

| Prompt | What it does |
| ------ | ------------ |
| `/daily-brief` | Morning briefing: dispatches your role's specialists in parallel, then synthesizes 🔴 Urgent / 🟡 Today / 🟢 Track + cross-domain connections |
| `/standup` | Standup talking points: Yesterday / Today / Blockers (with Jira links) |
| `/weekly-review` | End-of-week review: done / carried-forward / risks / next-week priorities |
| `/add-task <text>` | Quick-add a task to your priority matrix (auto-quadrant, deduped) |
| `/remember <text>` | Capture a durable operating lesson into the learning loop |

> Don't see the prompts in your tool? See [FAQ → "agent/prompt not appearing"](FAQ.md#troubleshooting).

### A typical day

```text
# Morning
/daily-brief

# Before your scrum
/standup

# Something comes up mid-meeting
/add-task Follow up with platform team on the auth spike — due Thursday

# You notice a pattern worth keeping
/remember I prefer status updates that lead with metrics, not activity.

# Friday
/weekly-review
```

You can also just *talk* to `cortex` in plain language — the prompts are convenience wrappers, not the only way in.

## How the role-lens changes behavior

Every role enables the same 8 agents. The **role-lens** (defined in `profiles.json`, baked into your `config.md`) changes what Cortex *leads with* and the vocabulary it uses. Same `/daily-brief`, different framing:

| You run `/daily-brief` as a… | …and Cortex leads with |
| --------------------------- | ---------------------- |
| **Anchor (Tech Lead)** | Top priorities, sprint blockers, stuck stories, and technical decisions waiting on you; connects sprint work to upcoming 1:1s and initiatives. |
| **Engineering Manager (Scrum Master)** | Sprint health and pace vs. velocity, impediments to clear, ceremony prep, and team capacity; surfaces retro actions to follow through. |
| **Product Manager (Products & Roadmaps)** | Roadmap/milestone status, stakeholder asks, and risks/dependencies; sprint data is framed as a delivery/status view. |
| **People Manager (Supervisor / PM)** | Team health, overdue 1:1 follow-ups, growth/performance items, and project/delivery status + risks. |

Concrete contrast — the **same blocker** appears differently:

- **Scrum Master** sees: *"🔴 STORE-412 blocked 4 days (impediment) — needs platform-team unblock; raise at standup."*
- **Product Manager** sees: *"🔴 Checkout milestone at risk — STORE-412 dependency on platform team slipping; flag to stakeholders."*

The lens lives in `config.md` under **Role lens**. Editing that section (or re-scaffolding with a different `--role`) changes the emphasis without touching the agents.

## Feeding the system (debriefs, `/remember`, facts vs. lessons)

Cortex is only as good as what you tell it. Two distinct kinds of input:

### 1. Debriefs → notes (facts)

After a meeting, 1:1, or decision, debrief `cortex` (or the relevant specialist) in plain language. It writes the **facts** into the right vault note — a meeting note, a person file, an initiative update, a decision record. Facts are things like "Sam wants to move toward a tech-lead track" or "we chose Postgres over DynamoDB because of query patterns."

```text
Debrief: just finished my 1:1 with Sam. They want more architecture
ownership; agreed they'll lead the caching spike next sprint. Log it.
```

### 2. `/remember` → the learning loop (operating lessons)

A **lesson** is about *how to operate* — a preference, recurring pattern, or gotcha that should change Cortex's future behavior. It is **not** a fact about a person or project.

```text
/remember Always include Jira links in standup notes — my EM asks for them every time.
```

When you `/remember`, Cortex decides scope and writes **one terse, deduped line**:

| Scope | Where it goes |
| ----- | ------------- |
| **Global** (cross-cutting) | `_memory/learnings.md` |
| **Scoped** (`person/<name>`, `initiative/<slug>`) | a "Lessons / preferences" section inline in that note |

If what you said is really a fact, Cortex tells you it belongs in a note instead and points you there. Lessons are **capped** — when the global file grows past ~40 lines, Cortex proposes merges rather than appending forever. Transcripts are never stored.

**Rule of thumb:** *"X happened"* → a note (fact). *"From now on, do X / watch out for Y"* → `/remember` (lesson).

## Working with the vault

Your vault is a plain folder of markdown. You can open and edit it in any editor; Obsidian just gives you nicer linking and graph views.

### Folder map

| Folder | Holds |
| ------ | ----- |
| `00-inbox/` | Quick capture / triage |
| `01-people/` | Person notes (1:1 history, growth, preferences) |
| `02-sprints/` | Retro notes, capacity/PTO — sprint *ceremony* artifacts |
| `03-initiatives/` | POCs/initiatives, decisions, stakeholder maps |
| `04-meetings/` | Meeting notes & prep |
| `05-decisions/` | Decision records (rationale + alternatives) |
| `06-delivery/` | Delivery/status tracking |
| `07-marketing/` | Highlights, exec briefs, demo scripts, posts |
| `_memory/` | `learnings.md` (global lessons) + `examples.json` (cleanup marker) |
| `templates/` | Note templates (daily, weekly, sprint, meeting, person, initiative, decision) |
| `config.md` | Your identity + role-lens — read first by every agent |

Cortex also maintains dated working files at the vault root as you use it — e.g. `priority-matrix-YYYY-MM-DD.md` (the 2×2 task matrix) and `next-actions-YYYY-MM-DD.md` (the weekly log). When a prompt needs one, Cortex reads the **most recent** dated file.

### Templates

Templates in `templates/` define the shape of each note type. Agents follow them when creating notes, so structure stays consistent. Edit a template to change the shape going forward — e.g. add a "Decisions" table to the initiative template and every new initiative gets it.

### The Jira-is-source-of-truth rule

This is the one rule worth memorizing:

> **Jira owns Jira data.** Story status, points, assignees, velocity, sprint/board state, epic completion, fix versions — Cortex queries these **live** every time and never caches them in the vault.

The vault holds only **metadata** (Jira *keys*, narrative, decisions) and **ceremony artifacts** (retro notes, capacity, follow-ups). So a note might say `STORE-1107` but never "STORE-1107 is In Progress, 5 points" — that goes stale within hours. If you connected Jira (see GETTING-STARTED §2.5), `sprint-ops` pulls the live status whenever you ask.

### Bounded autonomy

Cortex confirms before any **external** mutation (transitioning a Jira issue, publishing a Confluence page, sending mail) and never deletes vault content without asking — it moves things to a "Completed"/"Archived" section instead. Reads are free; writes are confirmed.

## Adding more tools, re-running install, and `doctor`

Installs are **idempotent** — re-run them anytime (after pulling a template update, or to provision a new surface). Always preview first, then `--apply`.

```bash
# Add another tool
node bin/cortex.mjs install opencode --apply

# Re-provision everything at once (e.g. after updating the template)
node bin/cortex.mjs install --all --apply

# Health check: config found? which tools are installed? unresolved placeholders?
node bin/cortex.mjs doctor
```

`doctor` reports, per tool, whether Cortex is installed, the role, file count, any missing files, and any **unresolved placeholders** (like a `{{VAULT_ROOT}}` that never got filled in). Unresolved placeholders usually mean you installed before scaffolding a vault — fix by re-running `create-cortex` or passing `--vault` to install:

```bash
node bin/cortex.mjs install copilot --vault ~/cortex-vault --apply
```

To wire up Jira/Confluence later, run `node bin/cortex.mjs setup-atlassian` (see GETTING-STARTED §2.5). To remove a tool's files, use `uninstall`:

```bash
node bin/cortex.mjs uninstall copilot          # preview
node bin/cortex.mjs uninstall copilot --apply  # remove
node bin/cortex.mjs uninstall --all --apply    # remove from every tool
```

## Cleaning up the example notes

New vaults ship with clearly-labeled `EXAMPLE-*` notes so your first run shows the intended shape. Cortex reminds you to clear them after ~1 week (it tracks this via `_memory/examples.json`). Manage them anytime:

```bash
# See what would be removed (dry-run)
node bin/cortex.mjs cleanup-examples

# Actually delete them (and the cleanup marker)
node bin/cortex.mjs cleanup-examples --apply

# Not ready yet — defer the reminder (default 7 days; pass a number to override)
node bin/cortex.mjs cleanup-examples --snooze
node bin/cortex.mjs cleanup-examples --snooze 14

# Operate on a specific vault
node bin/cortex.mjs cleanup-examples --vault ~/cortex-vault --apply
```

If you'd rather never see examples, scaffold with `node bin/create-cortex.mjs --no-examples …`.

## Token habits that keep answers sharp

- **`/clear` between unrelated tasks.** State lives in the vault, not the chat — a clean chat loses nothing and avoids "Context Rot."
- **Let the tool pick the model (Auto)** for everyday work; reserve premium reasoning models for genuinely hard problems.
- Prompts name the exact files they need, so the agent doesn't burn tokens hunting around.

---

Next: [FAQ.md](FAQ.md) for common questions and troubleshooting, or [AGENT-CATALOG.md](AGENT-CATALOG.md) for the full swarm.
