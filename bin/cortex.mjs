#!/usr/bin/env node
// cortex — install/uninstall/doctor the Cortex swarm into your AI tools.
// Dry-run by default. Nothing is written unless you pass --apply.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  adapterNames, planInstall, resolveVars, loadInstalledConfig, loadProfiles,
  leakCheck, writeFileSafe, unresolved, REPO_ROOT, STORE_DIR, VAULT_TEMPLATE_DIR, ensureDir,
  findExampleFiles, today, addDays, toolBase,
} from '../lib/core.mjs';
import { mergeMcp, mcpTargets } from '../lib/mcp.mjs';
import { persistCredentials, shellProfilePath, IS_MAC, IS_WIN } from '../lib/secrets.mjs';
import { confirm, text } from '../lib/prompt.mjs';
import { parseArgs } from '../lib/args.mjs';
import { setVscodeSettings, getVscodeSetting, vscodeUserSettings, SUBAGENT_SETTING } from '../lib/settings.mjs';

function configFromFlags(flags) {
  const installed = loadInstalledConfig() || {};
  return {
    role: flags.role || installed.role,
    vaultRoot: flags.vault || installed.vaultRoot,
    jiraKey: flags.jira || installed.jiraKey,
    owner: installed.owner,
    team: installed.team,
  };
}

function doInstall(tools, flags) {
  const apply = !!flags.apply;
  const home = flags.home ? path.resolve(flags.home) : os.homedir();
  const hideSpecialists = !!flags['hide-specialists'];
  const resetTools = !!flags['reset-tools'];
  const vars = resolveVars(configFromFlags(flags));
  console.log(`\nCortex install → role: ${vars.ROLE} · home: ${home} · mode: ${apply ? 'APPLY' : 'dry-run (use --apply to write)'}${hideSpecialists ? ' · specialists hidden from picker' : ''}${resetTools ? ' · resetting tools to defaults' : ''}\n`);

  // Hiding specialists only works if the router can still reach them as
  // subagents, so couple the flag with the VS Code setting that enables that.
  // Only relevant to the copilot adapter (the one that emits user-invocable).
  if (hideSpecialists && apply && tools.includes('copilot')) {
    const r = setVscodeSettings(home, { [SUBAGENT_SETTING]: true }, { apply: true });
    if (r.error) console.log(`⚠ Could not enable ${SUBAGENT_SETTING}: ${r.error}\n  Hidden specialists need it — enable it manually (doctor will keep flagging this).\n`);
    else console.log(`${r.changed.length ? 'Enabled' : 'Already set'}: ${SUBAGENT_SETTING} → ${r.path.replace(home, '~')}\n`);
  }

  for (const tool of tools) {
    const { base, actions, label } = planInstall(tool, { home, vars, hideSpecialists, resetTools });
    console.log(`■ ${tool} — ${label}`);
    const written = [];
    let warn = 0;
    for (const act of actions) {
      const rel = path.relative(home, act.path);
      const left = unresolved(act.content).filter((k) => !['VAULT_ROOT'].includes(k) || vars.VAULT_ROOT.startsWith('<'));
      if (left.length) { warn++; }
      const status = writeFileSafe(act.path, act.content, { apply });
      written.push(act.path);
      console.log(`   ${apply ? status.padEnd(9) : 'plan'}  ${rel}${left.length ? `   ⚠ unresolved: ${left.join(',')}` : ''}`);
    }
    if (apply) {
      ensureDir(base);
      fs.writeFileSync(path.join(base, '.cortex-manifest.json'),
        JSON.stringify({ tool, role: vars.ROLE, installedAt: new Date().toISOString(), files: written }, null, 2));
    }
    console.log(`   ${actions.length} files${warn ? ` · ${warn} with unresolved placeholders (set --vault / run create-cortex)` : ''}\n`);
  }
  if (!apply) console.log('Dry run only. Re-run with --apply to write. Tip: --home /tmp/cortex-test to try safely.\n');
}

