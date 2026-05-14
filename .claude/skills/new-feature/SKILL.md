---
name: new-feature
description: Scaffold a new feature against the established patterns — a branch, an oRPC route, a page, and a test. Use when Skylar describes a new piece of functionality ("add a way to do X") rather than tweaking existing code.
---

# Scaffold a new feature

The goal is to eliminate the "where does the file go" decision so Skylar can describe behavior and you can put it in the right place.

## Procedure

1. Restate the feature back to Skylar in plain language before writing code. If anything's ambiguous, ask one question.
2. Create a branch: `git checkout -b skylar/<short-kebab-description>`.
3. Decide which layer(s) to touch:
   - Pure UI change → `app/routes/*.tsx`, maybe a new component in `app/components/`
   - Reading or mutating data → new oRPC route in `app/server/routes/<name>.ts` + wire into `app/server/router.ts`
   - Schema change → new column or table in `drizzle/schema.ts` + `bun run db:generate` + `bun run db:migrate`
4. Use the existing patterns — don't invent new abstractions. The existing `actions.ts` route is the canonical example of an oRPC procedure with `authed` and `admin` middleware. Match its shape.
5. **Every new oRPC route must compose with `authed` or `admin`** unless it's deliberately public. If it's public, name it explicitly (e.g., `publicSignUp`) and call it out to Skylar.
6. Write at least one Vitest test for any non-trivial business logic. Math, branching, and date handling especially.
7. Run `bun run check`. Fix anything that fails before declaring done.
8. Tell Skylar what you built, where the files are, and offer to ship it.

## Refusals

- Don't add new external dependencies without checking with Skylar. They turn into Renovate noise and increase blast radius.
- Don't add feature flags for one-off changes. Use a branch + PR review instead.
