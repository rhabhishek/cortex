# Getting Started with Cortex (adopt in under an hour)

Cortex gives you a "secondary brain" — a folder of markdown + a swarm of AI agents that keep you on top of priorities, meetings, sprints, 1:1s, planning, initiatives, and status. It works in **GitHub Copilot (VS Code / CLI / IntelliJ), Cursor, and OpenCode**, and adapts to your **role**.

## Prerequisites

- Node.js ≥ 18 (the installer will install it for you if missing).
- One supported AI tool with agent/custom-instructions support (Copilot, Cursor, or OpenCode).
- Optional: a GitHub PAT (for the GitHub MCP server) and/or an Atlassian API token (for the Confluence REST skill + Jira REST fallback). Jira's MCP server signs in via OAuth, so a token isn't required for it.

## 0. Fastest path — one command

```bash
git clone git@github.com:<org>/cortex.git cortex && cd cortex
./install.sh          # macOS / Linux
# Windows (PowerShell):  .\install.ps1
```

This ensures Node ≥ 18, then runs the `cortex setup` wizard (arrow-key prompts) which does steps 1–3 below end-to-end: scaffold a vault, capture credentials into **secure storage** (macOS Keychain / Windows DPAPI / else `~/.cortex/*.env` chmod 600, loaded by your shell profile), install the Copilot adapter, wire the MCP servers, and run `doctor`. The sections below describe the same steps if you'd rather run them individually.

## 1. Pick your role and scaffold a vault

```bash
node bin/create-cortex.mjs --role anchor --vault ~/cortex-vault --owner "Your Name" --team "Your Team" --jira PROJ
```

Or just run `node bin/create-cortex.mjs` with no flags for a guided wizard (role picker + prompts).

Roles: `anchor` (Tech Lead), `people-manager` (Supervisor / Project Manager), `engineering-manager` (Scrum Master), `product-manager` (Products & Roadmaps). All four enable the full agent swarm; the role you pick sets the **lens** (emphasis + vocabulary).

**Example notes are included by default** (clearly labeled `EXAMPLE-*`) so you can see the intended shape — and Cortex will **remind you to clean them up after ~1 week**. Remove them anytime with `node bin/cortex.mjs cleanup-examples --apply`, defer with `--snooze [days]`, or skip them at scaffold with `--no-examples`.

This creates your vault (folders + 7 templates + `config.md` + `_memory/learnings.md`) and records `~/.cortex/cortex.config.json`.

## 2. Fill in `config.md`

Open `~/cortex-vault/config.md` — it's your **profile** (identity + role-lens + an **Org / Relationships** map), the always-on context every agent reads. Keep it short. Don't put lessons here; those live in `_memory/learnings.md`.

The fastest way to fill in the relationships (manager, peers, reports, cross-team partners, stakeholders) is to run **`/onboard`** in your AI tool after install — it interviews you conversationally and writes the answers into `config.md` (and offers to seed `01-people/` notes). You can always edit the file by hand instead.

## 2.5 Connect Jira / Confluence / GitHub (optional, for live data)

`cortex setup` (step 0) already prompts for these. To (re)configure Atlassian on its own:

```bash
node bin/cortex.mjs setup-atlassian      # interactive — guides you to create a token and validates it
```

**How auth works per service:**

- **Jira** → Atlassian's official **Rovo MCP server over OAuth** — you sign in once in your editor; no token stored.
- **Confluence** → the **REST skill** (no MCP), using your Atlassian API token. A single Atlassian token is **account-scoped**, so the same token reaches Confluence even if it's on a **different site** than Jira. `setup-atlassian` asks "Is Confluence on the same site as Jira?" and records both URLs.
- **GitHub** → the official **GitHub MCP server authenticated with your PAT** (`Authorization: Bearer ${env:GITHUB_TOKEN}`).

