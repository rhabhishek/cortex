# Routing examples - optional reference

Consult only for an unresolved routing question. The Cortex agent owns the routing matrix and confidence check; shared conventions own intent, permissions, and the task packet.

- "What should I focus on today?" -> `task-manager`; "How is the sprint tracking?" -> `sprint-ops`; "Where are the quarter's epics?" -> `planning-portfolio`.
- "Prep me for my 1:1" -> `one-on-one`; "Prep the architecture meeting" -> `meeting-prep`, which assembles the meeting wrapper from domain evidence.
- A person's name alone does not select `one-on-one`. A story assigned to a teammate is sprint status; their growth, morale, or feedback belongs to `one-on-one`.
- "Task" alone does not select `task-manager`. Personal cross-domain priorities belong there; a Jira story belongs to the sprint or planning owner.
- "Is this POC on track?" -> `initiative-tracker`; a formal epic's scope and quarterly dependencies -> `planning-portfolio`.
- "Draft a delivery brief" -> gather fresh facts from the appropriate owner, then `content-strategist` packages them. A drafting request does not authorize publication.
- "How is my team doing?" can mean people/growth or delivery/capacity. If existing context does not resolve that difference, ask one discriminating question before dispatch.
- "Explain the decision you just gave me" -> answer directly from the supplied evidence if no new domain judgment or live status is needed. Do not repeat a briefing or reload the vault.
- "Plan this code change, no edits" -> top-level Forge with Intent: advice and the unchanged restrictions, if its installed version supports that path. Actual implementation is a separate authorization.
- "Continue" inherits the active task and constraints. Neither prompt length nor a coaching signal changes the route or permits additional effects.