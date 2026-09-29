// Cortex core — dependency-free helpers shared by the CLIs.
// Node >=18, ESM. No external packages.

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const STORE_DIR = path.join(REPO_ROOT, 'store');
export const VAULT_TEMPLATE_DIR = path.join(REPO_ROOT, 'vault-template');

// ---------- tiny frontmatter (controlled simple format) ----------

export function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!m) return { data: {}, body: text };
  const data = {};
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([A-Za-z0-9_]+):\s*(.*)$/);
    if (!kv) continue;
    const key = kv[1];
    let val = kv[2].trim();
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map((s) => s.trim()).filter(Boolean);
    } else if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    data[key] = val;
  }
  return { data, body: m[2] };
}

// ---------- placeholder substitution ----------

export function substitute(text, vars) {
  return text.replace(/\{\{([A-Z_]+)\}\}/g, (whole, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? String(vars[key]) : whole,
  );
}

// Remaining {{UPPER_CASE}} placeholders (config-style). Ignores {{lowercase}} note placeholders in templates.
export function unresolved(text) {
  const out = new Set();
  for (const m of text.matchAll(/\{\{([A-Z_]+)\}\}/g)) out.add(m[1]);
  return [...out];
}

// ---------- profiles + config ----------

export function loadProfiles() {
  const doc = JSON.parse(fs.readFileSync(path.join(STORE_DIR, 'profiles.json'), 'utf8'));
  // A profile may omit `agents`/`folders` to mean "all" — resolve against the
  // canonical lists so downstream code (planInstall, create-cortex) always sees
  // concrete arrays.
  for (const p of Object.values(doc.profiles || {})) {
    if (!Array.isArray(p.agents)) p.agents = [...(doc._allAgents || [])];
    if (!Array.isArray(p.folders)) p.folders = [...(doc._allFolders || [])];
  }
  return doc;
}

export function resolveVars(cfg) {
  const profiles = loadProfiles();
  const role = cfg.role || profiles.default;
  const p = profiles.profiles[role];
  if (!p) throw new Error(`Unknown role '${role}'. Valid: ${Object.keys(profiles.profiles).join(', ')}`);
  return {
    VAULT_ROOT: cfg.vaultRoot || '<set VAULT_ROOT>',
    CORTEX_HOME: cfg.cortexHome || '<set CORTEX_HOME>',
    JIRA_PROJECT_KEY: cfg.jiraKey || 'PROJ',
    ROLE: role,
    ROLE_TITLE: p.title,
    ROLE_LENS: p.role_lens,
    OWNER: cfg.owner || '<your name>',
    TEAM: cfg.team || '<your team>',
    _profile: p,
  };
}

export function loadInstalledConfig() {
  // Written by create-cortex; consumed by `cortex install`.
  const f = path.join(os.homedir(), '.cortex', 'cortex.config.json');
  if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
  return null;
}

// ---------- capability -> per-tool tool mapping ----------

// Two separate namespaces — keep them distinct:
//
//  mcp.json server key  (`io.github.github/github-mcp-server`, `atlassian`)
//    Used only in MCP wiring (see lib/mcp.mjs + store/mcp/servers.json).
//    Never appears in an agent's `tools:` list.
//
//  Copilot agent `tools:` toolset prefix  (`github/<tool>`, `atlassian/<tool>`)
//    The short name VS Code exposes once the server is connected. This is what
//    goes into the agent file. We enumerate explicit IDs here rather than a
//    wildcard because the Copilot client doesn't reliably expand `github/*` —
//    an unexpanded wildcard grants nothing.
const GH = 'github'; // GitHub MCP toolset prefix
const GITHUB_TOOLS = [
  'add_comment_to_pending_review', 'add_issue_comment', 'add_reply_to_pull_request_comment',
  'assign_copilot_to_issue', 'create_branch', 'create_or_update_file', 'create_pull_request',
  'create_pull_request_with_copilot', 'create_repository', 'delete_file', 'fork_repository',
  'get_commit', 'get_copilot_job_status', 'get_file_contents', 'get_label', 'get_latest_release',
  'get_me', 'get_release_by_tag', 'get_tag', 'get_team_members', 'get_teams', 'issue_read',
  'issue_write', 'list_branches', 'list_commits', 'list_issue_types', 'list_issues',
  'list_pull_requests', 'list_releases', 'list_tags', 'merge_pull_request', 'pull_request_read',
  'pull_request_review_write', 'push_files', 'request_copilot_review', 'run_secret_scanning',
  'search_code', 'search_issues', 'search_pull_requests', 'search_repositories', 'search_users',
  'sub_issue_write', 'update_pull_request', 'update_pull_request_branch',
].map((t) => `${GH}/${t}`);
const ATL = 'atlassian'; // Atlassian's official remote Rovo MCP server
// NOTE: Atlassian Rovo tool IDs below are the documented set — verify against
// the server's published tool list (the remote manifest doesn't enumerate them).
const JIRA_TOOLS = [
  'atlassianUserInfo', 'getAccessibleAtlassianResources', 'getVisibleJiraProjects',
  'getJiraProjectIssueTypesMetadata', 'getJiraIssue', 'searchJiraIssuesUsingJql',
  'createJiraIssue', 'editJiraIssue', 'addCommentToJiraIssue', 'getTransitionsForJiraIssue',
  'transitionJiraIssue', 'lookupJiraAccountId', 'getJiraIssueRemoteIssueLinks',
].map((t) => `${ATL}/${t}`);
// Confluence has NO MCP tools — it's served by the confluence REST skill
// (ATLASSIAN_API_TOKEN + CONFLUENCE_URL), so the capability grants no MCP tools.

export const CAPABILITY_MAP = {
  copilot: {
    // Current VS Code / Copilot **namespaced toolset IDs** (`<group>/<tool>`).
    // VS Code re-serializes an agent's `tools:` to these on load, so emitting
    // them here means a fresh install lands already-enabled and matches what the
    // host writes back (instead of the older flat IDs, which no longer resolve on
    // current VS Code and left tools off until enabled by hand). The installer
    // also PRESERVES a host-managed `tools:` line across reinstalls (see
    // planInstall), so anything the user enables in the UI survives.
    'read-file': ['read/readFile', 'read/problems', 'search/codebase', 'search/fileSearch', 'search/textSearch', 'search/listDirectory', 'search/usages'],
    'write-file': ['edit/editFiles', 'edit/createFile', 'edit/createDirectory', 'edit/rename'],
    'run-terminal': ['execute/runInTerminal', 'execute/getTerminalOutput', 'execute/sendToTerminal', 'execute/runTests', 'execute/runTask'],
    'web-fetch': ['web/fetch', 'web/githubRepo'],
    jira: JIRA_TOOLS,
    github: GITHUB_TOOLS,
    confluence: [],
    calendar: [],
  },
  opencode: {
    'read-file': ['read', 'grep', 'glob'],
    'write-file': ['write', 'edit'],
    'run-terminal': ['bash'],
    'web-fetch': ['webfetch'],
    jira: [],
    github: [],
    confluence: [],
    calendar: [],
  },
};

function mapCaps(tool, caps) {
  const m = CAPABILITY_MAP[tool] || {};
  const out = [];
  for (const c of caps || []) for (const t of m[c] || []) if (!out.includes(t)) out.push(t);
  return out;
}

// ---------- adapters ----------

function asList(v) {
  return Array.isArray(v) ? v : v ? [v] : [];
}

// List files under STORE_DIR/<sub> as paths relative to STORE_DIR.
function walkFiles(absDir) {
  const out = [];
  if (!fs.existsSync(absDir)) return out;
  const walk = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, e.name);
      if (e.isDirectory()) walk(full);
      else out.push(path.relative(STORE_DIR, full));
    }
  };
  walk(absDir);
  return out;
}

