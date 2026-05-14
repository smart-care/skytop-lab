# Skylar Onboarding Walkthrough

> The script Pax follows during the ~60-minute screen-share to get Skylar from "blank Mac" to "I can vibe-code on Skytop Lab."
>
> Assumes: Skylar has a Mac, an email, a credit card on file with GitHub (free is fine), and zero developer tooling installed. We're going to give him exactly enough infrastructure to do CRUD-shaped changes through Claude, nothing more.

---

## 0. Pax's pre-work (do BEFORE the session)

These are things Skylar's machine doesn't need but the *world* does. Knock them out the day before.

- [ ] **GitHub repo**: `skytop-lab` exists under the SmartCare org. Skylar's role: **Write** (NOT Admin).
- [ ] **Branch protection** on `main` is configured per `SETUP_PREREQUISITES.md` §2.
- [ ] **Neon project** `skytop-lab` exists. Confirmed on Pro plan (30-day PITR).
- [ ] **Neon branches**: `main` (default), `dev-skylar` (created from `main`).
- [ ] **Neon roles**: `app_user`, `migration_user`, `admin_user` per §3. The `dev-skylar` branch uses its own copy of these roles.
- [ ] **Connection string** for `dev-skylar` (via `app_user`) is in 1Password, in a vault shared to Skylar.
- [ ] **Better Auth secret** generated (`openssl rand -base64 32`), also in 1Password.
- [ ] **Seed users updated**: `scripts/seed.ts` has the real emails for Skylar / Maren / Addison / Chelsea / Krystal / Cosette (replace the `@skytop.example` placeholders). Committed to `main`.
- [ ] **1Password invite sent** to Skylar's work email for the `Skytop Lab Dev` vault. Vault contains:
  - `DATABASE_URL` — Neon `dev-skylar` connection string for `app_user`
  - `BETTER_AUTH_SECRET` — the generated secret
  - `BETTER_AUTH_URL` — `http://localhost:3000`
  - `APP_ENV` — `development`
  - (`RESEND_API_KEY` and `MAGIC_LINK_FROM` stay blank — magic links print to terminal in dev)
- [ ] **Calendar invite** sent for the session with this doc linked.

---

## 1. Session opening (5 min)

Drive on Skylar's machine via Zoom/Meet screen share. Get him talking through what he's seeing as he goes — this is also a usability test of the doc.

**Say something like:**

> "Today we're going to install a small set of tools on your laptop, then I'll show you how to make a change to the app and ship it. After today, your daily routine is: open one app, type what you want to change, watch it happen. Today is the only time it'll feel like 'setting up a computer.' Ready?"

**Mental model to plant early:**

- Three copies of the code: your laptop / GitHub / the live website.
- You change your laptop's copy by *talking to Claude*.
- When it looks right, you *ship* it (Claude pushes to GitHub on a branch).
- A human reviews the change. After approval, the website updates automatically.

That's the whole loop. Everything else is plumbing.

---

## 2. Install the basics (15 min)

We'll install everything in this order. Each step should "just work" — if anything errors, stop and read the error together.

### 2.1 Open Terminal

- Spotlight (`⌘ + Space`) → type `Terminal` → Enter.
- This is the thing he'll have anxiety about. Reassure: he only types commands during today's session and during occasional "something's broken" debugging with Pax. Daily vibe-coding doesn't require him to type anything in Terminal.

### 2.2 Xcode Command Line Tools

These ship git and a compiler — needed for Homebrew to work.

```sh
xcode-select --install
```

A GUI dialog appears. Click **Install** → **Agree**. Wait ~5 min for the download. If it says "already installed," skip.

### 2.3 Homebrew

The package manager we'll use to install everything else.

