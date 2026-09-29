# Recommended agent settings (per editor)

Cortex installs agents, prompts, skills, and MCP servers, but a few host-level
agent settings make the swarm noticeably better. These live in each editor's own
config, not in Cortex, so they are documented here rather than written
automatically (changing a user's editor config is opt-in). `cortex doctor`
reports the current values of the VS Code ones it can read.

The one setting Cortex *does* write — only with `--hide-specialists` — is
`chat.customAgentInSubagent.enabled`, because hidden specialists are unreachable
without it. Everything below is optional tuning.

## VS Code (GitHub Copilot)

Add to your User `settings.json`:

```jsonc
{
  // Let an agent take more steps before pausing for confirmation (default 25).
  "chat.agent.maxRequests": 50,
  // Auto-discover relevant files when you use #codebase in a prompt (default false).
  "github.copilot.chat.codesearch.enabled": true,
  // Subagents run in their own context and can run in parallel; required when
  // Cortex specialists are hidden from the picker (cortex setup --hide-specialists sets this).
  "chat.customAgentInSubagent.enabled": true
}
```

Notes:
- The iteration cap is `chat.agent.maxRequests` (not under `github.copilot.chat.agent.*`).
- There is no documented per-tool `parallelToolCalls` flag; parallelism comes from
  subagents (`chat.customAgentInSubagent.enabled`).

## Cursor

Cursor has **no settings.json keys** for these — they are mode/UI driven:
- Tool-call budget: Standard mode is ~25 tool calls; **Max mode** raises it to ~200 and uses the full context window. Toggle Max mode per chat.
- Parallelism: use **subagents** or the `/multitask` command / "Build in Parallel" from a plan.
- Codebase search: automatic (the workspace is indexed); no flag needed.

## OpenCode

In `~/.config/opencode/opencode.json`:
- **Max steps:** OpenCode exposes a max-agentic-iterations control per agent (the analog of `chat.agent.maxRequests`).
- **Parallel subagents:** core OpenCode runs subagents in parallel; some distributions add a `background_task` concurrency block (`defaultConcurrency`, `providerConcurrency`, `modelConcurrency`) to cap it. Not part of core schema.
- **Code search:** always-on `grep`/`glob` tools; no equivalent enable flag.

## IntelliJ (GitHub Copilot plugin)

The `chat.*` / `github.copilot.chat.*` keys above are VS Code-specific. In
IntelliJ, configure Copilot via Settings → Languages & Frameworks → GitHub
Copilot (and the Copilot Chat panel). There is no user JSON settings file for
Cortex to write, so apply the equivalents through that UI.