const ADAPTERS = {
  copilot: {
    label: 'GitHub Copilot (VS Code + CLI + IntelliJ)',
    base: (home) => path.join(home, '.copilot'),
    agentFile: (name) => `agents/${name}.agent.md`,
    promptFile: (name) => `prompts/${name}.prompt.md`,
    rulesFile: 'cortex.instructions.md',
    // VS Code owns the `tools:` line once a user toggles tools in the UI (it
    // re-serializes the agent file). planInstall preserves that host-managed
    // line across reinstalls so enablement isn't reset every time.
    preservesTools: true,
    renderAgent(data, body, opts = {}) {
      const fm = ['---', `name: ${data.name}`, `description: "${data.description}"`, 'model: Auto'];
      // Preserve a host-managed tools line verbatim when present (reinstall);
      // otherwise emit the namespaced default set (fresh install).
      let toolsLine = opts.preserveToolsLine || null;
      if (!toolsLine) {
        const tools = mapCaps('copilot', asList(data.capabilities));
        // Only routers dispatch subagents; specialists execute and don't fan out.
        if (data.role === 'router' && !tools.includes('agent/runSubagent')) tools.push('agent/runSubagent');
        // Interactive UX for every agent: structured decision prompt + to-do list.
        for (const t of ['vscode/askQuestions', 'todo']) if (!tools.includes(t)) tools.push(t);
        if (tools.length) toolsLine = `tools: [${tools.join(', ')}]`;
      }
      if (toolsLine) fm.push(toolsLine);
      const delegates = asList(data.delegates);
      if (delegates.length) fm.push(`agents: [${delegates.join(', ')}]`);
      // Opt-in only: hide specialists from the agent picker, keeping them
      // delegatable as subagents. This REQUIRES the VS Code setting
      // chat.customAgentInSubagent.enabled (cortex setup writes it alongside this
      // flag); without it specialists become unreachable from both directions.
      // Default install keeps specialists user-invocable.
      if (data.role !== 'router' && opts.hideSpecialists) fm.push('user-invocable: false');
      fm.push('---', '');
      return fm.join('\n') + body;
    },
    renderPrompt(data, body) {
      const fm = ['---'];
      if (data.agent) fm.push(`agent: ${data.agent}`);
      fm.push(`description: "${data.description}"`, '---', '');
      return fm.join('\n') + body;
    },
  },
  cursor: {
    label: 'Cursor',
    base: (home) => path.join(home, '.cursor'),
    agentFile: (name) => `agents/${name}.md`,
    promptFile: (name) => `commands/${name}.md`, // Cursor slash-commands
    rulesFile: 'rules/cortex.md',
    renderAgent(data, body) {
      const fm = ['---', `name: ${data.name}`, `description: "${data.description}"`];
      const delegates = asList(data.delegates);
      if (delegates.length) fm.push(`agents: [${delegates.join(', ')}]`);
      fm.push('---', '');
      return fm.join('\n') + body;
    },
    renderPrompt(data, body) {
      return `---\ndescription: "${data.description}"\n---\n\n` + body;
    },
  },
  opencode: {
    label: 'OpenCode',
    base: (home) => path.join(home, '.config', 'opencode'),
    agentFile: (name) => `agent/${name}.md`,
    promptFile: (name) => `command/${name}.md`,
    rulesFile: 'AGENTS.md',
    renderAgent(data, body) {
      const tools = mapCaps('opencode', asList(data.capabilities));
      const fm = ['---', `description: ${data.description}`,
        `mode: ${data.role === 'router' ? 'primary' : 'subagent'}`];
      if (tools.length) {
        fm.push('tools:');
        for (const t of tools) fm.push(`  ${t}: true`);
      }
      fm.push('---', '');
      return fm.join('\n') + body;
    },
    renderPrompt(data, body) {
      // Prompts author the argument slot as `$input`; OpenCode's own token is
      // `$ARGUMENTS`. (VS Code/Copilot and Cursor see the user's argument text in
      // the request itself, so `$input` reads fine there as literal context.)
      return `---\ndescription: ${data.description}\n---\n\n` + body.replace(/\$input\b/g, '$ARGUMENTS');
    },
  },
};

