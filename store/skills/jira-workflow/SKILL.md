---
name: jira-workflow
description: "Connect to Jira and run queries/operations. Host Atlassian MCP first; REST (account-scoped API token) is the universal fallback. Handles single- or split-instance Atlassian setups."
capabilities: [jira]
profiles: [anchor, people-manager, engineering-manager, product-manager]
---

# Skill: Jira Workflow

> Cortex never caches Jira data in the vault — query live every time (see `_shared/vault-context.md`). For Confluence, use the `confluence` skill — see "Single vs split instance" below.

## Credentials

Cortex reads these from your environment. They're set up once by `cortex setup`
into **secure storage** and loaded by your shell profile: macOS Keychain,
Windows DPAPI (per-user encrypted), else `~/.cortex/*.env` (chmod 600). The Jira
MCP server (Atlassian Rovo) signs in via OAuth and needs no env; these are for
the REST fallback below.

```
ATLASSIAN_EMAIL        # your atlassian account email
ATLASSIAN_API_TOKEN    # https://id.atlassian.com/manage-profile/security/api-tokens
JIRA_URL               # e.g. https://your-org.atlassian.net
JIRA_PROJECT_KEY       # {{JIRA_PROJECT_KEY}}
HTTPS_PROXY            # optional — only if you're behind a corporate proxy
```

> **Atlassian API tokens are account-scoped, not site-scoped** — the *same* token works on every Atlassian site your account can reach. This is what makes split Jira/Confluence instances work with one credential. **Never print the token**; build the auth header inline.

## Connection strategy (stop at the first that works)

1. **Host Atlassian MCP (preferred).** If your tool exposes Atlassian/Jira MCP tools (e.g. `searchJiraIssuesUsingJql`, `getJiraIssue`, `transitionJiraIssue`), use them — no auth setup needed. Note an MCP OAuth grant is usually **single-site**, so it covers one Atlassian site.
2. **REST via curl (universal fallback).** Works for any site your account can reach:

```bash
# base64 | tr -d '\n' — GNU base64 wraps at 76 chars, and Atlassian tokens are
# long enough to wrap, which would break the Authorization header on Linux.
AUTH=$(printf '%s:%s' "$ATLASSIAN_EMAIL" "$ATLASSIAN_API_TOKEN" | base64 | tr -d '\n')
jira_get() { curl -s --max-time 30 ${HTTPS_PROXY:+--proxy "$HTTPS_PROXY"} \
  -H "Authorization: Basic $AUTH" -H "Accept: application/json" "$@"; }

# verify
jira_get "$JIRA_URL/rest/api/3/myself" | jq .displayName
```

## Single vs split instance

- **Single instance (most teams):** Jira and Confluence live on the same site — set `JIRA_URL` and `CONFLUENCE_URL` to the same base (`https://your-org.atlassian.net`). MCP, if granted, covers both.
- **Split instance (some orgs):** Jira and Confluence are on *different* sites (e.g. `https://x-eng.atlassian.net` for Jira, `https://x.atlassian.net` for Confluence). The account-scoped token reaches both over REST; the MCP grant reaches only whichever site it was authorized for. Routing rule: **Jira → this skill / Jira MCP; Confluence → the `confluence` skill.** Never expect a single MCP grant to read both sites.

## JQL library (substitute the project key)

```jql
# Current sprint, my work
project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() AND assignee = currentUser() ORDER BY rank ASC
# Active blockers
project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() AND (flagged = Impediment OR labels = "blocked")
# Stuck > 3 days
project = {{JIRA_PROJECT_KEY}} AND sprint in openSprints() AND statusCategory != Done AND updated <= -3d
# Velocity (last closed sprints)
project = {{JIRA_PROJECT_KEY}} AND sprint in closedSprints() AND status = Done ORDER BY sprint DESC
# Active epics
project = {{JIRA_PROJECT_KEY}} AND issuetype = Epic AND status NOT IN ("Done","Closed")
```

JQL encoding for curl:

```bash
ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "project = $JIRA_PROJECT_KEY AND sprint in openSprints()")
# Prefer the newer /search/jql endpoint (see endpoints note below).
jira_get "$JIRA_URL/rest/api/3/search/jql?jql=$ENC&maxResults=50&fields=summary,status,assignee" | jq '.issues[] | {key, status: .fields.status.name, assignee: .fields.assignee.displayName}'
```

## Endpoints (REST fallback)

```
GET  /rest/api/3/search/jql?jql=...&fields=summary,status,assignee&maxResults=50   # current
GET  /rest/api/3/search?jql=...                                                     # DEPRECATED — being sunset by Jira Cloud
GET  /rest/api/3/issue/{KEY}
GET  /rest/api/3/issue/{KEY}/transitions
POST /rest/api/3/issue/{KEY}/transitions     {"transition":{"id":"{id}"}}
POST /rest/api/3/issue/{KEY}/comment
GET  /rest/agile/1.0/board?projectKeyOrId={{JIRA_PROJECT_KEY}}
GET  /rest/agile/1.0/board/{boardId}/sprint?state=closed                            # per-sprint velocity
GET  /rest/agile/1.0/sprint/{sprintId}/issue?jql=...&fields=...
```

> Jira Cloud is sunsetting `GET /rest/api/3/search` in favor of `GET /rest/api/3/search/jql`. Use `/search/jql` first; fall back to `/search` only against older/Server instances.

## Rules

- Read-first. Any **write** (transition, scope change, comment, create) requires explicit user confirmation (bounded autonomy).
- Idempotent — re-running a query is free; never double-apply a transition.
- Always surface links: `$JIRA_URL/browse/<KEY>`.

## Errors

| Symptom | Cause | Fix |
| ------- | ----- | --- |
| 401 | Bad/expired token | Regenerate at id.atlassian.com → API tokens; re-run `cortex setup-atlassian` |
| 404 | Wrong key or wrong site | Confirm `JIRA_URL` + `JIRA_PROJECT_KEY` (split instance? see above) |
| timeout / HTTP 000 | Proxy not set / off-network | Set `HTTPS_PROXY`; or retry without `--proxy` |
| No MCP tool | MCP not connected this session | Fall through to REST |