function doUninstall(tools, flags) {
  const apply = !!flags.apply;
  const home = flags.home ? path.resolve(flags.home) : os.homedir();
  for (const tool of tools) {
    const manifest = path.join(toolBase(tool, home), '.cortex-manifest.json');
    if (!fs.existsSync(manifest)) { console.log(`■ ${tool}: no manifest at ${manifest} — nothing to remove.`); continue; }
    const { files } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    console.log(`■ ${tool}: ${files.length} files`);
    for (const f of files) {
      const bak = f + '.cortex-bak';
      const restoring = fs.existsSync(bak);
      console.log(`   ${apply ? (restoring ? 'restore' : 'remove ') : 'plan   '} ${path.relative(home, f)}${restoring ? ' (← .cortex-bak)' : ''}`);
      if (apply) {
        if (restoring) fs.renameSync(bak, f);              // put the pre-existing file back
        else if (fs.existsSync(f)) fs.rmSync(f);
      }
    }
    if (apply) fs.rmSync(manifest);
  }
  if (!apply) console.log('\nDry run only. Re-run with --apply to remove.');
}

function doDoctor(flags) {
  const home = flags.home ? path.resolve(flags.home) : os.homedir();
  const cfg = loadInstalledConfig();
  console.log('\nCortex doctor\n');
  console.log(`  config: ${cfg ? `found (role=${cfg.role}, vault=${cfg.vaultRoot})` : 'NOT found at ~/.cortex/cortex.config.json — run create-cortex'}`);
  for (const tool of adapterNames()) {
    const base = toolBase(tool, home);
    const manifest = path.join(base, '.cortex-manifest.json');
    if (!fs.existsSync(manifest)) { console.log(`  ${tool.padEnd(9)} not installed`); continue; }
    const { files, role } = JSON.parse(fs.readFileSync(manifest, 'utf8'));
    const missing = files.filter((f) => !fs.existsSync(f));
    let unresolvedCount = 0;
    for (const f of files) if (fs.existsSync(f)) unresolvedCount += unresolved(fs.readFileSync(f, 'utf8')).length;
    console.log(`  ${tool.padEnd(9)} installed (role=${role}) · ${files.length} files · ${missing.length} missing · ${unresolvedCount} unresolved placeholders`);
  }

  // Credentials reachable in THIS shell (the editor inherits the same env).
  console.log('\n  credentials (this shell):');
  for (const v of ['ATLASSIAN_EMAIL', 'ATLASSIAN_API_TOKEN', 'JIRA_URL', 'CONFLUENCE_URL', 'GITHUB_TOKEN']) {
    const set = !!process.env[v];
    const secret = v.includes('TOKEN');
    console.log(`    ${set ? '✓' : '·'} ${v.padEnd(20)} ${set ? (secret ? 'set (hidden)' : process.env[v]) : 'not set — open a new terminal or check your shell profile'}`);
  }
  const prof = shellProfilePath();
  const wired = prof && fs.existsSync(prof) && /# >>> cortex \(managed\) >>>/.test(fs.readFileSync(prof, 'utf8'));
  console.log(`    ${wired ? '✓' : '·'} shell profile      ${wired ? `managed block present in ${prof.replace(home, '~')}` : `no cortex block in ${prof ? prof.replace(home, '~') : '(none)'}`}`);

  // MCP servers Cortex provisioned (its own entries, tagged _source: cortex).
  console.log('\n  mcp servers (cortex-owned):');
  for (const t of mcpTargets(home)) {
    if (!fs.existsSync(t.path)) { console.log(`    · ${t.label.padEnd(12)} no config at ${t.path.replace(home, '~')}`); continue; }
    let mine = [];
    try {
      const doc = JSON.parse(fs.readFileSync(t.path, 'utf8'));
      mine = Object.entries(doc.servers || {}).filter(([, c]) => c && c._source === 'cortex').map(([k]) => k);
    } catch { console.log(`    ⚠ ${t.label.padEnd(12)} ${t.path.replace(home, '~')} is not valid JSON`); continue; }
    console.log(`    ${mine.length ? '✓' : '·'} ${t.label.padEnd(12)} ${mine.length ? mine.join(', ') : 'none'}  → ${t.path.replace(home, '~')}`);
  }

  // Subagent reachability: if specialists are hidden from the picker, the router
  // can only reach them when chat.customAgentInSubagent.enabled is on. Flag any
  // mismatch that would strand the swarm.
  console.log('\n  copilot subagents:');
  // Check any installed specialist (per the manifest), not a hardcoded name, so
  // this stays correct if a profile ever trims the agent set.
  const copilotManifest = path.join(toolBase('copilot', home), '.cortex-manifest.json');
  let hidden = false;
  if (fs.existsSync(copilotManifest)) {
    const { files } = JSON.parse(fs.readFileSync(copilotManifest, 'utf8'));
    const specialists = files.filter((f) => /agents[\\/](?!cortex\.agent\.md)[^\\/]+\.agent\.md$/.test(f) && fs.existsSync(f));
    hidden = specialists.some((f) => /user-invocable:\s*false/.test(fs.readFileSync(f, 'utf8')));
  }
  const settingOn = getVscodeSetting(home, SUBAGENT_SETTING) === true;
  console.log(`    ${hidden ? '·' : '✓'} specialists ${hidden ? 'hidden from the agent picker (router-only)' : 'visible in the agent picker'}`);
  console.log(`    ${settingOn ? '✓' : '·'} ${SUBAGENT_SETTING} ${settingOn ? 'enabled' : 'not enabled'}  → ${vscodeUserSettings(home).replace(home, '~')}`);
  if (hidden && !settingOn) console.log('    ⚠ specialists are hidden but the subagent setting is OFF — the router can\'t reach them. Enable the setting or reinstall without hiding.');

  // Recommended VS Code agent settings (read-only — see docs/RECOMMENDED-AGENT-SETTINGS.md).
  // Cortex doesn't write these automatically; it just reports them.
  console.log('\n  recommended VS Code settings (optional):');
  const recs = [
    ['chat.agent.maxRequests', 50, 'raise the iteration cap above the default 25'],
    ['github.copilot.chat.codesearch.enabled', true, '#codebase auto-discovery'],
  ];
  for (const [key, want, why] of recs) {
    const cur = getVscodeSetting(home, key);
    const ok = cur !== undefined;
    console.log(`    ${ok ? '✓' : '·'} ${key} ${ok ? `= ${JSON.stringify(cur)}` : `unset (suggest ${JSON.stringify(want)} — ${why})`}`);
  }
  console.log('');
}

