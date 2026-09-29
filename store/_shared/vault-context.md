# Shared: Vault Context

> Deduped reference. Every agent points here instead of restating the vault location, read/write conventions, and the live-data rule. Keep this the single source of truth for vault mechanics.

## Memory — the vault

All persistent state lives in a folder of markdown files (the "vault"). This is the **single source of truth**; it can sync via OneDrive/git/Dropbox and is readable from any IDE, CLI, or editor.

**Vault root:** `{{VAULT_ROOT}}`

The vault is **not** Obsidian-specific — it is plain markdown. Obsidian is an optional viewer. `[[wikilinks]]` and YAML frontmatter degrade gracefully to plain text.

## Vault structure

A stable folder layout, each area owned by a specialist. Numbered prefixes keep the tree ordered; the dated files live at the vault root.

| Path | Purpose | Owning agent |
| ---- | ------- | ------------ |
| `00-inbox/` | Triage, unprocessed items | cortex |
| `01-people/` | Per-person profiles & 1:1 notes (one file each) | one-on-one |
| `01-people/01-people.md` | People directory overview | one-on-one |
| `02-sprints/retro-notes.md` | Retro action items & ceremony notes | sprint-ops |
| `02-sprints/capacity-{sprint}.md` | Team capacity / PTO per sprint | sprint-ops |
| `03-initiatives/` | POCs, initiatives, cross-team work | initiative-tracker |
| `03-initiatives/03-initiatives.md` | Initiatives registry | initiative-tracker |
| `04-meetings/` | Meeting prep & notes | meeting-prep |
| `05-decisions/` | Decision log | cortex |
| `06-delivery/` | Epics, quarterly delivery, focus areas | planning-portfolio |
| `06-delivery/06-delivery.md` | Delivery & quarterly goals overview | planning-portfolio |
| `07-marketing/` | Content drafts, highlights, posts | content-strategist |
| `priority-matrix-*.md` | Priority stack (ranked, most recent) | task-manager |
| `next-actions-*.md` | Action items & weekly log (most recent) | task-manager |
| `people-follow-ups-*.md` | Follow-up tracking (most recent) | one-on-one |

> Folders enabled per profile may vary; an agent only owns the folders for the active profile. Sprint stories, blockers, velocity, and board state come **live from Jira** — never the vault (see the live-data rule below).

## Reading / writing vault files

- Apply the task's Intent and Allowed effects from the shared operating conventions before vault access. Answer/advice does not authorize saves, archives, checkpoints, or lesson capture. Keep a resume packet in the conversation when persistence is not allowed.
- Read and write vault files **by path** using whatever file read/write capability your host tool exposes (do not assume a specific tool API).
- For dated files (`*-YYYY-MM-DD.md`), always read the **most recent** one.
- When creating a new dated file, use today's date.
- **Idempotency:** writes must be safe to re-run — update in place, never blindly append duplicates.

## The live-data rule (single source of truth)

- **Jira owns Jira data.** Story status, points, assignees, velocity, sprint/board state, epic completion, fix versions — query Jira **live**, never cache in the vault.
- The vault holds only **metadata** (Jira keys, non-Jira context, decisions, narrative) and **ceremony artifacts** (retro notes, capacity, follow-ups).

## Identity & role

The user's identity and role come from `{{VAULT_ROOT}}/config.md` plus the role-lens. Durable lessons live in `{{VAULT_ROOT}}/_memory/learnings.md` and scoped domain notes. Use the supplied context or read only relevant slices when needed; reuse unchanged context and do not scan the vault for a simple follow-up. Recency alone does not determine a lesson's relevance. Never duplicate these sources into prose.

## Operating conventions

Interactive UX, visible orchestration, and bounded autonomy (confirm external mutations; never delete vault content without confirmation) are canonical in `{{CORTEX_HOME}}/_shared/conventions.md`. Follow it; this file covers vault mechanics only.
