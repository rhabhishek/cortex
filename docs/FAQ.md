# FAQ & Troubleshooting

Quick answers first, then a symptom → cause → fix table. See also [GETTING-STARTED.md](GETTING-STARTED.md) (install), [HOW-TO.md](HOW-TO.md) (daily use), and [AGENT-CATALOG.md](AGENT-CATALOG.md) (the swarm).

## FAQ

### Which role do I pick?

Pick the one that matches what you spend most of your day on:

| If you're a… | Pick |
| ------------ | ---- |
| Tech lead / anchor driving execution and technical decisions | `anchor` |
| Supervisor who also runs projects (people + delivery) | `people-manager` |
| Scrum master facilitating ceremonies and clearing impediments | `engineering-manager` |
| Product owner driving roadmap, milestones, and stakeholders | `product-manager` |

All four enable the **same 8 agents** — the role only sets the **lens** (what Cortex leads with and the vocabulary it uses). You can change it later by editing the **Role lens** section of `config.md`, or re-scaffolding with a different `--role`.

### Do I need Obsidian?

No. The vault is plain markdown and works in any editor, IDE, or CLI. Obsidian is a recommended **viewer** for nicer linking and graph views — `[[wikilinks]]` and YAML frontmatter degrade gracefully to plain text without it.

### Does my data leave my machine?

No. Cortex ships **zero** personal/company data, and your vault is yours — it's never part of Cortex. Data leaves your machine only through services *you* connect (your AI tool's model provider, or Jira/Confluence/GitHub if you set them up) or a sync provider you choose (OneDrive/git/Dropbox — all optional). Credentials are stored in your OS secure store (macOS Keychain / Windows DPAPI / else `~/.cortex/*.env` chmod 600), never committed.

### What if Jira and Confluence are on different Atlassian sites?

That "split instance" case is supported. An Atlassian API **token is account-scoped, not site-scoped**, so the same token reaches both Jira and Confluence over REST even when they live on different sites. `setup-atlassian` asks whether Confluence is on the same site as Jira and configures both:

```bash
# split instance: Jira and Confluence on different sites
node bin/cortex.mjs setup-atlassian \
  --email you@org.com --token <t> \
  --jira-url https://eng.atlassian.net \
  --confluence-url https://org.atlassian.net
```

Note: an MCP OAuth grant is usually single-site, so Cortex routes **Jira → the `jira-workflow` skill / Jira MCP** and **Confluence → the `confluence` skill** (REST), which covers both sites.

### Which AI tools are supported?

Three adapters cover 5+ surfaces:

| Adapter | Surfaces |
| ------- | -------- |
| `copilot` | GitHub Copilot in **VS Code + CLI + IntelliJ** (one install) |
| `cursor` | Cursor |
| `opencode` | OpenCode |

### Will this cost a lot of tokens?

