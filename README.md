# Cortex

> A role-agnostic, cross-platform **"secondary brain"** — a folder of markdown notes plus a swarm of specialized AI agents — that keeps a lead on top of priorities, meetings, sprints, 1:1s, planning, initiatives, and status. It runs in whatever AI coding tool you already use.

**Positioning:** *ready-ai-stack ships your code (ticket → PR); **Cortex runs your role*** (priorities, 1:1s, planning, initiatives, status).

Cortex is the productized version of a working tech-lead agent system, with all personal and company data stripped out. You reuse the **structure** — agents, prompts, skills, persona profiles — and keep your own **data** in a private vault that's never part of Cortex itself.

## Why it matters

- **One brain, every tool.** A single canonical store is provisioned into each AI tool you use. Three adapters (`copilot`, `cursor`, `opencode`) cover 5+ surfaces — the `copilot` adapter alone reaches VS Code, the CLI, and IntelliJ.
- **Zero dependencies.** Pure Node ≥ 18 scripts. No `npm install`, no build step.
- **Your role, your lens.** Pick a persona and the same 8-agent swarm re-frames its emphasis and vocabulary for how *you* work.
- **Memory is just markdown.** Your "brain" is a folder of notes you own, version, and sync however you like. Obsidian is an optional viewer, not a requirement.

## Quick start

```bash
git clone git@github.com:<org>/cortex.git cortex
cd cortex
./install.sh          # macOS / Linux
# Windows (PowerShell):
#   .\install.ps1
```

That's it. The installer makes sure Node ≥ 18 is present, then runs the one-command
`cortex setup` wizard (arrow-key prompts). Answer them and you're ready to use it. The wizard:

1. **Scaffolds a vault** for your role — `anchor` · `people-manager` · `engineering-manager` · `product-manager` (example notes included, with a 1-week cleanup reminder).
2. **Connects your tools + credentials** — secrets go to **secure storage** (macOS **Keychain**, Windows **DPAPI** per-user, else `~/.cortex/*.env` chmod 600) and a managed block in your shell profile loads them. **GitHub MCP** authenticates with your **PAT**; **Jira MCP** (Atlassian Rovo) signs in via **OAuth** in-editor; **Confluence** is served by the REST skill (no MCP) via the same token + `CONFLUENCE_URL`.
3. **Installs the Copilot adapter** (VS Code + CLI + IntelliJ). Each agent is written with an explicit `tools:` list of real built-in tool IDs (plus the MCP tools for its capabilities), so the agents work without manual tool-toggling.
4. **Wires MCP servers** into VS Code's user `mcp.json` and `~/.copilot/mcp-config.json` — managing only Cortex's own entries (tagged `_source: cortex`), never touching servers you added.
5. **Runs `doctor`** to verify.

Then restart VS Code, open Copilot chat, and run the `cortex` agent or `/daily-brief`.

> Prefer to drive it yourself? `node bin/cortex.mjs setup` is the same wizard, and the
> individual steps (`create-cortex`, `install <tool> --apply`, `setup-atlassian`,
> `doctor`) are still available. Test safely against a throwaway home with `--home /tmp/cortex-test`.

Full walkthrough: **[docs/GETTING-STARTED.md](docs/GETTING-STARTED.md)**.

## The four roles

Every role enables **all 8 agents**. What changes is the **role-lens** (set in your `config.md`) — the emphasis, vocabulary, and what Cortex leads with.

| Role id | Title | Lens leads with |
| ------- | ----- | --------------- |
| `anchor` | Anchor (Tech Lead) | Priorities, sprint health, blockers, technical decisions |
| `people-manager` | People Manager (Supervisor / Project Manager) | Team health, 1:1s, growth/performance, project & delivery status |
| `engineering-manager` | Engineering Manager (Scrum Master) | Sprint health, ceremonies, impediments, velocity, capacity |
| `product-manager` | Product Manager (Products & Roadmaps) | Roadmap, product priorities, milestones, stakeholders, risks |

## What's in the box