function doCleanupExamples(flags) {
  const cfg = loadInstalledConfig();
  const vaultRoot = flags.vault ? path.resolve(flags.vault) : cfg?.vaultRoot;
  if (!vaultRoot || !fs.existsSync(vaultRoot)) {
    console.error('No vault found. Pass --vault <path>, or run create-cortex first.'); process.exit(1);
  }
  const markerP = path.join(vaultRoot, '_memory', 'examples.json');
  const files = findExampleFiles(vaultRoot);

  if (flags.snooze !== undefined) {
    const days = typeof flags.snooze === 'string' && /^\d+$/.test(flags.snooze) ? +flags.snooze : 7;
    let marker = fs.existsSync(markerP) ? JSON.parse(fs.readFileSync(markerP, 'utf8')) : {};
    if (!marker.createdAt) marker.createdAt = today();
    marker.snoozeUntil = addDays(today(), days);
    marker.files = files.map((f) => path.relative(vaultRoot, f));
    ensureDir(path.dirname(markerP));
    fs.writeFileSync(markerP, JSON.stringify(marker, null, 2));
    console.log(`Snoozed example cleanup ${days} day(s) — until ${marker.snoozeUntil}. ${files.length} example file(s) kept.`);
    return;
  }

  if (!files.length) {
    console.log('No example notes (EXAMPLE-*) found.');
    if (fs.existsSync(markerP) && flags.apply) { fs.rmSync(markerP); console.log('Removed stale marker.'); }
    return;
  }

  const apply = !!flags.apply;
  console.log(`\n${files.length} example note(s) in ${vaultRoot}:`);
  for (const f of files) console.log(`   ${apply ? 'removed ' : 'plan    '} ${path.relative(vaultRoot, f)}`);
  if (apply) {
    for (const f of files) fs.rmSync(f);
    if (fs.existsSync(markerP)) fs.rmSync(markerP);
    console.log('\nRemoved example notes + marker.');
  } else {
    console.log('\nDry run. Re-run with --apply to delete, or --snooze [days] to defer.');
  }
}

function doLeakCheck() {
  const findings = leakCheck([STORE_DIR, VAULT_TEMPLATE_DIR]);
  if (!findings.length) { console.log('✅ leak-check passed — no personal/company data found in store/ or vault-template/.'); return 0; }
  console.log(`🚨 leak-check FAILED — ${findings.length} potential leak(s):\n`);
  for (const f of findings) console.log(`  ${path.relative(REPO_ROOT, f.file)}:${f.line}  [${f.pattern}]  ${f.text}`);
  return 1;
}

const TOKEN_URL = 'https://id.atlassian.com/manage-profile/security/api-tokens';
const mask = (t) => (t && t.length > 4 ? '****' + t.slice(-4) : '****');
const normUrl = (u) => (u || '').trim().replace(/\/+$/, '');

