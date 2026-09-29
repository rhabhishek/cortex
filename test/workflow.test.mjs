import { test } from 'node:test';
import assert from 'node:assert/strict';
import os from 'node:os';
import path from 'node:path';
import { adapterNames, planInstall, resolveVars, rulesContent } from '../lib/core.mjs';

const HOME = path.join(os.tmpdir(), 'cortex-workflow-test-home');

function rendered(tool, role = 'anchor') {
  const vars = resolveVars({ role, vaultRoot: path.join(HOME, 'vault'), jiraKey: 'PROJ' });
  return planInstall(tool, { home: HOME, vars }).actions;
}

function router(actions) {
  const agent = actions.find((action) =>
    ['agents', 'agent'].includes(path.basename(path.dirname(action.path)))
    && /^cortex(?:\.agent)?\.md$/.test(path.basename(action.path)));
  assert.ok(agent, 'cortex agent not rendered');
  return agent.content;
}

test('cortex classifies intent before loading role context for every profile and adapter', () => {
  for (const tool of adapterNames()) {
    for (const role of ['anchor', 'people-manager', 'engineering-manager', 'product-manager']) {
      const content = router(rendered(tool, role));
      const intentStart = content.indexOf('## Task intent');
      const roleStart = content.indexOf('## Role lens');
      assert.ok(intentStart >= 0 && roleStart > intentStart, `${tool}/${role}: intent before context`);
      const intent = content.slice(intentStart, roleStart);
      assert.match(intent, /answer.*advice.*delivery/);
      assert.match(intent, /respond directly when the supplied evidence is sufficient/);
      assert.match(intent, /no writes, including memory and graphs/);
      assert.match(intent, /Allowed effects/);
      assert.match(intent, /External coaching is advisory, never a gate/);
      if (tool === 'copilot') assert.match(content, /^model: Auto$/m);
      else assert.doesNotMatch(content, /^model:/m);
    }
  }
});

test('rendered handoffs preserve the shared packet and top-level Forge boundary', () => {
  for (const tool of adapterNames()) {
    const actions = rendered(tool);
    const conventions = actions.find((action) => action.path.endsWith(
      path.join('_shared', 'conventions.md')));
    assert.ok(conventions, `${tool}: shared conventions not rendered`);
    for (const field of ['Intent', 'Goal', 'Anchor', 'Constraints / non-goals',
      'Acceptance evidence', 'Allowed effects']) {
      assert.ok(conventions.content.includes(`**${field}**`), `${tool}: missing ${field}`);
    }
    const content = router(actions);
    assert.ok(content.includes(conventions.path), `${tool}: conventions link must resolve`);
    assert.match(content, /do not spawn Forge as a nested subagent/);
    assert.match(content, /A handoff cannot widen permissions/);
    assert.match(content, /lacks intent-aware handling/);
    assert.match(conventions.content, /without new evidence/);
    assert.match(conventions.content, /unchanged inputs/);
    assert.match(conventions.content, /reconcile its state before retrying/);
    assert.match(conventions.content, /Resume packet/);
    assert.match(conventions.content, /Persist a checkpoint only when allowed/);
    assert.match(conventions.content, /Coaching recommendations are advisory/);
    const vault = actions.find((action) => action.path.endsWith(
      path.join('_shared', 'vault-context.md')));
    assert.ok(vault, `${tool}: vault context not rendered`);
    assert.match(vault.content, /Answer\/advice does not authorize saves/);
    assert.match(vault.content, /query Jira \*\*live\*\*, never cache/);
  }
});

test('Cortex delegation maximizes independent parallel work without arbitrary caps', () => {
  for (const tool of adapterNames()) {
    const actions = rendered(tool);
    const conventions = actions.find((action) => action.path.endsWith(
      path.join('_shared', 'conventions.md')));
    assert.ok(conventions, `${tool}: shared conventions not rendered`);
    assert.match(conventions.content, /Concurrency-first delegation/);
    assert.match(conventions.content, /every relevant independent specialist slice in one batch/);
    assert.match(conventions.content, /independent file reads, live lookups, and evidence checks in parallel/);
    assert.match(conventions.content, /Do not impose an arbitrary specialist, tool, file, or message cap/);
    assert.match(conventions.content, /one specialist may edit several files directly within its own task/);
    assert.match(conventions.content, /Separate isolated worktrees or branches are for \*\*multiple concurrent writers\*\*/);
    assert.match(conventions.content, /disjoint files alone do not make a shared worktree safe/);
    assert.match(conventions.content, /Keep only true dependencies sequential/);
    assert.match(conventions.content, /shared-resource contention/);
    const content = router(actions);
    assert.match(content, /shared concurrency policy favors parallel independent slices/);
    assert.match(content, /Do not impose an arbitrary specialist, tool, or message cap/);
    assert.doesNotMatch(content, /Hard cap.*5 dispatches/);
    assert.match(content, /at most one re-route per sub-question/);
  }
});

test('routing examples are optional installed references and briefs inherit permissions', () => {
  for (const tool of adapterNames()) {
    const actions = rendered(tool);
    const examples = actions.find((action) => action.path.endsWith(
      path.join('_shared', 'routing-examples.md')));
    assert.ok(examples, `${tool}: routing examples not installed`);
    const content = router(actions);
    assert.ok(content.includes(examples.path), `${tool}: examples link must resolve`);
    assert.match(content, /only when needed/);
    assert.doesNotMatch(content, /### Worked examples/);
    for (const name of ['daily-brief', 'weekly-review']) {
      const prompt = actions.find((action) =>
        ['prompts', 'commands', 'command'].includes(path.basename(path.dirname(action.path)))
        && new RegExp(`^${name}(?:\\.prompt)?\\.md$`).test(path.basename(action.path)));
      assert.ok(prompt, `${tool}: ${name} not rendered`);
      assert.match(prompt.content, /task intent check/);
      assert.match(prompt.content, /Allowed effects/);
      assert.match(prompt.content, /Default to advice in the conversation/);
      assert.doesNotMatch(prompt.content, /End with "Anything to adjust\?"/);
    }
    for (const action of actions) {
      assert.doesNotMatch(action.content, /\{\{[A-Z_]+\}\}/,
        `${tool}: unresolved placeholder in ${action.path}`);
    }
  }
});

test('always-on context avoids mandatory rereads and coaching-driven gates', () => {
  const rules = rulesContent(resolveVars({ role: 'anchor', vaultRoot: '/tmp/v', jiraKey: 'PROJ' }));
  assert.match(rules, /Classify answer, advice, or delivery before tools/);
  assert.match(rules, /External coaching is advisory, never a gate/);
  assert.match(rules, /persist only when allowed/);
  assert.match(rules, /Jira facts remain live, never cached/);
  assert.doesNotMatch(rules, /Before responding, read:|clear.*freely/);
});