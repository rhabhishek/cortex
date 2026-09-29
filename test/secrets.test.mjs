import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { writeManagedBlock } from '../lib/secrets.mjs';

const BEGIN = '# >>> cortex (managed) >>>';

function tmpProfile() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-prof-'));
  return path.join(dir, '.zshrc');
}
const count = (s, sub) => s.split(sub).length - 1;

// Regression for A1: the managed-block marker contains regex metacharacters
// "(managed)". A naive `new RegExp(marker)` never matched the real block, so
// each run appended a duplicate. writeManagedBlock must be idempotent.
test('writeManagedBlock: re-running replaces in place (exactly one block)', () => {
  const p = tmpProfile();
  fs.writeFileSync(p, '# existing user content\nexport FOO=1\n');

  writeManagedBlock(p, 'export A="1"');
  writeManagedBlock(p, 'export A="2"');
  writeManagedBlock(p, 'export A="3"');

  const out = fs.readFileSync(p, 'utf8');
  assert.equal(count(out, BEGIN), 1, 'should be exactly one managed block');
  assert.match(out, /export A="3"/, 'block should hold the latest body');
  assert.doesNotMatch(out, /export A="1"/, 'old body should be replaced');
  assert.match(out, /# existing user content/, 'user content preserved');
});

test('writeManagedBlock: creates the block when none exists', () => {
  const p = tmpProfile();
  writeManagedBlock(p, 'export A="1"');
  const out = fs.readFileSync(p, 'utf8');
  assert.equal(count(out, BEGIN), 1);
});
