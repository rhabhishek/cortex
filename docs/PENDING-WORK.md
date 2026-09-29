# Pending Work

The story-quality rubric is complete. The lifecycle work below remains intentionally separate and is not included in that delivery.

## Safe Updates

- Add an explicit, dry-run-first `update` command.
- Track managed resources with relative paths, ownership modes, and installed-content hashes.
- Preserve unrelated user prompts and knowledge files.
- Report conflicts instead of overwriting locally modified managed files.
- Remove stale managed resources only when they still match the prior installation.
- Reconcile legacy manifests conservatively and roll back partial updates.

## Backups And Restore

- Create a verified backup before every install, update, or forced restore.
- Support listing, verifying, pruning, and restoring backups.
- Restore files, modes, managed blocks, and manifests exactly to their pre-backup state.
- Remove resources that did not exist before the selected backup.
- Create a guard backup before overwriting changes made after the selected backup.
- Keep vault data, credentials, MCP configuration, and unrelated files outside restore scope.

## Hardening

- Complete and independently review publishable-content scanning, Keychain secret handling, and JSONC-safe VS Code settings updates.
- Add final cross-root mutation checks, race-safe settings replacement, and fatal UTF-8 validation.
- Keep security hardening isolated from updater and restore delivery until its review gates pass.