# Story Quality Rubric

Use this rubric when reviewing, refining, or drafting stories. A story is ready only when every applicable requirement below is satisfied with verified information.

## Core principles

- Use dedicated fields or clearly labeled sections for acceptance criteria, links, dependencies, non-functional requirements, and Out of Scope. Do not overload the description with information that belongs elsewhere.
- Keep the description concise: state the user or system need, relevant context, and intended outcome without repeating other fields.
- Include verified facts only. Record unknowns as questions or gaps; do not add assumptions or speculative implementation guidance.
- Keep key source, API, and design links prominent near the start of the story so reviewers can validate the requirements quickly.
- Include dependencies and non-functional requirements only when applicable.
- Follow the team's configured estimation method when an estimate is required. This rubric does not prescribe an estimation scale.

## Field rubric

### Summary

- Names the outcome in clear, specific language.
- Is understandable without internal shorthand.

### Key links

- Links the authoritative source material that applies, including API contracts or design artifacts when relevant.
- Labels each link by purpose instead of placing an unexplained list in the description.

### Description

- Briefly explains who or what needs the change, why it matters, and the expected outcome.
- Contains no acceptance criteria, dependency tracking, or unsupported solution details that belong in dedicated fields.

### Acceptance criteria

- Each criterion is independently testable and describes observable behavior or outcomes.
- UI and user behavior use Gherkin scenarios with `Given`, `When`, and `Then`. Keep each scenario focused on one behavior.
- Backend and infrastructure work uses testable bullets that state inputs or preconditions, the action or event, and the observable result, including failure behavior where applicable.
- Criteria cover relevant boundaries and error states without prescribing an unverified implementation.

### Dependencies

- Include dependencies only when applicable.
- Identify the dependency, its current state, and its effect on readiness or delivery in the dedicated dependency field.

### Non-functional requirements

- Include non-functional requirements only when applicable and make them measurable or otherwise verifiable.
- Use the dedicated field for relevant accessibility, performance, reliability, security, privacy, compliance, or operational constraints.

### Out of Scope

- Include Out of Scope only when another item explicitly owns that work.
- Name or link the owning item and describe the boundary between the two items. Do not use Out of Scope as a general list of ideas deferred without ownership.

## Readiness decision

Mark the story ready only when applicable dedicated fields are complete, claims are verified, links are accessible, and acceptance criteria can be tested independently. Mark non-applicable conditional fields as not applicable rather than inventing content. Report missing or conflicting information as concrete gaps.