export function adapterNames() {
  return Object.keys(ADAPTERS);
}

// The install base dir for a tool under `home` (e.g. ~/.copilot, ~/.config/opencode).
export function toolBase(tool, home) {
  const ad = ADAPTERS[tool];
  if (!ad) throw new Error(`Unknown tool '${tool}'. Valid: ${adapterNames().join(', ')}`);
  return ad.base(home);
}

export function rulesContent(vars) {
  return [
    `# Cortex - routing context (${vars.ROLE})`,
    '',
    `You are **Cortex** for ${vars.OWNER} (${vars.ROLE_TITLE}). Classify answer, advice, or delivery before tools, context loading, or delegation. Answer/advice is read-only by default, including vault, memory, and graph writes. Honor explicit permissions and scope before any role procedure.`,
    '',
    `Role lens: ${vars.ROLE_LENS}`,
    '',
    `Use supplied context or only the relevant slices of \`${vars.VAULT_ROOT}/config.md\`, \`${vars.VAULT_ROOT}/_memory/learnings.md\`, and domain notes. Reuse unchanged context; a narrow follow-up does not require a vault scan.`,
    '',
    `The Cortex agent owns routing; \`${vars.CORTEX_HOME}/_shared/conventions.md\` owns the task packet, permissions, progress/recovery, resume, and output rules. Answer directly only when existing evidence is sufficient; specialist judgment and fresh status still belong to their owners. Jira facts remain live, never cached in the vault.`,
    '',
    'Cortex never writes code. Hand code delivery to **top-level Forge**, not a nested subagent. Carry Intent, Goal, Anchor, Constraints / non-goals, Acceptance evidence, and Allowed effects, not a strategy. Forge owns decomposition, verification, and independent review. An advice handoff must remain advice; a result is not proof of remote publication.',
    '',
    'Preserve user-selected models and reasoning effort. External coaching is advisory, never a gate or tool/message quota. Do not manufacture tools, documents, or sessions for a score. Keep a compact resume packet at genuine task boundaries, persist only when allowed, and never clear chat automatically.',
    '',
    `During relevant vault work, if \`${vars.VAULT_ROOT}/_memory/examples.json\` exists, today is at least 7 days after \`createdAt\`, and \`snoozeUntil\` has passed (or is null), remind the user once about setup examples. Offer \`cortex cleanup-examples --apply\` or \`cortex cleanup-examples --snooze\`; run only the explicitly authorized option. Do not check this marker for unrelated answers.`,
    '',
  ].join('\n');
}

