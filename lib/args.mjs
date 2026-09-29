// Cortex argv parser — dependency-free. Shared by the CLIs.
// Returns { _, flags }: positionals in `_`, `--key value` / `--flag` in `flags`.
// `-y` is treated as a shorthand for `--yes`.

// Flags that never take a value. Without this, `install --hide-specialists copilot`
// would swallow `copilot` as the flag's value instead of treating it as a
// positional. Known booleans still accept an explicit `--flag true|false`.
const BOOLEAN_FLAGS = new Set([
  'apply', 'all', 'hide-specialists', 'reset-tools', 'no-validate', 'print', 'force', 'yes',
  'examples', 'no-examples', 'no-chain', 'help', 'confluence-same',
]);

export function parseArgs(argv) {
  const args = { _: [], flags: {} };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (BOOLEAN_FLAGS.has(key)) {
        // Allow an explicit boolean value (`--apply false`); otherwise it's true.
        if (next === 'true' || next === 'false') { args.flags[key] = next === 'true'; i++; }
        else args.flags[key] = true;
      } else if (next !== undefined && !next.startsWith('--')) {
        args.flags[key] = next; i++;
      } else {
        args.flags[key] = true;
      }
    } else if (a === '-y') {
      args.flags.yes = true;
    } else {
      args._.push(a);
    }
  }
  return args;
}
