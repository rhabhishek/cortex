#!/usr/bin/env node
// create-cortex — scaffold a tailored Cortex vault for a role, and record config.
// Interactive wizard when run in a terminal; fully flag-driven for automation.
//
// Flags: --role <id> --vault <path> [--owner NAME] [--team TEAM] [--jira KEY]
//        [--examples] [--force] [--yes] (--yes / -y skips all prompts, uses flags+defaults)

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import readline from 'node:readline/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { loadProfiles, resolveVars, substitute, ensureDir, adapterNames, today, VAULT_TEMPLATE_DIR } from '../lib/core.mjs';
import { select, confirm, text } from '../lib/prompt.mjs';
import { parseArgs } from '../lib/args.mjs';

const CLI = path.join(path.dirname(fileURLToPath(import.meta.url)), 'cortex.mjs');

function copyFile(src, dest) { ensureDir(path.dirname(dest)); fs.copyFileSync(src, dest); }
function copyDir(src, dest) {
  ensureDir(dest);
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyDir(s, d); else copyFile(s, d);
  }
}

const flags = parseArgs(process.argv.slice(2)).flags;
const profiles = loadProfiles();
const roleIds = Object.keys(profiles.profiles);

if (flags.help) {
  console.log(`create-cortex — scaffold a Cortex vault (interactive in a terminal)\n\nUsage:\n  create-cortex                                  # guided wizard\n  create-cortex --role <${roleIds.join('|')}> --vault <path> [--owner NAME] [--team TEAM] [--jira KEY] [--no-examples] [--force] [--yes] [--no-chain]\n\nExamples are included by default (with a 1-week cleanup reminder); pass --no-examples to skip.\n--no-chain skips the trailing "connect Jira / wire a tool" prompts (used by \`cortex setup\`).\n`);
  process.exit(0);
}

// Interactive only when attached to a terminal and not explicitly suppressed.
const interactive = process.stdin.isTTY && !flags.yes;

async function gather() {
  let role = flags.role, vault = flags.vault, owner = flags.owner, team = flags.team, jira = flags.jira;
  // Examples are included by default; --no-examples opts out.
  let examples = flags['no-examples'] ? false : (flags.examples ? true : undefined);

  if (interactive) {
    console.log('\nLet\'s set up your Cortex vault.\n');
    if (!role) {
      role = await select('Pick your role (↑/↓, Enter):',
        roleIds.map((id) => ({ id, title: `${profiles.profiles[id].title}  (${id})` })),
        { defaultIndex: Math.max(0, roleIds.indexOf(profiles.default)) });
    }
    if (!vault) vault = await text('Vault path', path.join(os.homedir(), 'cortex-vault'));
    if (owner === undefined) owner = await text('Your name', '');
    if (team === undefined) team = await text('Your team', '');
    if (jira === undefined) jira = await text('Jira project key (blank if none)', 'PROJ');
    if (examples === undefined) examples = await confirm('Include example notes (auto-reminder to clean them up in a week)?', true);
  }

  return { role: role || profiles.default, vault, owner, team, jira, examples: examples === undefined ? true : !!examples };
}

const ans = await gather();

if (!ans.vault) {
  console.error('A vault path is required. Run in a terminal for the wizard, or pass --vault <path>.');
  process.exit(1);
}
const p = profiles.profiles[ans.role];
if (!p) { console.error(`Unknown role '${ans.role}'. Valid: ${roleIds.join(', ')}`); process.exit(1); }

const vaultRoot = path.resolve(String(ans.vault).replace(/^~/, os.homedir()));
if (fs.existsSync(vaultRoot) && fs.readdirSync(vaultRoot).length && !flags.force) {
  console.error(`Refusing to scaffold into non-empty dir ${vaultRoot} (use --force).`); process.exit(1);
}

const vars = resolveVars({ role: ans.role, vaultRoot, owner: ans.owner, team: ans.team, jiraKey: ans.jira });

console.log(`\nScaffolding ${ans.role} vault → ${vaultRoot}\n`);
ensureDir(vaultRoot);

