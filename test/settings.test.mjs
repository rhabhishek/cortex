import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { readSettings, setVscodeSettings, vscodeUserSettings } from '../lib/settings.mjs';

function tmpFile(contents) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-set-'));
  const p = path.join(dir, 'settings.json');
  if (contents !== undefined) fs.writeFileSync(p, contents);
  return p;
}

test('readSettings: absent file yields empty doc', () => {
  assert.deepEqual(readSettings(tmpFile()).doc, {});
});

test('readSettings: comments / invalid JSON report an error, not a throw', () => {
  assert.ok(readSettings(tmpFile('{ // a comment\n}')).error);
});

test('readSettings: parseable-but-non-object is rejected (no clobber, no throw)', () => {
  assert.ok(readSettings(tmpFile('"just a string"')).error);
  assert.ok(readSettings(tmpFile('[1,2,3]')).error);
});

test('setVscodeSettings: sets a key under a temp home and is idempotent', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-home-'));
  const first = setVscodeSettings(home, { 'a.b': true }, { apply: true });
  assert.deepEqual(first.changed, ['a.b']);
  const doc = JSON.parse(fs.readFileSync(vscodeUserSettings(home), 'utf8'));
  assert.equal(doc['a.b'], true);

  const second = setVscodeSettings(home, { 'a.b': true }, { apply: true });
  assert.deepEqual(second.changed, []);
  assert.deepEqual(second.unchanged, ['a.b']);
});
