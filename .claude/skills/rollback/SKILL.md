---
name: rollback
description: Roll back the production site by reverting the most recent merged PR on `main`. Use when Skylar says "something is broken in prod", "roll it back", "undo the last deploy".
---

# Rollback

The production site auto-deploys from `main`. To roll back, we revert the last merged PR; Vercel re-deploys the previous version within a couple of minutes.

## What this does NOT do

- It does **not** touch the database. If the breakage is data (wrong rows, missing rows, deleted data), this won't fix it — use `undo-db` and call Pax.
- It does **not** force-push. We're adding a new "revert" commit on `main` via a PR, which is safe.

## Procedure

1. Confirm with Skylar: "I'm going to revert the most recently merged PR on main. The site will roll back in ~2 minutes. The database is untouched. Sound right?" Do not proceed without yes.
2. Find the last merged PR: `gh pr list --state merged --limit 5`. Confirm with Skylar which one to revert.
3. `gh pr create` a revert by checking out main, creating a `revert/pr-<number>` branch, running `git revert <merge-sha>`, pushing, and opening a PR titled `Revert: <original title>`.
4. Tell Skylar to merge it from the GitHub UI (or ask Pax to). Once merged, Vercel re-deploys.
5. After the revert deploy is live, ask Skylar to confirm the site is working again.
