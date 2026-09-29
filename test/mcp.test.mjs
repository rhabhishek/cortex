import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { mergeMcp, loadMcpCatalog } from '../lib/mcp.mjs';

const ATL = 'atlassian';
const GH = 'io.github.github/github-mcp-server';

function tmpJson(initial) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cortex-mcp-'));
  const p = path.join(dir, 'mcp.json');
  if (initial !== undefined) fs.writeFileSync(p, typeof initial === 'string' ? initial : JSON.stringify(initial));
  return p;
}

test('catalog has the expected cortex servers', () => {
  const cat = loadMcpCatalog();
  assert.ok(cat[ATL] && cat[GH], 'atlassian + github servers present in catalog');
});

test('mergeMcp: adds selected, tags _source, preserves other keys', () => {
  const p = tmpJson({ inputs: [{ id: 'x' }], servers: {} });
  const r = mergeMcp(p, [ATL], { apply: true });
  assert.deepEqual(r.added, [ATL]);
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.equal(doc.servers[ATL]._source, 'cortex');
  assert.deepEqual(doc.inputs, [{ id: 'x' }], 'non-server keys preserved');
});

test('mergeMcp: removes cortex-owned servers no longer selected (empty selection cleans up)', () => {
  const p = tmpJson({ servers: { [ATL]: { _source: 'cortex', type: 'http' } } });
  const r = mergeMcp(p, [], { apply: true });
  assert.deepEqual(r.removed, [ATL]);
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.ok(!doc.servers[ATL]);
});

test('mergeMcp: never touches user-owned servers', () => {
  const p = tmpJson({ servers: { mine: { type: 'http', url: 'x' } } });
  const r = mergeMcp(p, [ATL], { apply: true });
  assert.deepEqual(r.removed, [], 'user server not removed');
  const doc = JSON.parse(fs.readFileSync(p, 'utf8'));
  assert.ok(doc.servers.mine, 'user server preserved');
  assert.ok(doc.servers[ATL], 'cortex server added alongside');
});

test('mergeMcp: invalid JSON is reported, not overwritten', () => {
  const p = tmpJson('{ not valid json');
  const r = mergeMcp(p, [ATL], { apply: true });
  assert.ok(r.error);
  assert.equal(fs.readFileSync(p, 'utf8'), '{ not valid json', 'file left untouched');
});
