// Cortex MCP provisioning — merge the server catalog into each tool's MCP config.
// Dependency-free. Mirrors the ready-ai-stack model: tokens are referenced as
// ${env:VAR}, never stored inline; Cortex only ever touches entries it owns
// (tagged `_source: "cortex"`), and never overwrites a user's own server.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { STORE_DIR, ensureDir } from './core.mjs';

export const MCP_CATALOG_PATH = path.join(STORE_DIR, 'mcp', 'servers.json');

export function loadMcpCatalog() {
  if (!fs.existsSync(MCP_CATALOG_PATH)) return {};
  return JSON.parse(fs.readFileSync(MCP_CATALOG_PATH, 'utf8')).servers || {};
}

// VS Code reads user-level MCP servers from the User profile's mcp.json — NOT
// ~/.vscode/mcp.json (that's workspace-level). Resolve the per-OS User profile dir.
function vscodeUserMcp(home) {
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Code', 'User', 'mcp.json');
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Code', 'User', 'mcp.json');
  return path.join(home, '.config', 'Code', 'User', 'mcp.json');
}

// The MCP config files Cortex provisions, per tool. `home` is overridable for tests.
export function mcpTargets(home = os.homedir()) {
  return [
    { label: 'VS Code', path: vscodeUserMcp(home) },
    { label: 'Copilot CLI', path: path.join(home, '.copilot', 'mcp-config.json') },
  ];
}

// Keep `_source` (used to track ownership); drop the display-only `_*` metadata.
function stripMeta(cfg) {
  const out = {};
  for (const [k, v] of Object.entries(cfg)) {
    if (k.startsWith('_') && k !== '_source') continue;
    out[k] = v;
  }
  return out;
}

function readJson(p) {
  if (!fs.existsSync(p)) return {};
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

// Merge the selected catalog servers into one MCP config file.
// Adds Cortex-owned servers that are selected, removes Cortex-owned servers that
// aren't, and never touches servers the user added themselves. Other top-level
// keys (e.g. `inputs`) are preserved. Returns { added, skipped, removed } or { error }.
export function mergeMcp(targetPath, serverIds, { apply = false } = {}) {
  const catalog = loadMcpCatalog();
  const doc = readJson(targetPath);
  if (doc === null) return { error: `${targetPath} exists but isn't valid JSON — left untouched` };
  if (!doc.servers || typeof doc.servers !== 'object') doc.servers = {};

  const selected = new Set(serverIds.filter((id) => catalog[id]));
  const res = { added: [], skipped: [], removed: [] };

  for (const [name, cfg] of Object.entries(doc.servers)) {
    if (cfg && cfg._source === 'cortex' && !selected.has(name)) {
      delete doc.servers[name];
      res.removed.push(name);
    }
  }
  for (const id of selected) {
    const existing = doc.servers[id];
    if (existing && existing._source !== 'cortex') { res.skipped.push(id); continue; }
    doc.servers[id] = { ...stripMeta(catalog[id]), _source: 'cortex' };
    res.added.push(id);
  }

  if (apply && (res.added.length || res.removed.length)) {
    ensureDir(path.dirname(targetPath));
    fs.writeFileSync(targetPath, JSON.stringify(doc, null, 2) + '\n');
  }
  return res;
}
