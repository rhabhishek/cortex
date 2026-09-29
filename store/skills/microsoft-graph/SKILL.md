---
name: microsoft-graph
description: "Use when: writing ANY script or code that touches email, SharePoint, OneDrive, Teams, or any Microsoft 365 data. Always load this skill when the user mentions reading email, sending email, downloading a SharePoint file, reading a SharePoint list, accessing OneDrive, or integrating with any Microsoft/Office 365 service — even if they don't explicitly mention 'Graph API' or 'MSAL'."
---

# Microsoft Graph Skill

## Auth — always start here

Requires an Azure AD app registration (public client, delegated permissions).
Read the app ID and tenant ID from the environment - never hardcode them:

```
MSGRAPH_APP_ID       # Azure AD application (client) ID
MSGRAPH_TENANT_ID    # Azure AD directory (tenant) ID
MSGRAPH_DOMAIN_HINT  # optional - your org's login domain, e.g. yourcompany.com
```

```python
# requirements: msal, msal-extensions, Office365-REST-Python-Client
import os
from pathlib import Path
import msal, requests
from msal_extensions import FilePersistence, PersistedTokenCache
from office365.graph_client import GraphClient

GRAPH_URL = "https://graph.microsoft.com/v1.0"

def get_token(scopes: list[str]) -> str:
    app_id = os.environ["MSGRAPH_APP_ID"]
    tenant_id = os.environ["MSGRAPH_TENANT_ID"]
    cache = PersistedTokenCache(FilePersistence(str(Path.home() / ".config/msal/msal_token_cache.bin")))
    app   = msal.PublicClientApplication(
        app_id,
        authority=f"https://login.microsoftonline.com/{tenant_id}",
        token_cache=cache, instance_discovery=False,
    )
    accounts = app.get_accounts()
    result   = app.acquire_token_silent(scopes, accounts[0]) if accounts else None
    if not result:
        domain_hint = os.environ.get("MSGRAPH_DOMAIN_HINT")
        result = app.acquire_token_interactive(scopes, domain_hint=domain_hint)
    return result["access_token"]
```

Scope must exactly match what's consented on the app. Typical consented scopes:
`Mail.ReadWrite` · `Mail.Send` · `Files.ReadWrite.All` · `Sites.ReadWrite.All` · `User.Read`

---

## Read Email (Office365-REST-Python-Client)

```python
token  = get_token(["https://graph.microsoft.com/Mail.ReadWrite"])
client = GraphClient(lambda: {"accessToken": token})
msgs   = client.me.messages.top(5).order_by("receivedDateTime desc").get().execute_query()
for msg in msgs:
    print(msg.subject, msg.received_datetime, msg.body_preview)
    print(msg.properties["from"].emailAddress.address)  # 'from' is a keyword
```

---

## Send Email (raw requests)

```python
token = get_token(["https://graph.microsoft.com/Mail.Send"])
requests.post(f"{GRAPH_URL}/me/sendMail",
    headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
    json={"message": {
        "subject": "Hello",
        "body": {"contentType": "Text", "content": "Message body"},
        "toRecipients": [{"emailAddress": {"address": "someone@example.com"}}],
    }},
    timeout=15,
).raise_for_status()
```

---

## Download a SharePoint File (raw requests)

```python
token   = get_token(["https://graph.microsoft.com/Files.ReadWrite.All"])
headers = {"Authorization": f"Bearer {token}"}

sharepoint_tenant = os.environ["MSGRAPH_SHAREPOINT_TENANT"]  # e.g. yourtenant.sharepoint.com
site_id  = requests.get(f"{GRAPH_URL}/sites/{sharepoint_tenant}:/sites/MySite", headers=headers, timeout=15).json()["id"]
drives   = requests.get(f"{GRAPH_URL}/sites/{site_id}/drives", headers=headers, timeout=15).json()["value"]
drive_id = next(d["id"] for d in drives if d["name"] == "My Library Name")  # match by name, not type

# Path is relative to drive root — do NOT prefix with the library name
item    = requests.get(f"{GRAPH_URL}/drives/{drive_id}/root:/Folder/file.docx", headers=headers, timeout=15).json()
content = requests.get(item["@microsoft.graph.downloadUrl"], timeout=30).content
Path("file.docx").write_bytes(content)
```

---

## Read a SharePoint List (raw requests)

```python
token   = get_token(["https://graph.microsoft.com/Sites.ReadWrite.All"])
headers = {"Authorization": f"Bearer {token}"}

sharepoint_tenant = os.environ["MSGRAPH_SHAREPOINT_TENANT"]
site_id = requests.get(f"{GRAPH_URL}/sites/{sharepoint_tenant}:/sites/MySite", headers=headers, timeout=15).json()["id"]

# Use list GUID — name lookup with spaces is unreliable. Find GUIDs via:
# GET /sites/{site_id}/lists?$select=id,name,displayName
items = requests.get(f"{GRAPH_URL}/sites/{site_id}/lists/{list-guid}/items",
    headers=headers, params={"$expand": "fields", "$top": 999}, timeout=15,
).json()["value"]
for item in items:
    print(item["fields"])
```

> `$count` is not supported on list items — paginate via `@odata.nextLink` to count all items.

---

**Graph API reference:** https://learn.microsoft.com/en-us/graph/use-the-api
