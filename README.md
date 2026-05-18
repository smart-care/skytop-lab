# Skytop Lab

The Front Office Incentive Tool. It replaces three spreadsheets we've been wrangling for four years. It lives in this folder. You change it by talking to Claude, who edits the files for you. When Claude is ready, you "ship it" — Claude pushes the code to GitHub, Pax reviews, the website rebuilds with your changes.

---

## The 30-second mental model

There are three copies of the code:

1. **Your laptop's copy** — what you edit. Where Claude makes changes. Nobody else sees it.
2. **GitHub's copy** — the official record. Lives on the internet at `github.com/<org>/skytop-lab`.
3. **The live website** — what the team uses. Rebuilds automatically when changes hit GitHub's `main` branch.

When you change something:

- Claude makes the edit on your laptop.
- You say "ship it." Claude saves your work to a *branch* (a side path on GitHub) and opens a *pull request* (a proposal to merge it into `main`).
- Pax reviews the PR. If it's good, he merges it.
- The website rebuilds with your changes in about two minutes.

If anything goes wrong, **we can always go back**. The rails won't let you ruin anything permanently. Read the [safety nets](#the-safety-nets-that-exist) section to see why.

---

## Your historical data

Four years of action data from The Hearing Clinic (THC) spreadsheet has been imported into the tool. As of the initial import:

- **2,312 actions** spanning **2022–2026**, totaling **$80,513.00** in commissions paid
- Staff represented: **Alex** (1,015), **Cosette** (658), **Krystal** (473), **Heidi** (166). Alex and Heidi are former employees; their historical actions are preserved for the record but they can't log in.
- Statuses normalized to the new system: **Approved** (2,205), **Pending** (73), **Denied** (34).

### Decisions we made during the import

A few things didn't map cleanly from the old sheet. Here's what we did and why:

1. **Old action types kept as-is.** The sheet had ten action types we no longer pay on (`Onsite Routine`, `Five Star Google Review`, `Onsite Introduction`, etc.). Those rows are in the tool — they show up in the dashboard and tables — but new submissions can only use the five current types (defined in `app/config/incentive-rules.ts`). If you want to merge any of the old names with current ones (e.g., `Lead, Registered, Qualified (Appointment Must Be Completed)` → `Lead, Registered, Qualified`), tell Pax and we'll do it.
2. **"Maren" in the Status column → Approved.** The old sheet recorded the approver's name (almost always Maren) in the Status column. We mapped those to "Approved" — they were paid, that's what matters.
3. **Original commission amounts preserved verbatim.** We did NOT recompute commissions under today's rules. If you got paid $50 in 2022 for a `Lead, Registered, Qualified`, that row shows $50 — even if our current rules would calculate it differently for the same inputs.
4. **171 rows dropped.** 170 had empty `Recorded Date` cells (they were summary/total rows in the source, not real events). 1 row had the date `9/29/0202` (typo); we couldn't tell which year was meant, so we skipped it.

### What's still missing

**EHS (Ebia Hearing & Sound) history is not in the tool yet.** What we received was a pivot summary (monthly rollup), not the per-event action list. To get EHS history in, export the underlying action list from the Google Sheet — the granular "one row per action" view, not the rollup — and send Pax the CSV. We'll add EHS as a second source in `scripts/import.ts` and re-run the import.

### How re-imports work (for Pax)

The import script is at `scripts/import.ts`. Each row's database ID is a deterministic hash of `(source file, row number)`, so:

- Re-running `bun run scripts/import.ts --commit` after no source changes is a no-op (duplicate rows are skipped automatically).
- To re-import after editing a source CSV: `bun run scripts/import.ts --clear` first to remove the previous imports, then `--commit`.
- To preview what would be imported without writing to the database: `bun run scripts/import.ts` (dry-run is the default).

---

## First-time setup (one-time, ~15 minutes)

You'll need a Mac with Terminal open. Copy and paste each command — don't retype.

1. **Install Bun** (the language runtime). One command:
   ```sh
   curl -fsSL https://bun.sh/install | bash
   ```

2. **Clone this repo**:
   ```sh
   git clone git@github.com:<smartcare-org>/skytop-lab.git
   cd skytop-lab
   ```

3. **Install the project's tools**:
   ```sh
   bun install
   ```
   This also installs the safety hooks that block dangerous git commands.

4. **Set up your environment variables.** Make a copy of `.env.example` named `.env.local`:
   ```sh
   cp .env.example .env.local
   ```
   Then open `.env.local` in your editor (VS Code, TextEdit, whatever) and paste in the values Pax sends you via 1Password. **These values are secret. Don't paste them into Claude. Don't paste them into any other file. The `.env.local` file is the only place they belong.**

5. **Start the development server**:
   ```sh
   bun run dev
   ```
   Open `http://localhost:3000` in your browser. You should see the login screen. Enter your work email — a magic-link email will arrive in about 30 seconds.

You're set up.

---

## The daily loop

Once setup is done, this is what working on the app looks like:

1. **Open this folder in your editor**, and open Claude Code in your terminal.
2. **Tell Claude what you want to change.** Be specific. Examples:
   - "Add a column to the dashboard called 'Last action date'."
   - "When approving an action, default the note to today's date."
   - "Change the THC accelerator threshold from 3 to 4."