```
store/                 Canonical, tool-agnostic content (installed into ~/.cortex)
  agents/              The swarm: cortex (router) + 7 specialists
  prompts/             Universal slash-command prompts (daily-brief, standup, …, remember)
  skills/              Integrations: jira-workflow, confluence
  _shared/             Shared references deduped out of agents (vault-context)
  profiles.json        The 4 persona presets + role-lens definitions
vault-template/        Scaffolded into your vault by create-cortex
  00-inbox/ … 07-marketing/, _memory/, templates/, examples/
  config.example.md    Identity/profile (retrieved when relevant)
  _memory/learnings.md Global operating lessons (the learning loop)
bin/
  cortex.mjs           CLI: setup / install / uninstall / doctor /
                       setup-atlassian / cleanup-examples / leak-check
  create-cortex.mjs    Wizard: scaffold a vault, write config, optionally install
lib/                   Adapters, capability mapping, secrets, mcp, prompts, leak-check
install.sh / install.ps1   One-command installers (macOS/Linux · Windows)
docs/                  GETTING-STARTED · HOW-TO · FAQ · AGENT-CATALOG
```

The swarm: **`cortex`** (router/synthesizer) routes to **`task-manager`**, **`meeting-prep`**, **`sprint-ops`**, **`planning-portfolio`**, **`one-on-one`**, **`initiative-tracker`**, and **`content-strategist`**, then stitches the results into one cross-domain answer. See **[docs/AGENT-CATALOG.md](docs/AGENT-CATALOG.md)**.

## Design principles

- **Canonical store + per-tool adapters.** Write once at `~/.cortex/`, provision everywhere. Agents declare neutral capabilities (`read-file`, `jira`, `confluence`, …); the installer maps them to each tool's concrete tool names, so the agent prose stays portable.
- **Persona role-lens.** One swarm, four lenses. Prompts and skills stay universal; the role only changes emphasis and vocabulary — not which agents you get.
- **Learning loop.** `config.md` holds your identity; retrieve it and relevant lessons only when needed, reusing unchanged context. `_memory/learnings.md` holds durable operating lessons captured via explicit `/remember`, never automatic transcripts. Scoped lessons live in the relevant note.
- **Memory = the vault.** Plain markdown you own. Sync via OneDrive, git, or Dropbox (optional). Wikilinks and frontmatter degrade gracefully to plain text. Jira stays the source of truth for Jira data — query it live, never cache.
- **Privacy by default.** Cortex ships **zero** personal/company data. `node bin/cortex.mjs leak-check` fails if anything leaks into `store/` or `vault-template/`. Credentials live in your OS secure store (macOS Keychain / Windows DPAPI / else `~/.cortex/*.env` chmod 600), never committed.
- **Safe & idempotent.** Installs are **dry-run by default** (require `--apply`), re-runnable, and back up before overwriting. Agents practice bounded autonomy (confirm before any external mutation) and narrated delegation (you can see which specialist did what).
- **Intent before action.** Answer and advice are read-only by default, including vault and memory writes. A narrow answer can use supplied evidence directly; specialist judgment and fresh status still belong to their owners. Code delivery goes to top-level Forge with a permission-preserving task packet.
- **Context discipline.** Preserve your selected model and the existing adapter defaults. Reuse relevant context, synthesize once, and checkpoint at genuine task boundaries without automatic chat resets. Coaching recommendations remain advisory, never product gates or quotas. See [docs/WORKFLOW-DISCIPLINE.md](docs/WORKFLOW-DISCIPLINE.md).

## Next steps

| Doc | Read it for |
| --- | ----------- |
| [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) | Install & first-run setup (adopt in under an hour) |
| [docs/HOW-TO.md](docs/HOW-TO.md) | Day-to-day usage: briefs, the role-lens, feeding the system, the vault |
| [docs/FAQ.md](docs/FAQ.md) | Common questions + symptom → cause → fix troubleshooting |
| [docs/AGENT-CATALOG.md](docs/AGENT-CATALOG.md) | What each agent does and which roles enable it |

## Status

Phase 0 (POC). Builds in this repo only; it does not modify your live tool config unless you run an adapter with `--apply`.
