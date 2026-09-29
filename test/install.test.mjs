import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  LEAK_PATTERNS,
  adapterNames,
  planInstall,
  resolveVars,
  writeFileSafe,
  toolBase,
} from '../lib/core.mjs';

function tmpHome() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-home-'));
}

test('planInstall: produces copilot actions with substituted vars and no router agents list leakage', () => {
  const home = tmpHome();
  const vars = resolveVars({ role: 'product-manager', vaultRoot: '/tmp/v', jiraKey: 'PROJ' });
  const { base, actions } = planInstall('copilot', { home, vars });

  assert.equal(base, toolBase('copilot', home));
  assert.ok(actions.length > 0);

  const rules = actions.find((a) => a.path.endsWith('cortex.instructions.md'));
  assert.ok(rules, 'rules file is planned');
  assert.doesNotMatch(rules.content, /\{\{[A-Z_]+\}\}/, 'no UPPER_CASE placeholders left in rules');

  const cortexAgent = actions.find((a) => a.path.endsWith('agents/cortex.agent.md'));
  assert.match(cortexAgent.content, /agent\/runSubagent/, 'router gets the subagent toolset');
});

test('planInstall: preserves a host-managed copilot tools line across reinstall; --reset-tools regenerates it', () => {
  const home = tmpHome();
  const vars = resolveVars({ role: 'anchor', vaultRoot: '/tmp/v', jiraKey: 'PROJ' });

  // First install writes the default tools line.
  const first = planInstall('copilot', { home, vars });
  const cortexAct = first.actions.find((a) => a.path.endsWith('agents/cortex.agent.md'));
  for (const a of first.actions) writeFileSafe(a.path, a.content, { apply: true });

  // Simulate VS Code re-serializing the file with its own (namespaced) tools.
  const edited = cortexAct.content.replace(/^tools:.*$/m, 'tools: [read/readFile, agent/runSubagent, atlassian/searchJiraIssuesUsingJql]');
  writeFileSafe(cortexAct.path, edited, { apply: true });

  // Reinstall must keep the host-managed tools line verbatim.
  const second = planInstall('copilot', { home, vars });
  const preserved = second.actions.find((a) => a.path.endsWith('agents/cortex.agent.md'));
  assert.match(preserved.content, /^tools: \[read\/readFile, agent\/runSubagent, atlassian\/searchJiraIssuesUsingJql\]$/m,
    'reinstall preserves the host-managed tools line');

  // --reset-tools restores the template default set.
  const reset = planInstall('copilot', { home, vars, resetTools: true });
  const regenerated = reset.actions.find((a) => a.path.endsWith('agents/cortex.agent.md'));
  assert.doesNotMatch(regenerated.content, /atlassian\/searchJiraIssuesUsingJql\]$/m, 'reset drops the user-edited line');
  assert.match(regenerated.content, /agent\/runSubagent/, 'reset re-adds the default subagent toolset');
});

test('planInstall: CORTEX_HOME resolves to the tool base in copied content', () => {
  const home = tmpHome();
  const vars = resolveVars({ role: 'anchor', vaultRoot: '/tmp/v', jiraKey: 'PROJ' });
  const { base, actions } = planInstall('copilot', { home, vars });
  const withHome = actions.filter((a) => a.content.includes(base));
  assert.ok(withHome.length > 0, 'at least one file references the resolved CORTEX_HOME');
});

test('planInstall: renders and references a sanitized story-quality rubric for every adapter', () => {
  const vars = resolveVars({ role: 'anchor', vaultRoot: '/tmp/v', jiraKey: 'PROJ' });

  for (const tool of adapterNames()) {
    const home = tmpHome();
    const { base, actions } = planInstall(tool, { home, vars });
    const rubricPath = path.join(base, 'knowledge', 'story-quality.md');
    const rubric = actions.find((action) => action.path === rubricPath);
    const reviewPrompt = actions.find((action) => action.path.includes('review-stories'));
    const planningAgent = actions.find((action) => action.path.includes('planning-portfolio'));

    assert.ok(rubric, `${tool} renders the story-quality rubric`);
    assert.ok(reviewPrompt, `${tool} renders the review-stories prompt`);
    assert.ok(planningAgent, `${tool} renders the planning-portfolio agent`);
    assert.match(reviewPrompt.content, new RegExp(rubricPath), `${tool} prompt references the rubric`);
    assert.match(planningAgent.content, new RegExp(rubricPath), `${tool} agent references the rubric`);

    assert.match(rubric.content, /dedicated fields/i);
    assert.match(rubric.content, /concise/i);
    assert.match(rubric.content, /verified facts/i);
    assert.match(rubric.content, /source, API, and design links/i);
    assert.match(rubric.content, /independently testable/i);
    assert.match(rubric.content, /Gherkin/i);
    assert.match(rubric.content, /backend and infrastructure/i);
    assert.match(rubric.content, /dependencies and non-functional requirements.*when applicable/is);
    assert.match(rubric.content, /Out of Scope.*explicitly owns/is);

    for (const { name, re } of LEAK_PATTERNS) {
      assert.doesNotMatch(rubric.content, re, `${tool} rubric has no ${name}`);
    }
    assert.doesNotMatch(rubric.content, /customfield_\d+/i, `${tool} rubric has no field IDs`);
    assert.doesNotMatch(rubric.content, /\b[A-Z]{2,}-\d+\b/, `${tool} rubric has no issue keys`);
    assert.doesNotMatch(rubric.content, /(?:\/Users\/|\/home\/|[A-Z]:\\Users\\)/i, `${tool} rubric has no internal paths`);
    assert.doesNotMatch(rubric.content, /(?:fixed|standard) (?:story )?point scale|(?:fibonacci|powers? of two) scale/i,
      `${tool} rubric has no fixed estimation scale`);
  }
});

test('writeFileSafe: idempotent + backs up a changed pre-existing file once', () => {
  const dir = tmpHome();
  const f = path.join(dir, 'sub', 'file.md');

  assert.equal(writeFileSafe(f, 'v1', { apply: true }), 'written');
  assert.equal(writeFileSafe(f, 'v1', { apply: true }), 'unchanged');
  assert.ok(!fs.existsSync(f + '.cortex-bak'), 'no backup when unchanged');

  assert.equal(writeFileSafe(f, 'v2', { apply: true }), 'written');
  assert.equal(fs.readFileSync(f + '.cortex-bak', 'utf8'), 'v1', 'backup holds the original');

  // Second change must not clobber the original backup.
  writeFileSafe(f, 'v3', { apply: true });
  assert.equal(fs.readFileSync(f + '.cortex-bak', 'utf8'), 'v1', 'backup is taken only once');
});

test('writeFileSafe: dry-run writes nothing', () => {
  const dir = tmpHome();
  const f = path.join(dir, 'file.md');
  assert.equal(writeFileSafe(f, 'x', { apply: false }), 'would-write');
  assert.ok(!fs.existsSync(f));
});