async function validate(label, url, email, token) {
  const auth = Buffer.from(`${email}:${token}`).toString('base64');
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const r = await fetch(url, { headers: { Authorization: `Basic ${auth}`, Accept: 'application/json' }, signal: ac.signal });
    if (r.status === 200) return `✅ ${label}: ok`;
    if (r.status === 401) return `🚫 ${label}: 401 — token wrong/expired`;
    if (r.status === 403) return `⚠ ${label}: 403 — token ok but no access to this site`;
    return `⚠ ${label}: HTTP ${r.status}`;
  } catch {
    return `⚠ ${label}: could not reach (network/proxy) — saved anyway; verify at runtime`;
  } finally {
    clearTimeout(timer);
  }
}

async function doSetupAtlassian(flags) {
  const tty = process.stdin.isTTY && !flags.email; // interactive only if not fully flag-driven
  let email = flags.email, token = flags.token, jiraUrl = flags['jira-url'], confUrl = flags['confluence-url'], proxy = flags.proxy;
  const same = !!flags['confluence-same'];

  if (tty) {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\nSet up Atlassian for Cortex.\n\n  • Create an API token (account-scoped — works for Jira AND Confluence, even on different sites):\n    ${TOKEN_URL}\n  • Your input is visible in this terminal; the token is stored to a 0600 file, never printed back in full.\n`);
    email = email || (await rl.question('Atlassian account email: ')).trim();
    token = token || (await rl.question('API token: ')).trim();
    jiraUrl = jiraUrl || (await rl.question('Jira base URL [https://your-org.atlassian.net]: ')).trim();
    const ans = (await rl.question('Is Confluence on the SAME Atlassian site as Jira? [Y/n]: ')).trim().toLowerCase();
    if (ans === 'n' || ans === 'no') confUrl = confUrl || (await rl.question('Confluence base URL: ')).trim();
    else confUrl = jiraUrl;
    proxy = proxy || (await rl.question('Corporate HTTPS proxy (optional, blank to skip): ')).trim();
    rl.close();
  } else {
    if (same && jiraUrl) confUrl = confUrl || jiraUrl;
  }

  jiraUrl = normUrl(jiraUrl); confUrl = normUrl(confUrl || jiraUrl);
  const missing = [['email', email], ['token', token], ['jira-url', jiraUrl]].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`Missing: ${missing.join(', ')}. Provide via flags or run interactively in a TTY.\n  cortex setup-atlassian --email you@org.com --token <t> --jira-url https://org.atlassian.net [--confluence-same | --confluence-url https://wiki-org.atlassian.net] [--proxy URL]`);
    process.exit(1);
  }

  const split = confUrl !== jiraUrl;
  console.log(`\n  Jira:       ${jiraUrl}\n  Confluence: ${confUrl}${split ? '   (split instance — different site)' : '   (same site)'}\n  Email:      ${email}\n  Token:      ${mask(token)}${proxy ? `\n  Proxy:      ${proxy}` : ''}\n`);

  if (!flags['no-validate']) {
    console.log('Validating (best-effort; proxy not used here)...');
    console.log('  ' + (await validate('Jira', `${jiraUrl}/rest/api/3/myself`, email, token)));
    console.log('  ' + (await validate('Confluence', `${confUrl}/wiki/api/v2/spaces?limit=1`, email, token)));
    console.log('');
  }

  if (flags.print) {
    console.log(`--print (not writing):\n  ATLASSIAN_EMAIL=${email}\n  ATLASSIAN_API_TOKEN=${mask(token)}\n  JIRA_URL=${jiraUrl}\n  CONFLUENCE_URL=${confUrl}${proxy ? `\n  HTTPS_PROXY=${proxy}` : ''}`);
    return;
  }

  // Funnel through the same secure-storage path as `cortex setup` (Keychain /
  // DPAPI / env-file) — no plaintext bypass, standardized on JIRA_URL/CONFLUENCE_URL.
  const s = persistCredentials({ email, apiToken: token, jiraUrl, confluenceUrl: confUrl, proxy }, { apply: true });
  if (s.stored.length) console.log(`Secured (${s.mode}): ${s.stored.join(', ')}`);
  for (const f of s.files) console.log(`Wrote ${f} (chmod 600)`);
  if (s.profile) console.log(`Wired into ${s.profile}. Open a new terminal (or reload it) to load the credentials. Re-run anytime to update.`);
}