```sh
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

It'll ask for his Mac password (regular login password). Type it in (you won't see characters as you type — that's normal in Terminal).

When it finishes, it prints two `eval` lines under "Next steps". **Copy and paste both lines into Terminal and hit Enter.** This adds `brew` to his PATH for future terminal sessions.

Verify:
```sh
brew --version
```
Should print something like `Homebrew 4.x.y`.

### 2.4 Install Bun, GitHub CLI, gitleaks

These are the runtime tools the project needs.

```sh
brew install bun gh gitleaks
```

Takes 1–2 minutes. Verify:
```sh
bun --version    # should print a version like 1.3.x
gh --version     # 2.x.x
gitleaks version # 8.x.x or similar
```

### 2.5 Install VS Code

The editor where he'll do all his work.

```sh
brew install --cask visual-studio-code
```

Or download from `code.visualstudio.com` if `brew` is being slow.

When done, open VS Code from Applications. Dismiss the welcome tab.

### 2.6 Install the Claude Code VS Code extension

Inside VS Code:

1. `⌘ + Shift + X` opens the Extensions panel.
2. Search for **"Claude Code"** (the official Anthropic one — confirm the publisher is "Anthropic").
3. Click **Install**.
4. Reload window when prompted.

Skylar now has Claude inside VS Code. We'll use it in a few minutes.

---

## 3. Sign him in to the things (5 min)

### 3.1 GitHub

In Terminal:

```sh
gh auth login
```

Pick:
- **GitHub.com**
- **HTTPS** (not SSH — easier first-run)
- **Y** (authenticate Git with GitHub credentials)
- **Login with a web browser**

Copy the one-time code, click the URL, paste the code, click **Authorize**. Back in Terminal it confirms.

Verify:
```sh
gh auth status
```
Should print `Logged in to github.com account skylar...`

### 3.2 Anthropic (Claude Code)

Back in VS Code:

1. `⌘ + Shift + P` → type "Claude" → pick **Claude Code: Sign in**.
2. A browser tab opens to Anthropic's login. Sign in with his work email.
3. Authorize the extension when prompted.

When it's done, the Claude panel in VS Code will show "Connected as <his email>."

### 3.3 1Password

If he doesn't already have it:

```sh
brew install --cask 1password 1password-cli
```

Open 1Password from Applications, sign in. Accept the invite to the `Skytop Lab Dev` vault you sent.

---

## 4. Get the code (5 min)

### 4.1 Clone the repo

In Terminal, `cd` to where he keeps work:

```sh
cd ~
mkdir -p Work
cd Work
gh repo clone <smartcare-org>/skytop-lab
cd skytop-lab
```

Verify the repo is there:
```sh
ls
```
He should see `package.json`, `README.md`, `app/`, etc.

### 4.2 Open in VS Code

```sh
code .
```

(That's `code` then a space then a dot — opens the current folder in VS Code.)

A VS Code window opens with the project. **Click "Yes, I trust the authors"** if it asks.

### 4.3 Trust the workspace + install recommended extensions

VS Code might prompt to install recommended extensions (Biome, etc.). Click **Install All**.

---

## 5. Configure secrets (5 min)

### 5.1 Create his `.env` file

In VS Code's integrated terminal (`Ctrl + ~` to open it):

```sh
cp .env.example .env
```

This makes a copy of the template named `.env`. The original is the template; `.env` is the file he'll fill in. **Do not edit `.env.example`.**

### 5.2 Paste values from 1Password

Open `.env` in VS Code (left sidebar → click `.env`).

Open 1Password → the `Skytop Lab Dev` vault → the `skytop-lab .env` item.

For each variable in `.env`, paste the value from 1Password between the quotes:

- `DATABASE_URL` — long string starting with `postgresql://`
- `BETTER_AUTH_SECRET` — random-looking base64 string
- `BETTER_AUTH_URL` — `http://localhost:3000`
- `APP_ENV` — `development`
- Leave `RESEND_API_KEY` and `MAGIC_LINK_FROM` empty for now. Magic links will print to the terminal.
- Leave `MIGRATION_DATABASE_URL` empty too — `DATABASE_URL` covers it for now.

Save the file (`⌘ + S`).

**Reassurance moment:** "These values are secret. Don't paste them anywhere else, don't share them in Slack, don't type them to Claude in chat. They live in this one file on your laptop. That's it."

