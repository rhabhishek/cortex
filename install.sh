#!/usr/bin/env bash
# Cortex installer for a brand-new machine.
#
#   git clone <repo> && cd cortex && ./install.sh
#
# This script's only job is to guarantee Node.js >= 18, then hand off to the
# real wizard: `node bin/cortex.mjs setup`, which scaffolds your vault, captures
# + stores credentials (macOS Keychain, else ~/.cortex/*.env), installs the
# Copilot adapter with all built-in tools enabled, wires MCP servers, and runs
# doctor. Everything interactive lives in the wizard so it stays cross-platform.
#
# Safe + idempotent — re-run anytime.

set -euo pipefail
if [ -z "${BASH_VERSION:-}" ]; then exec bash "$0" "$@"; fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"
MIN_NODE_MAJOR=18

node_major() { local v; v="$(node -v 2>/dev/null | sed -E 's/^v([0-9]+).*/\1/')"; echo "${v:-0}"; }

install_node_via_nvm() {
  export NVM_DIR="$HOME/.nvm"
  if [ ! -s "$NVM_DIR/nvm.sh" ]; then
    echo "Installing nvm..."
    curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
  fi
  # shellcheck disable=SC1091
  . "$NVM_DIR/nvm.sh"
  nvm install --lts
  nvm use --lts
}

ensure_node() {
  if command -v node >/dev/null 2>&1 && [ "$(node_major)" -ge "$MIN_NODE_MAJOR" ]; then
    echo "✓ Node $(node -v)"
    return
  fi
  echo "Node >= $MIN_NODE_MAJOR not found — installing..."
  case "$(uname -s)" in
    Darwin)
      if command -v brew >/dev/null 2>&1; then brew install node; else install_node_via_nvm; fi ;;
    Linux)
      if command -v apt-get >/dev/null 2>&1; then
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt-get install -y nodejs
      elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y nodejs
      else install_node_via_nvm; fi ;;
    *)
      echo "Unsupported OS. Install Node >= $MIN_NODE_MAJOR manually: https://nodejs.org/" >&2; exit 1 ;;
  esac
  if ! command -v node >/dev/null 2>&1 || [ "$(node_major)" -lt "$MIN_NODE_MAJOR" ]; then
    echo "Node install did not succeed. Install Node >= $MIN_NODE_MAJOR manually: https://nodejs.org/" >&2; exit 1
  fi
  echo "✓ Node $(node -v)"
}

ensure_node
exec node bin/cortex.mjs setup "$@"
