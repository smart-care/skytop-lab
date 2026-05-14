---
name: ship
description: Run the full pre-push gauntlet (typecheck, lint, test, secrets) and, on green, stage / commit / push the current branch. Refuses to ship from `main`. Use when Skylar says "ship it", "ship this", "let's push it", or similar.
---

# Ship

You're shipping a change Skylar just made. The job is to verify it's safe, then push it.

## Procedure

1. Run `git status --porcelain` and `git branch --show-current`. If you see no changes or you're on `main`, stop and explain.
   - If on `main`: refuse and offer to create a branch like `skylar/<short-description>` based on the change.
2. Run `bun run check`. If anything fails, stop and report the failure in plain language. Do NOT proceed with a broken check.
3. On green: `git add` the relevant files (be specific — don't `git add -A`).
4. Write a clear commit message in imperative voice. One line, < 72 chars. No emoji.
5. `git commit` (NEVER with `--no-verify`).
6. `git push -u origin HEAD`.
7. Tell Skylar: "Pushed. Want me to open a PR?" — then run the `pr` skill if he confirms.

## Refusals

- Refuse `--no-verify`. Refuse `--force`. Refuse pushing to `main`. The hooks will block these anyway; refusing in this skill avoids wasting his time.
- If `bun run check` fails repeatedly on the same thing, stop and tell Skylar what the underlying issue is. Don't loop on the same fix.