Credentials go to **secure storage** (macOS Keychain / Windows DPAPI / else `~/.cortex/*.env` chmod 600) and a managed block in your shell profile loads `JIRA_URL`, `CONFLUENCE_URL`, `ATLASSIAN_EMAIL`, `ATLASSIAN_API_TOKEN`, and `GITHUB_TOKEN` into the environment your editor inherits. Nothing is committed.

Non-interactive Atlassian form:

```bash
node bin/cortex.mjs setup-atlassian --email you@org.com --token <t> --jira-url https://org.atlassian.net --confluence-same
# split instance:
node bin/cortex.mjs setup-atlassian --email you@org.com --token <t> --jira-url https://eng.atlassian.net --confluence-url https://org.atlassian.net
```

## 3. Wire it into your tools

Always preview first (dry-run), then `--apply`:

```bash
node bin/cortex.mjs install copilot          # preview what it will write
node bin/cortex.mjs install copilot --apply  # VS Code + CLI + IntelliJ in one go
node bin/cortex.mjs install cursor --apply
node bin/cortex.mjs doctor
```

To try it without touching your real setup, target a throwaway home: `--home /tmp/cortex-test --apply`.

The dry-run shows exactly what will be written before you commit to it:

```text
Cortex install → role: anchor · home: ~ · mode: dry-run (use --apply to write)

■ copilot — GitHub Copilot (VS Code + CLI + IntelliJ)
   plan  .copilot/agents/cortex.agent.md
   plan  .copilot/agents/sprint-ops.agent.md
   …
   plan  .copilot/cortex.instructions.md
   23 files

Dry run only. Re-run with --apply to write. Tip: --home /tmp/cortex-test to try safely.
```

`doctor` then confirms the whole install — adapters, credentials reachable in your
shell, the shell-profile wiring, and the MCP servers Cortex provisioned:

```text
Cortex doctor

  config: found (role=anchor, vault=~/cortex-vault)
  copilot   installed (role=anchor) · 23 files · 0 missing · 0 unresolved placeholders
  cursor    not installed
  opencode  not installed

  credentials (this shell):
    ✓ ATLASSIAN_EMAIL      you@example.com
    ✓ ATLASSIAN_API_TOKEN  set (hidden)
    ✓ JIRA_URL             https://your-org.atlassian.net
    ✓ CONFLUENCE_URL       https://your-org.atlassian.net
    ✓ GITHUB_TOKEN         set (hidden)
    ✓ shell profile      managed block present in ~/.zshrc

  mcp servers (cortex-owned):
    ✓ VS Code      atlassian, io.github.github/github-mcp-server  → ~/Library/Application Support/Code/User/mcp.json
    ✓ Copilot CLI  atlassian, io.github.github/github-mcp-server  → ~/.copilot/mcp-config.json
```

## 4. First daily brief

In your tool's chat, invoke the `cortex` agent (or the `/daily-brief` prompt). It dispatches your role's specialists in parallel and synthesizes a prioritized brief.

## 5. Teach it as you go (the learning loop)

When you notice a durable preference or gotcha, use `/remember` — Cortex writes one terse, deduped line to `_memory/learnings.md` (global) or inline in the relevant note (scoped). It never stores transcripts, and it stays capped.

## Habits that save tokens (and improve answers)

- **Start fresh / `/clear` between unrelated tasks.** Cortex keeps state in the vault, not the chat — so a clean chat loses nothing and avoids "Context Rot."
- **Let the tool pick the model (Auto)** for everyday work; reserve premium models for genuinely hard reasoning.
- Prompts are self-contained and name the files they need, so the agent doesn't burn tokens searching.

## Privacy

Cortex ships **zero** personal/company data. Your vault is yours and never part of Cortex. Run `node bin/cortex.mjs leak-check` before sharing any copy of the store:

```text
✅ leak-check passed — no personal/company data found in store/ or vault-template/.
```

See [AGENT-CATALOG.md](AGENT-CATALOG.md) for what each agent does and which roles enable it.
