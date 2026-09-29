---
name: onboard
agent: cortex
description: "First-run: interview me and fill in my Cortex profile — identity + org/relationships (manager, peers, reports, partners, stakeholders) — into config.md."
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

Help me complete my Cortex profile by interviewing me, then writing it into `{{VAULT_ROOT}}/config.md`. This is the always-on context every agent reads, so keep it accurate and concise.

## Step 1 — Read what's there

Read `{{VAULT_ROOT}}/config.md`. Note which **Identity** fields and **Org / Relationships** rows are still placeholders (`<...>`) versus already filled. Only ask about what's missing or what I say I want to change — don't re-ask settled fields.

## Step 2 — Interview, one topic at a time

> **Tip — got an org chart?** Before we start, you can paste a **screenshot of your org chart** (from Microsoft Teams, Oracle HCM / Fusion, Workday, or any directory) and I'll read names + reporting lines straight from it, then just confirm the gaps. Drag the image into chat. Don't have one handy? No problem — we'll do it by Q&A below.

Ask briefly and **wait for my answer between topics**. Accept "skip" / "none" for anything that doesn't apply. Capture just **name (+ team or role where relevant)** per person — a short list is enough, don't interrogate.

1. **Identity** — confirm name, role, team, Jira project key.
2. **Reporting line** — my manager; skip-level (optional).
3. **Peers** — people at my level I coordinate with.
4. **Direct reports** — who reports to me (if any).
5. **Cross-team partners** — people/teams I depend on or who depend on me (note the team).
6. **Key stakeholders** — who I report status to or must keep aligned (note their role).

## Step 3 — Confirm, then write (bounded autonomy)

Show me the filled-in **Identity** and **Org / Relationships** tables exactly as they'll appear. On my OK, update `{{VAULT_ROOT}}/config.md` **in place**: replace the `<...>` placeholders, preserve everything else, keep it ≤ ~150 lines. Never invent people — leave anything I skipped as a placeholder, or drop the row if I say it doesn't apply. Confirm before the write.

## Step 4 — Offer person notes (optional)

For anyone I track closely (direct reports, key partners), offer to create a stub at `{{VAULT_ROOT}}/01-people/<name>.md` from the person template — confirm first, create them in one batch, and skip anyone who already has a note.

Keep `config.md` as the lightweight relationship **map**; deep per-person history and 1:1 notes live in `01-people/`.