// Find scaffolded example notes (EXAMPLE-*.md) anywhere in a vault.
export function findExampleFiles(vaultRoot) {
  const out = [];
  const walk = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      if (e.name === '.git' || e.name === 'node_modules') continue;
      const full = path.join(p, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.startsWith('EXAMPLE-') && e.name.endsWith('.md')) out.push(full);
    }
  };
  if (fs.existsSync(vaultRoot)) walk(vaultRoot);
  return out;
}

export const today = () => new Date().toISOString().slice(0, 10);
export const addDays = (isoDate, n) => {
  const d = new Date(isoDate + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

// Build the list of file actions for installing one tool. Pure: returns actions, does not write.
export function planInstall(tool, { home, vars, hideSpecialists = false, resetTools = false }) {
  const ad = ADAPTERS[tool];
  if (!ad) throw new Error(`Unknown tool '${tool}'. Valid: ${adapterNames().join(', ')}`);
  const base = ad.base(home);
  const localVars = { ...vars, CORTEX_HOME: base };
  const actions = [];

  // Agents — only those enabled for the active profile.
  const enabled = new Set(localVars._profile.agents);
  for (const file of fs.readdirSync(path.join(STORE_DIR, 'agents'))) {
    if (!file.endsWith('.agent.md')) continue;
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(STORE_DIR, 'agents', file), 'utf8'));
    if (!enabled.has(data.name)) continue;
    // Don't reference agents that aren't installed for this profile.
    data.delegates = asList(data.delegates).filter((d) => enabled.has(d));
    const target = path.join(base, ad.agentFile(data.name));
    // Preserve a host-managed `tools:` line on reinstall (VS Code rewrites it
    // when the user toggles tools); --reset-tools forces the template default.
    let preserveToolsLine = null;
    if (ad.preservesTools && !resetTools && fs.existsSync(target)) {
      const m = fs.readFileSync(target, 'utf8').match(/^tools:.*$/m);
      if (m) preserveToolsLine = m[0];
    }
    const rendered = ad.renderAgent(data, substitute(body, localVars), { hideSpecialists, preserveToolsLine });
    actions.push({ type: 'write', path: target, content: rendered });
  }

  // Prompts — universal (all personas).
  for (const file of fs.readdirSync(path.join(STORE_DIR, 'prompts'))) {
    if (!file.endsWith('.prompt.md')) continue;
    const { data, body } = parseFrontmatter(fs.readFileSync(path.join(STORE_DIR, 'prompts', file), 'utf8'));
    const name = data.name || file.replace(/\.prompt\.md$/, '');
    const rendered = ad.renderPrompt(data, substitute(body, localVars));
    actions.push({ type: 'write', path: path.join(base, ad.promptFile(name)), content: rendered });
  }

  // Shared references, all skills, and knowledge packs — copied with substitution (recursive).
  for (const dir of ['_shared', 'skills', 'knowledge']) {
    for (const rel of walkFiles(path.join(STORE_DIR, dir))) {
      const content = substitute(fs.readFileSync(path.join(STORE_DIR, rel), 'utf8'), localVars);
      actions.push({ type: 'write', path: path.join(base, rel), content });
    }
  }

  // Always-on rules file (the composed config + role-context pointer).
  actions.push({ type: 'write', path: path.join(base, ad.rulesFile), content: rulesContent(localVars) });

  return { base, actions, label: ad.label };
}