for (const folder of p.folders) {
  const srcFolder = path.join(VAULT_TEMPLATE_DIR, folder);
  const destFolder = path.join(vaultRoot, folder);
  if (fs.existsSync(srcFolder)) copyDir(srcFolder, destFolder);
  else { ensureDir(destFolder); fs.writeFileSync(path.join(destFolder, `${folder}.md`), `# ${folder.replace(/^\d+-/, '')}\n\n> Owned by your persona profile (${ans.role}).\n`); }
  console.log(`  + ${folder}/`);
}

copyDir(path.join(VAULT_TEMPLATE_DIR, 'templates'), path.join(vaultRoot, 'templates'));
copyDir(path.join(VAULT_TEMPLATE_DIR, '_memory'), path.join(vaultRoot, '_memory'));
console.log('  + templates/  + _memory/learnings.md');

fs.writeFileSync(path.join(vaultRoot, 'config.md'), substitute(fs.readFileSync(path.join(VAULT_TEMPLATE_DIR, 'config.example.md'), 'utf8'), vars));
console.log('  + config.md (your profile)');

if (ans.examples) {
  const exDir = path.join(VAULT_TEMPLATE_DIR, 'examples');
  const written = [];
  if (fs.existsSync(path.join(vaultRoot, '01-people'))) { copyFile(path.join(exDir, 'EXAMPLE-person-sam-rivers.md'), path.join(vaultRoot, '01-people', 'EXAMPLE-person-sam-rivers.md')); written.push('01-people/EXAMPLE-person-sam-rivers.md'); }
  if (fs.existsSync(path.join(vaultRoot, '03-initiatives'))) { copyFile(path.join(exDir, 'EXAMPLE-initiative-sample.md'), path.join(vaultRoot, '03-initiatives', 'EXAMPLE-initiative-sample.md')); written.push('03-initiatives/EXAMPLE-initiative-sample.md'); }
  // Cleanup marker — the always-on rules reminder + `cortex cleanup-examples` read this.
  ensureDir(path.join(vaultRoot, '_memory'));
  fs.writeFileSync(path.join(vaultRoot, '_memory', 'examples.json'), JSON.stringify({ createdAt: today(), snoozeUntil: null, files: written }, null, 2));
  console.log('  + examples (EXAMPLE-*) — cleanup reminder set for ~1 week');
}

const cortexDir = path.join(os.homedir(), '.cortex');
ensureDir(cortexDir);
fs.writeFileSync(path.join(cortexDir, 'cortex.config.json'), JSON.stringify({
  role: ans.role, vaultRoot, owner: vars.OWNER, team: vars.TEAM, jiraKey: vars.JIRA_PROJECT_KEY, createdAt: new Date().toISOString(),
}, null, 2));
console.log('  + ~/.cortex/cortex.config.json');

const missingIdentity = [vars.OWNER, vars.TEAM].some((v) => String(v).startsWith('<'));
console.log(`\n✅ Vault ready (${p.title}).${missingIdentity ? '\n   (Fill in name/team in config.md — they were left as placeholders.)' : ''}`);

// Optional chained steps — only when interactive. `--no-chain` skips them
// entirely (used by `cortex setup`, which drives the credential + install flow
// itself and doesn't want create-cortex prompting on top of it).
if (interactive && !flags['no-chain']) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const yes = async (q) => ['y', 'yes'].includes((await rl.question(`${q} [y/N]: `)).trim().toLowerCase());
  if (await yes('\nConnect Jira/Confluence now?')) spawnSync('node', [CLI, 'setup-atlassian'], { stdio: 'inherit' });
  const tool = (await rl.question(`Wire into a tool now? (${adapterNames().join('/')}, or Enter to skip): `)).trim();
  rl.close();
  if (tool) spawnSync('node', [CLI, 'install', tool, '--apply'], { stdio: 'inherit' });
  console.log('\nDone. Run `node bin/cortex.mjs doctor` to check, or `install <tool>` for more tools.');
} else if (!flags['no-chain']) {
  console.log(`\nNext:\n  node bin/cortex.mjs setup-atlassian            # optional: Jira/Confluence creds\n  node bin/cortex.mjs install copilot --apply    # VS Code + CLI + IntelliJ\n  node bin/cortex.mjs doctor\n`);
}
