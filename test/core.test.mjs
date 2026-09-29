import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, substitute, unresolved } from '../lib/core.mjs';

test('parseFrontmatter: parses scalars, quoted strings, and lists', () => {
  const { data, body } = parseFrontmatter(
    '---\nname: cortex\ndescription: "Routes to specialists"\ndelegates: [a, b, c]\nempty: []\n---\nbody text\n',
  );
  assert.equal(data.name, 'cortex');
  assert.equal(data.description, 'Routes to specialists');
  assert.deepEqual(data.delegates, ['a', 'b', 'c']);
  assert.deepEqual(data.empty, []);
  assert.equal(body, 'body text\n');
});

test('parseFrontmatter: no frontmatter returns whole text as body', () => {
  const { data, body } = parseFrontmatter('# just markdown\n');
  assert.deepEqual(data, {});
  assert.equal(body, '# just markdown\n');
});

test('substitute: replaces known UPPER_CASE vars, leaves unknown + lowercase intact', () => {
  const out = substitute('{{VAULT_ROOT}}/x {{UNKNOWN}} {{name}}', { VAULT_ROOT: '/v' });
  assert.equal(out, '/v/x {{UNKNOWN}} {{name}}');
});

test('unresolved: reports only remaining UPPER_CASE placeholders, deduped', () => {
  assert.deepEqual(unresolved('{{A}} {{A}} {{B}} {{lower}}').sort(), ['A', 'B']);
  assert.deepEqual(unresolved('nothing here'), []);
});