If he asks why we can't just put it in Claude: explain that there's literally a guard rail in this repo that blocks Claude from writing to `.env` files — that's a feature, not a bug. He paste it himself, Claude references it by name.

---

## 6. Install project dependencies + database setup (5 min)

### 6.1 `bun install`

In the VS Code terminal:

```sh
bun install
```

Takes ~10 seconds. This downloads all the project's tooling into a `node_modules/` folder. It also installs the git hooks that block dangerous operations.

### 6.2 Apply the database schema

```sh
bun run db:migrate
```

This connects to his Neon `dev-skylar` branch and creates all the tables. Should print `Migrating <host>/<db>…` then `Done.`

If you get "DATABASE_URL is not set", `.env` is in the wrong directory or wasn't saved. Stop and check.

### 6.3 Seed users

```sh
bun run db:seed
```

Inserts the 6 team members. He sees:
```
Seeding 6 users…
  + skylar@... (owner)
  + maren@... (admin)
  ...
Done.
```

### 6.4 Optional: drop in some fake data

So the dashboard isn't empty on first sign-in:

```sh
bun run scripts/fake-data.ts
```

Adds 80 realistic action rows. Safe to delete later with `bun run scripts/fake-data.ts --clear`.

---

## 7. Run the dev server (5 min)

### 7.1 Start it

```sh
bun run dev
```

After ~5 seconds he sees:
```
[api] [server] listening on http://localhost:3001 (dev)
  VITE v6.4.2  ready
  ➜  Local:   http://localhost:3000/
```

**Leave this terminal running.** It's the live app. He'll come back here to see magic-link URLs and any error output.

### 7.2 Open the app

Open Chrome (or his browser) → `http://localhost:3000/`. He should see the login screen.

### 7.3 Sign in

Type his real email (the one in the seed file).

Click **Email me a sign-in link**.

The browser shows "We sent a sign-in link to <email>." But no email actually went out — because we left `RESEND_API_KEY` blank, the link printed to the terminal instead.

### 7.4 Click the link

In the VS Code terminal, find the line that starts with `[auth] No RESEND_API_KEY set. Magic link for ...`. The URL on the next line is the sign-in link.

Click it (⌘-click in most terminals). The browser opens it, signs him in, lands him on the dashboard.

**Pause here.** This is the moment he's been waiting for. Let him click around. Show him the dashboard, the activity table, the submit-action form, the approvals page. Walk through what each is.

---

## 8. Make a real change (10 min)

This is the payoff. We're going to make a tiny, visible change and ship it together end-to-end.

### 8.1 Open the Claude panel

In VS Code: `⌘ + Esc` (or whatever shortcut the extension uses) opens the Claude panel on the right side.

### 8.2 Ask for a change

Have Skylar type a real request. Pick something visible. Examples:
- "Change the dashboard subtitle from 'Month: 2026-05' to say 'This month' instead."
- "On the Submit Action page, change the commission preview box background from light purple to light green."
- "Add a column to the Activity table called 'Location'."

Let Claude work. **Don't intervene.** Let Skylar see the file edits happen.

### 8.3 Test the change

Switch to the browser and refresh. The change should be live (Vite hot-reloads).

If it looks right, move on. If it doesn't, let Claude iterate.

### 8.4 "Run the checks"

Skylar types in the Claude panel: `run the checks`.

Claude runs `bun run check` (typecheck + lint + test + secret scan). All four should pass.

### 8.5 "Ship it"

Skylar types: `ship it`.

The `ship` skill:
1. Creates a branch like `skylar/dashboard-subtitle`
2. Stages the changes
3. Commits with a message
4. Pushes to GitHub

He'll see Claude narrate each step. About 15 seconds total.

### 8.6 "Open a PR"

Skylar types: `open a PR`.

