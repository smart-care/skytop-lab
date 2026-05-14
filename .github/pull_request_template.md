## What changed

<!-- 1-2 sentences in your own words. What does this do? -->

## Why

<!-- The user-facing reason. What does Skylar / the team actually get out of this? -->

## Tested by

- [ ] `bun run check` passes locally
- [ ] Manually exercised the changed flow in `bun run dev`
- [ ] (If schema change) ran `bun run db:generate` and reviewed the new migration

## Risk level

- [ ] **S** — visual / copy / pure CRUD on existing tables
- [ ] **M** — new business logic, new oRPC route, new screen
- [ ] **L** — schema change, auth / authz change, dependency upgrade, infra change

## Anything weird?

<!-- Things to look at first. Edge cases. Tradeoffs you made. -->