It's designed to be frugal. Default to your tool's **Auto** model for everyday work; prompts are **self-contained** (they name the files they need, so the agent doesn't hunt around); and because state lives in the **vault, not the chat**, you can `/clear` freely between tasks without losing context. Reserve premium reasoning models for genuinely hard problems.

### Can I customize or add agents and prompts?

Yes. The canonical content lives in `store/` — `agents/*.agent.md`, `prompts/*.prompt.md`, `skills/*`, and `profiles.json`. Edit those, then re-run `install` to provision the changes. Agents declare neutral capabilities (`read-file`, `jira`, `confluence`, …) that the installer maps to each tool's concrete tool names, so your edits stay portable across tools. Templates in `vault-template/templates/` control the shape of new notes.

> Before sharing any copy of the store, run `node bin/cortex.mjs leak-check` so your customizations don't accidentally ship personal/company data.

### How do I update?

Pull the latest template, then re-provision — installs are idempotent and back up before overwriting:

```bash
node bin/cortex.mjs install --all --apply   # re-provision every tool
node bin/cortex.mjs doctor                   # confirm
```

Your vault is untouched by updates; only the tool-side agent/prompt files are refreshed.

### How do I remove everything?

Use `uninstall` (preview first, then `--apply`). It removes the files listed in each tool's install manifest:

```bash
node bin/cortex.mjs uninstall --all          # preview
node bin/cortex.mjs uninstall --all --apply  # remove from every tool
```

Your vault and `~/.cortex/` config are not deleted — remove those by hand if you want a clean slate.

## Troubleshooting

| Symptom | Likely cause | Fix |
| ------- | ------------ | --- |
| Install "didn't do anything" — no files changed | You ran a **dry-run** (the default) | Add `--apply`: `node bin/cortex.mjs install copilot --apply` |
| `doctor` shows **unresolved placeholders** (e.g. `{{VAULT_ROOT}}`) | Installed before scaffolding a vault, so config values were never filled in | Run `create-cortex` to write `~/.cortex/cortex.config.json`, or pass values on install: `install copilot --vault ~/cortex-vault --apply` |
| Agent/prompt **not appearing** in my tool | Not installed for that tool, or the tool wasn't reloaded | `node bin/cortex.mjs doctor` to confirm it's installed; if missing, `install <tool> --apply`; then restart/reload the tool so it picks up new agents |
| `doctor` says a tool is **"not installed"** but I ran install | You installed to a different `--home`, or install was a dry-run | Re-run `install <tool> --apply` (no `--home` for your real home); confirm with `doctor` |
| Atlassian **401** on Jira/Confluence | Token wrong or expired | Regenerate at `id.atlassian.com` → API tokens, then re-run `node bin/cortex.mjs setup-atlassian` |
| Atlassian **403** | Token is valid but your account lacks access to that **site's** content | Request access to that site (separate from any MCP grant); confirm you're using the right `--jira-url` / `--confluence-url` |
| Atlassian **404** on a Jira query | Wrong project key or wrong site (split instance) | Check `JIRA_URL` + `JIRA_PROJECT_KEY`; if split-instance, confirm Confluence/Jira URLs aren't swapped |
| **Timeouts / HTTP 000** reaching Atlassian | Behind a corporate proxy, or off-network | Set a proxy: `setup-atlassian … --proxy http://proxy:port` (writes `HTTPS_PROXY`); or retry on-network |
| `setup-atlassian` validation warns it "could not reach" | Network/proxy blocked the validation call | Credentials are still saved — verify at runtime, or re-run with `--proxy`. Use `--no-validate` to skip the check |
| `leak-check` **FAILED** | Personal/company data crept into `store/` or `vault-template/` | Open the reported `file:line`, remove/anonymize the flagged text, re-run `node bin/cortex.mjs leak-check` until it passes. (Real data belongs in your vault, never the template) |
| Example notes **won't go away** | Cleanup is dry-run by default, or you snoozed the reminder | `node bin/cortex.mjs cleanup-examples --apply` to delete them; or re-`--snooze` to defer. Use `--vault <path>` if the vault isn't auto-detected |
| `cleanup-examples` says **"No vault found"** | No `~/.cortex/cortex.config.json`, and no `--vault` given | Run `create-cortex` first, or pass `--vault <path>` explicitly |
| Sprint data looks **stale** | Expecting Jira data in the vault — but Cortex never caches it | Ask `sprint-ops` (or run `/standup` / `/daily-brief`); it queries Jira **live**. Make sure Jira is connected via `setup-atlassian` |
| `node: command not found` / syntax errors | Node is older than 18 | Cortex needs **Node ≥ 18**; upgrade Node and retry |

### Still stuck?

Run the health check and read what it reports — it usually points straight at the problem:

```bash
node bin/cortex.mjs doctor
```

To experiment without touching your real setup, install against a throwaway home and inspect the result:

```bash
node bin/cortex.mjs install copilot --home /tmp/cortex-test --apply
node bin/cortex.mjs doctor --home /tmp/cortex-test
```