The `pr` skill:
1. Confirms the branch is pushed
2. Asks him to describe the change in 1–2 sentences (have him actually type this — it's the only spot where his voice goes into the PR)
3. Runs `gh pr create` with the body filled in
4. Returns the URL

Click the URL. The PR opens in his browser.

### 8.7 You (Pax) review and merge

This is the moment of truth — show him a real review. Look at the diff, leave a small "lgtm" or a question, then click **Squash and merge**.

When merged, the deploy pipeline kicks in (assuming Vercel is wired up; if not, just narrate "in production, this would auto-deploy now").

---

## 9. Wrap up (5–10 min)

### 9.1 Walk through the README

Open `README.md` in VS Code. Show him these sections:
- "The 30-second mental model"
- "The daily loop"
- "Things you can say to Claude"
- "Things to NOT say"
- "When something feels broken"

He'll come back to these. Tell him to bookmark the README file in VS Code (right-click → "Add to Pinned Tabs").

### 9.2 What he can do alone

- Visual / copy / small CRUD changes — yes
- Sort orders, button colors, label text, new filter — yes
- Adding a column to an existing table — yes
- New screen — sure, lean on `new-feature` skill
- Anything Claude refuses — call Pax. It's refusing for a reason.

### 9.3 What he calls Pax for

- "Site is broken in production" — Pax + `rollback` skill
- "Data looks wrong" — Pax + `undo-db` skill
- Auth changes, schema changes, new integration — Pax
- "This safety check keeps blocking me" — Pax (don't disable, ask)

### 9.4 What if his laptop dies

- All his code lives on GitHub. New laptop, same `gh repo clone`, same 1Password, same `.env`, back in business in 30 minutes.

### 9.5 "Where's my historical data?"

He **will** ask this. The answer:

> "Your four years of action data lives in the Google Sheets where it always has — that's your archive, and it's not going anywhere. This tool isn't trying to replace your history; it's replacing your *workflow going forward*. Starting today, new actions get logged here. If you ever need to look up a payout from 2024, open the spreadsheet. If you ever want me to import some of the recent history into the new tool, I can do it in a 30-minute follow-up."

Why we didn't auto-import: his old data has retired action types (`Five Star Google Review`, `Onsite Introduction`, etc.) that have no commission rule in the new tool. Importing them would create rows the dashboard can't render correctly. His prototype already made the call to retire those types — we're respecting that decision.

### 9.5 Test the help loop

Have him type into Claude: `I'm stuck. How do I ask Pax for help?`. The `ask-human` skill drafts a Linear-formatted message. Doesn't send it — gives him the text to send.

---

## Troubleshooting cheat sheet

If something errors during the session, here's the fast diagnosis.

| Symptom | Likely cause | Fix |
|---|---|---|
| `Invalid environment variables` on `bun run dev` | `.env` missing or has empty required vars | Open `.env`, paste from 1Password again |
| `DATABASE_URL is not set` on `bun run db:migrate` | Running from wrong dir, or `.env` saved with `.txt` extension | `cd skytop-lab` first; check filename in Finder |
| `ECONNREFUSED` on login submit | DB connection broken — check the Neon dashboard | Verify the branch is still live |
| `Port 3000 in use` on `bun run dev` | Another dev server orphan running | `lsof -ti :3000 :3001 \| xargs kill -9` then retry |
| Magic-link URL doesn't appear in terminal | Email not in seed file | Add him to `scripts/seed.ts` and re-run `db:seed` |
| Claude refuses a request | The guardrails fired (correctly) | Read the refusal message; if it doesn't make sense, ping Pax |
| `gitleaks: command not found` during commit | Forgot step 2.4 | `brew install gitleaks` |
| Lefthook hooks not running | Forgot step 6.1 (`bun install` runs `lefthook install` via the `prepare` script) | `bun install` again, then `bunx lefthook install` |

---

## After the session (Pax follow-ups)

- [ ] Verify the test PR he opened actually merged + deployed cleanly.
- [ ] If Vercel isn't wired up yet, make it the next priority (he'll want to see his changes go live).
- [ ] Schedule a 30-day check-in to see what he's been building and what's friction.
- [ ] Update this doc with anything that didn't go as scripted.