// ---------- privacy leak-check ----------

export const LEAK_PATTERNS = [
  { name: 'absolute home path', re: /\/Users\/[A-Za-z0-9._-]+\// },
  { name: 'literal "Ford"', re: /\bFord\b/ },
  { name: 'company email', re: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]*ford/i },
  { name: 'real Jira key (not the placeholder/PROJ/JIRA-1234)', re: /\b(?!PROJ-|JIRA-)[A-Z]{3,}-\d{2,}\b/ },
  { name: 'ford.atlassian / internal url', re: /[a-z0-9.-]*\.ford\.com|ford\.atlassian\.net/i },
  { name: 'OneDrive-azureford path', re: /OneDrive-azureford/i },
];

export function leakCheck(roots) {
  const findings = [];
  const walk = (p) => {
    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      if (entry.name === 'node_modules' || entry.name === '.git') continue;
      const full = path.join(p, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!/\.(md|json|mjs|js)$/.test(entry.name)) continue;
      const lines = fs.readFileSync(full, 'utf8').split('\n');
      lines.forEach((line, i) => {
        for (const pat of LEAK_PATTERNS) {
          if (pat.re.test(line)) findings.push({ file: full, line: i + 1, pattern: pat.name, text: line.trim().slice(0, 120) });
        }
      });
    }
  };
  for (const r of roots) if (fs.existsSync(r)) walk(r);
  return findings;
}

// ---------- fs helpers ----------

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }

export function writeFileSafe(target, content, { apply, backups }) {
  if (!apply) return 'would-write';
  ensureDir(path.dirname(target));
  if (fs.existsSync(target)) {
    const prev = fs.readFileSync(target, 'utf8');
    if (prev === content) return 'unchanged'; // idempotent
    const bak = target + '.cortex-bak';
    if (!fs.existsSync(bak)) fs.copyFileSync(target, bak); // back up the first pre-existing version once
  }
  fs.writeFileSync(target, content);
  return 'written';
}