// ---------- setup: the one-command wizard ----------

const CREATE_CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'create-cortex.mjs');

async function doSetup(flags) {
  const home = flags.home ? path.resolve(flags.home) : os.homedir();
  console.log('\n🧠 Cortex setup — three steps to ready: scaffold · credentials · wire your tool.\n');

  // 1. Scaffold the vault (role + identity). Interactive; no chained prompts.
  const scaffold = spawnSync('node', [CREATE_CLI, '--no-chain', ...(flags.role ? ['--role', flags.role] : []), ...(flags.vault ? ['--vault', flags.vault] : [])], { stdio: 'inherit' });
  if (scaffold.status !== 0) { console.error('\nVault scaffold failed — aborting.'); process.exit(1); }
  const cfg = loadInstalledConfig();
  if (!cfg) { console.error('No ~/.cortex/cortex.config.json after scaffold — aborting.'); process.exit(1); }

  // 2. Connections + credentials. Secrets go to secure storage (macOS Keychain /
  //    Windows DPAPI / else ~/.cortex/*.env chmod 600) and a managed block in
  //    your shell profile loads them. GitHub MCP authenticates with your PAT;
  //    Jira MCP is Atlassian Rovo over OAuth (sign in once in-editor); Confluence
  //    is served by the REST skill (no MCP) using the same token + CONFLUENCE_URL.
  console.log('\n── Connections ───────────────────────────────────────────────');
  console.log(`Secrets are stored ${IS_MAC ? 'in your macOS Keychain' : IS_WIN ? 'DPAPI-encrypted (per-user)' : 'in ~/.cortex/*.env (chmod 600)'} and loaded by your shell.\n`);

  let email, apiToken, jiraUrl, confluenceUrl, proxy, githubToken;
  const wantAtlassian = await confirm('Wire up Jira (Rovo MCP) + Confluence (REST)?', true);
  if (wantAtlassian) {
    console.log('  Jira MCP signs in via OAuth in your editor. Confluence + the Jira REST fallback');
    console.log('  use an API token: https://id.atlassian.com/manage-profile/security/api-tokens');
    email = await text('  Atlassian account email', '');
    apiToken = await text('  API token', '', { hidden: true });
    const ju = await text('  Jira base URL', 'https://your-org.atlassian.net');
    jiraUrl = normUrl(ju);
    confluenceUrl = (await confirm('  Is Confluence on the SAME site as Jira?', true))
      ? jiraUrl
      : normUrl(await text('  Confluence base URL', ''));
    proxy = await text('  Corporate HTTPS proxy (blank to skip)', '');
    if (!flags['no-validate'] && email && apiToken) {
      console.log('  ' + (await validate('Jira', `${jiraUrl}/rest/api/3/myself`, email, apiToken)));
    }
  }
  const wantGithub = await confirm('Wire up GitHub (MCP via your PAT)?', true);
  if (wantGithub) {
    console.log('  GitHub MCP authenticates with a Personal Access Token (required for MCP + gh):');
    console.log('  https://github.com/settings/tokens  (fine-grained: https://github.com/settings/personal-access-tokens/new)');
    githubToken = await text('  GitHub token', '', { hidden: true });
    if (!githubToken) console.log('  ⚠ No token entered — GitHub MCP needs it; skipping the GitHub server.');
  }

  const credSummary = persistCredentials({ email, apiToken, jiraUrl, confluenceUrl, proxy, githubToken }, { apply: true });
  if (credSummary.stored.length) console.log(`   Secured (${credSummary.mode}): ${credSummary.stored.join(', ')}`);
  for (const f of credSummary.files) console.log(`   Wrote ${f.replace(home, '~')} (chmod 600)`);
  if (credSummary.profile) console.log(`   Wired into ${credSummary.profile.replace(home, '~')}`);

  // 3. Install the Copilot adapter (VS Code + CLI + IntelliJ). Each agent is
  //    written with an explicit tools: list of real built-in + MCP tool IDs.
  //    Optionally hide specialists from the agent picker — but only together with
  //    the VS Code setting that lets the router still reach them as subagents, so
  //    they never become unreachable from both directions.
  console.log('\n── Installing Copilot adapter (VS Code + CLI + IntelliJ) ─────');
  const hideSpecialists = flags['hide-specialists'] !== undefined
    ? !!flags['hide-specialists']
    : await confirm('Hide specialists from the agent picker? (only the `cortex` router stays user-facing; this also enables an experimental VS Code setting so the router can still reach them)', false);
  doInstall(['copilot'], { apply: true, home: flags.home, 'hide-specialists': hideSpecialists });

  // 4. Wire MCP servers. GitHub uses the PAT (Bearer header); Jira uses Rovo OAuth.
  console.log('── Wiring MCP servers ────────────────────────────────────────');
  const serverIds = [];
  if (wantAtlassian) serverIds.push('atlassian');                               // Jira (Rovo, OAuth)
  if (wantGithub && githubToken) serverIds.push('io.github.github/github-mcp-server'); // GitHub (PAT)
  // Always merge — even with no selection — so stale cortex-owned servers from a
  // previous run are removed (mergeMcp only ever touches _source: cortex entries).
  for (const t of mcpTargets(home)) {
    const r = mergeMcp(t.path, serverIds, { apply: true });
    if (r.error) { console.log(`   ⚠ ${t.label}: ${r.error}`); continue; }
    const changes = [
      ...r.added.map((s) => '+ ' + s),
      ...r.removed.map((s) => '- ' + s),
    ];
    console.log(`   ${t.label.padEnd(18)} ${changes.length ? changes.join(', ') : '(no changes)'}  → ${t.path.replace(home, '~')}`);
  }
  if (wantAtlassian) console.log('   Jira MCP: sign in via OAuth in your editor on first use.');
  if (!serverIds.length) console.log('   No servers selected — removed any previously-provisioned cortex servers.');

  // 5. Verify.
  console.log('\n── Verify ────────────────────────────────────────────────────');
  doDoctor({ home: flags.home });

  console.log('✅ Cortex is ready.\n');
  if (credSummary.profile) {
    const p = credSummary.profile.replace(home, '~');
    console.log(`   • Load credentials now:  ${IS_WIN ? `. ${p}` : `source ${p}`}   (or open a new terminal)`);
  }
  console.log('   • Restart VS Code so Copilot picks up the new agents + MCP servers.');
  console.log('   • Open Copilot chat → run the `cortex` agent or `/daily-brief`.');
  console.log('   • Add more tools later: node bin/cortex.mjs install cursor --apply\n');
}