3. **Watch Claude work.** Ask questions if anything looks confusing.
4. **Check the change in your browser** at `http://localhost:3000`. Make sure it does what you wanted.
5. **Say "run the checks."** Claude runs `bun run check` (typecheck, lint, test, secret scan). If anything's wrong, it tells you in plain language.
6. **Say "ship it."** Claude saves your work to a branch and pushes it.
7. **Say "open a PR."** Claude posts a link. Click it.
8. **Pax reviews and merges.** The website auto-updates within two minutes. Refresh to see it live.

That's the whole loop.

---

## What's a branch? What's a PR?

**A branch** is a sandbox copy of the code. When you start working on a change, Claude creates a branch like `skylar/add-last-action-column`. Your edits live on that branch until they're merged. Other people's work on `main` doesn't conflict with what you're doing.

**A pull request** (PR) is a proposal: "Hey, can we merge my sandbox back into the real thing? Here's what I changed." A PR is a webpage on GitHub that shows the differences, lets people leave comments, and has a big "Merge" button at the bottom. Pax clicks Merge once he's reviewed.

You never merge your own PRs. That's the rule.

---

## Things you can say to Claude that work well

- "Add a way for admins to mark an action as Disputed from the All Records page."
- "On the dashboard, sort the staff list by total commission, highest first."
- "Change the brand color from purple to teal." (Pax may push back on this. He probably will.)
- "The 'Approve Selected' button should be disabled when nothing is selected." *(Already done, but you get the idea.)*
- "I think the THC LRQ threshold should be 4 instead of 3. Update it and the tests."
- "Make the page titles slightly larger."
- "Add Cosette's email to the seed file."

Specific, scoped, describes-the-behavior — these work great.

---

## Things to *not* say

- ❌ "Just push it to main." → Claude will refuse. The hooks will block it. The GitHub branch protection will reject it. There are three layers of "no" here on purpose.
- ❌ "Skip the failing test." → Claude will refuse. Tests fail for a reason. Fix the underlying thing or call Pax.
- ❌ "Delete all the rows in the action table." → Claude will refuse. If you genuinely need to wipe data, that's a call-Pax situation.
- ❌ "Here's my API key, save it in a file." → Claude will refuse. Open `.env.local` in your editor and paste it there yourself. That file is gitignored — it never leaves your laptop.
- ❌ "Force-push to fix this." → Claude will refuse. Force-pushing rewrites history; if Pax already saw your branch, this can confuse the review.

---

## When something feels broken

Walk through these in order:

1. **Refresh the page.** A lot of "it's broken" turns out to be a stale tab.
2. **Try the site from your phone.** If it works there, the problem is your computer or browser.
3. **Check GitHub for a recent merge.** Open `github.com/<org>/skytop-lab/pulls?q=is:merged`. Did anything land in the last hour?
4. **If a recent PR looks suspicious: roll it back.** Open the PR, click "Revert", merge the revert PR. The site rolls back in ~2 minutes.
5. **If the data is wrong (rows missing, wrong values, etc.):** STOP. Don't try to fix it yourself. Text Pax: "PITR needed on skytop-lab, approximate time HH:MM." Neon keeps a continuous backup — we can rewind the database to any moment in the last 30 days. We have not lost data.
6. **If you can't reach the site at all:** Check `https://www.vercel-status.com`. Then text Pax.

The `rollback` and `undo-db` skills walk Claude through each of these step-by-step. Just say "Claude, the site is broken, help me roll back" or "Claude, the database is wrong."

---

## The safety nets that exist

Read this once and trust it. You **cannot** ruin this app permanently. Here's why:

- ❌ You can't push to `main` directly. Branch protection rejects it.
- ❌ You can't commit a password or API key. `gitleaks` blocks it locally. GitHub Push Protection blocks it at the server. Three layers.
- ❌ You can't ship broken code. The PR can't merge until CI is green.
- ❌ You can't drop a database table. The app's database user doesn't have permission.
- ❌ You can't merge your own PRs. Pax has to approve.
- ✅ Every change is reviewed by a human before it goes live.
- ✅ The database is backed up continuously (Neon Point-In-Time Restore) plus a nightly dump to S3.
- ✅ Production deploys pause for Pax's approval in GitHub's `production` environment.
- ✅ If new code crashes on startup, Vercel auto-rolls back to the previous version.

Mess around. Try things. Ask Claude to attempt risky stuff just to see it refuse. That's the rails working.

---

## Glossary

- **Branch** — A sandbox copy of the code where you make changes. Lives on GitHub alongside other branches.
- **PR (pull request)** — A proposal on GitHub to merge a branch into `main`. Has a review thread and a Merge button.
- **Commit** — A saved snapshot of your changes. One commit = one logical unit of work, with a message describing it.
- **Push** — Sending your local commits up to GitHub.
- **Deploy** — Putting code on the live website. Happens automatically when `main` updates.
- **Migration** — A file that describes a change to the database structure (new column, new table, etc.).
- **Env var (environment variable)** — A configuration value stored outside the code (e.g., a database password). Lives in `.env.local` on your laptop, in Vercel's settings in production.
- **Secret** — Any string you don't want public: passwords, API keys, database URLs.
- **gitleaks** — A tool that scans files for things that look like secrets and refuses to let you commit them.
- **PITR (Point-In-Time Restore)** — Neon's feature that lets us rewind the database to any moment in the last 30 days.

---

## Who to call

- **Pax** — vibe-coding questions, "Claude won't do X," code review, anything that smells weird.
- **Wes / Travis** — architecture questions, "should this app talk to SmartCare," scaling.
- **Neon support** — database outages (rare).
- **Vercel support** — hosting outages (rare).

When in doubt, call Pax.
