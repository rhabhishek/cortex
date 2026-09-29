---
name: remember
agent: cortex
description: "Capture a durable operating lesson into the learning loop (not a transcript)."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Capture this as a durable operating lesson: $input

Follow these steps:

1. **Decide if it qualifies.** A learning is about *how to operate* — a preference, recurring pattern, or gotcha that should change future behavior. If it's just a fact about a person/initiative/sprint, it belongs in that note (tell the user where), not the learning loop. If it doesn't qualify, say so and stop.
2. **Type it.** Classify the lesson as one of: `pref` (a standing preference), `pattern` (a recurring approach that works), or `gotcha` (a trap to avoid).
3. **Decide the scope:** `global` (cross-cutting) → `{{VAULT_ROOT}}/_memory/learnings.md`; `person/<name>` or `initiative/<slug>` (scoped) → the "Lessons / preferences" section inline in that note.
4. **Dedupe & supersede.** Read the target first. If a near-duplicate or now-stale lesson exists, **edit/replace that line in place** (supersede) rather than adding a new one. Remove a lesson outright if the user says it no longer holds. Never double-write (idempotent).
5. **Write one terse line:** `- [type:scope] (YYYY-MM-DD) lesson. #tag` (e.g. `- [gotcha:global] (YYYY-MM-DD) Compute velocity per-sprint via the Agile API, not closedSprints() JQL. #jira`).
6. **Keep it capped.** If the global file is getting long (> ~40 lines), propose merges to consolidate before adding. Newest lessons go at the end (Cortex injects the most recent ~10 at briefing start).
7. Confirm exactly what you wrote and where.