function help() {
  console.log(`cortex — provision the Cortex swarm into your AI tools (dry-run by default)

Usage:
  cortex setup [--role R] [--vault PATH] [--no-validate] [--hide-specialists] [--home DIR]
  cortex install <tool|--all> [--apply] [--home DIR] [--role R] [--vault PATH] [--jira KEY] [--hide-specialists] [--reset-tools]
  cortex uninstall <tool|--all> [--apply] [--home DIR]
  cortex doctor [--home DIR]
  cortex setup-atlassian [--email E --token T --jira-url U] [--confluence-same | --confluence-url U] [--proxy URL] [--no-validate] [--print]
  cortex cleanup-examples [--apply | --snooze [days]] [--vault DIR]
  cortex leak-check

Tools: ${adapterNames().join(', ')}   (copilot covers VS Code + CLI + IntelliJ)
setup: the one-command wizard — scaffold a vault, capture + store credentials
       (macOS Keychain, else ~/.cortex/*.env), install the Copilot adapter with all
       built-in tools enabled, wire MCP servers (jira; Confluence stays a REST skill),
       and run doctor. This is what ./install.sh runs.

Examples:
  cortex setup
  cortex install copilot --apply
  cortex install --all --home /tmp/cortex-test --apply --role product-manager --vault /tmp/v
  cortex doctor --home /tmp/cortex-test
`);
}

const args = parseArgs(process.argv.slice(2));
const cmd = args._[0];
const toolArg = args._[1];
const tools = args.flags.all ? adapterNames() : toolArg ? [toolArg] : [];

switch (cmd) {
  case 'setup': await doSetup(args.flags); break;
  case 'install':
    if (!tools.length) { console.error('Specify a tool or --all'); process.exit(1); }
    doInstall(tools, args.flags); break;
  case 'uninstall':
    if (!tools.length) { console.error('Specify a tool or --all'); process.exit(1); }
    doUninstall(tools, args.flags); break;
  case 'doctor': doDoctor(args.flags); break;
  case 'setup-atlassian': await doSetupAtlassian(args.flags); break;
  case 'cleanup-examples': doCleanupExamples(args.flags); break;
  case 'leak-check': process.exit(doLeakCheck()); break;
  default: help();
}
