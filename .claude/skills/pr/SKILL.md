---
name: pr
description: Open a pull request for the current branch. Pushes if needed, fills in the PR template, auto-requests a CODEOWNER. Use when Skylar says "open a PR", "make a PR", "submit it for review".
---

# Open a PR

## Procedure

1. Run `git status` and `git branch --show-current`. If on `main`, stop.
2. If unpushed commits exist, run `git push -u origin HEAD`.
3. Ask Skylar — in his own words, 1–2 sentences — what this change does and why. Don't write it for him; we want a human voice in the PR description.
4. Build the PR body using the template (it'll be auto-loaded by `gh pr create`). Fill in:
   - **What changed** — Skylar's sentences from step 3
   - **Why** — the user-facing reason
   - **Tested by** — what you actually ran (`bun run check`, manual testing if any)
   - **Risk level** — S / M / L (small = visual/copy/CRUD; medium = logic; large = schema/auth/auth-z)
   - **Anything weird?** — call out anything Pax should look at first
5. Run `gh pr create --fill --web=false`. Capture the URL.
6. Tell Skylar: "PR opened: <url>. Pax will review and merge." Do NOT use `gh pr merge` — the hooks will block it and we don't merge our own work.
