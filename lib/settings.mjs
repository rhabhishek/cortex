// Cortex VS Code settings.json helpers — dependency-free. Used to enable the
// experimental setting that lets the router reach hidden subagents, and (later)
// recommended agent settings. We only ever set specific keys and never clobber a
// file we can't parse (settings.json may be JSONC with comments).

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ensureDir } from './core.mjs';

// Per-OS VS Code User settings.json (mirrors mcp.mjs's vscodeUserMcp resolution).
export function vscodeUserSettings(home = os.homedir()) {
  if (process.platform === 'darwin') return path.join(home, 'Library', 'Application Support', 'Code', 'User', 'settings.json');
  if (process.platform === 'win32') return path.join(process.env.APPDATA || path.join(home, 'AppData', 'Roaming'), 'Code', 'User', 'settings.json');
  return path.join(home, '.config', 'Code', 'User', 'settings.json');
}

// Read settings.json tolerantly. Returns { doc } on success, { error } if the
// file exists but can't be parsed (e.g. it contains comments), or { doc: {} }
// when absent.
export function readSettings(p) {
  if (!fs.existsSync(p)) return { doc: {} };
  const raw = fs.readFileSync(p, 'utf8');
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return { error: 'not valid JSON (comments?)' }; }
  // settings.json must be a JSON object; refuse to clobber anything else.
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { error: 'not a JSON object' };
  return { doc: parsed };
}

// Set the given key/values in VS Code settings.json. Only writes if a value
// actually changes. Returns { changed[], unchanged[], path } or { error }.
export function setVscodeSettings(home, kv, { apply = false } = {}) {
  const p = vscodeUserSettings(home);
  const { doc, error } = readSettings(p);
  if (error) return { error: `${p} ${error} — left untouched`, path: p };
  const changed = [], unchanged = [];
  for (const [k, v] of Object.entries(kv)) {
    if (doc[k] === v) { unchanged.push(k); continue; }
    doc[k] = v; changed.push(k);
  }
  if (apply && changed.length) {
    ensureDir(path.dirname(p));
    fs.writeFileSync(p, JSON.stringify(doc, null, 2) + '\n');
  }
  return { changed, unchanged, path: p };
}

// Read a single setting's current value (undefined if absent / unparseable).
export function getVscodeSetting(home, key) {
  const { doc } = readSettings(vscodeUserSettings(home));
  return doc ? doc[key] : undefined;
}

export const SUBAGENT_SETTING = 'chat.customAgentInSubagent.enabled';
