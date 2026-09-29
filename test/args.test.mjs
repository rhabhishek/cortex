import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseArgs } from '../lib/args.mjs';

test('parseArgs: boolean flag does not swallow a following positional', () => {
  const { _, flags } = parseArgs(['install', '--hide-specialists', 'copilot', '--apply']);
  assert.deepEqual(_, ['install', 'copilot']);
  assert.equal(flags['hide-specialists'], true);
  assert.equal(flags.apply, true);
});

test('parseArgs: explicit --flag false is respected for known booleans', () => {
  const { flags } = parseArgs(['install', '--hide-specialists', 'false']);
  assert.equal(flags['hide-specialists'], false);
});

test('parseArgs: value flags still consume their value', () => {
  const { _, flags } = parseArgs(['install', 'copilot', '--home', '/tmp/x', '--role', 'anchor']);
  assert.deepEqual(_, ['install', 'copilot']);
  assert.equal(flags.home, '/tmp/x');
  assert.equal(flags.role, 'anchor');
});

test('parseArgs: -y maps to yes', () => {
  assert.equal(parseArgs(['-y']).flags.yes, true);
});
