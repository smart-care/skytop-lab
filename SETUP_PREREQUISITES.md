# Setup Prerequisites — for Pax

This is the punch-list of things the **human** has to do that Claude couldn't do from this session because they require external account access. Do these before handing the repo to Skylar. None of them should take more than a few minutes each.

> The scaffolding in this repo runs locally without any of this — you can `bun install && bun run dev` to see the app boot against your own DB. The list below is for putting it on the internet.

## A note on the framework

The lab tech stack doc called for **TanStack Start** but we swapped to plain **Vite + TanStack Router + Hono** during scaffolding. Reasons:

1. TanStack Start at the time pulled in `vinxi` and `h3`, the latter with two high-severity open CVEs (SSE injection, request smuggling) and no clean fix path on the 1.120 release line.
2. Start was mid-rename to `@tanstack/react-start` with breaking changes; the transitive dep graph wouldn't resolve cleanly.
3. The recent npm publish-account compromise on Tanner Lindsley's account argued for staying on the smallest possible TanStack surface area.

What we kept: **TanStack Router** (excellent, stable, file-based routing). What we dropped: **TanStack Start** (the SSR/server-functions layer we didn't need for an internal CRUD dashboard).

If/when SmartCare proper standardizes on TanStack Start and the residual h3 issues are upstream-fixed, this lab can be migrated forward — most of the code (routes, oRPC procedures, schema) ports as-is. The boundary that would change is `server/index.ts` and the entry-point files (`app/main.tsx`).

---

## 1. Create the GitHub repo

- Org: SmartCare (the one that already houses `smartcare-api` / `smartcare-frontend`).
- Name: `skytop-lab`.
- Visibility: Private.
- **Skylar's role: Write, NOT Admin.** Load-bearing — branch protection won't bite for admins.
- Add yourself, Wes, and Travis as Admins.
- Push this local repo:
  ```sh
  cd ~/Work/smartcare/skytop-lab
  git add .
  git commit -m "Initial scaffold"
  git remote add origin git@github.com:<smartcare-org>/skytop-lab.git
  git branch -M main
  git push -u origin main
  ```

## 2. Enable GitHub safety features

Repo → Settings → ...

- **Code security**:
  - Secret Scanning: **enabled**
  - Push Protection: **enabled** ← this is the strongest credential net
  - Dependabot alerts: enabled
- **Branches → Add rule for `main`**:
  - Require PR before merging
  - Require 1 approval from a CODEOWNER
  - Dismiss stale approvals when new commits pushed
  - Require status checks to pass:
    - `typecheck`, `lint`, `test`, `gitleaks`, `build`, `destructive-migration-acknowledged`
  - Require branches to be up to date before merging
  - Require conversation resolution
  - Block force pushes
  - Block deletions
  - **Disallow admin bypass** (uncheck "Do not allow bypassing the above settings"... actually do the opposite — *check* "Restrict who can push to matching branches" with no allowlist)
- **General**:
  - Squash merging only (disable merge commits + rebase merging)
  - Automatically delete head branches after merge

## 3. Create the Neon project

- New project: `skytop-lab`
- Region: closest to Vercel deploy region
- Postgres version: latest
- **Plan: Pro** (gets 30-day Point-in-Time Restore — ~$20/mo, worth it)

### Why Neon for local dev too

We deliberately do NOT use a locally-installed Postgres for Skylar's machine. Reasons:
- Installing/configuring local Postgres (Homebrew, port collisions, role creation, peer vs password auth) is the single hardest first-run step for a non-technical user — and the failure modes are opaque.
- Neon's branching is free + instant: Pax creates a `dev-skylar` branch from `main`, gives Skylar the connection string, and his laptop just talks to Neon over the network.
- Same shape as production, no environment drift.
- The connection string is the only DB-related thing Skylar ever touches.

### Branches to create

| Branch | Used by | Purpose |
|---|---|---|
| `main` (default) | Vercel production | Real data, real users |
| `dev-skylar` | Skylar's local `.env` | His personal sandbox; freely mutable |
| `preview` (per PR, auto) | Vercel preview deploys | Created by Neon's Vercel integration |

To create `dev-skylar`: Neon dashboard → Branches → "+ New branch" → parent `main` → name `dev-skylar`. The connection string for this branch goes into the 1Password share for Skylar.

Create three roles inside the project:

```sql
-- app_user: what Vercel uses. No DDL.
CREATE ROLE app_user LOGIN PASSWORD '<generate-strong>';
GRANT CONNECT ON DATABASE neondb TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO app_user;

-- migration_user: CI uses this for drizzle-kit migrate. Full DDL.
CREATE ROLE migration_user LOGIN PASSWORD '<generate-strong>';
GRANT ALL PRIVILEGES ON DATABASE neondb TO migration_user;
GRANT ALL ON SCHEMA public TO migration_user;
```

Create branches:
- `main` → production
- `dev-skylar` → Skylar's personal dev DB. Connection string goes in his `.env.local`. Branch it from main initially; he refreshes from main occasionally.

## 4. Resend (or AWS SES) for magic-link email

- Create a Resend project (cheaper/simpler than SES for low volume).
- Verify a domain you can send `noreply@` from. Pick a friendly one for Skylar.
- Generate an API key.

## 5. Create the Vercel project

- Import from GitHub repo `skytop-lab`.
- Framework preset: **Other** (this is a Vite SPA + a Bun/Hono server — not one of Vercel's auto-detected frameworks).
- Build command: `bun run build`. Output directory: `dist`.
- **Important**: Vercel doesn't run long-lived Bun processes natively. For the API side, either:
  - **Option A (recommended)**: deploy the SPA to Vercel and host the Hono API on a Bun-friendly platform (Fly.io, Railway, Render). Set `BETTER_AUTH_URL` and the SPA's API base to point at the API host. Two services, but each is in its happy place.
  - **Option B**: Wrap the Hono app in Vercel Edge Functions / Serverless Functions. Hono supports both. More work to migrate; do this when v1 is stable and traffic justifies it.
- Either way: Skylar never sees this distinction — he just visits the domain.
- Add env vars **per environment**:

| Variable | Production | Preview | Dev (`.env.local`) |
|---|---|---|---|
| `DATABASE_URL` | Neon prod, `app_user` role | Neon preview branch, `app_user` | Neon `dev-skylar` branch |
| `BETTER_AUTH_SECRET` | rotate per env | rotate per env | dev secret |
| `BETTER_AUTH_URL` | `https://fois.<domain>` | Vercel preview URL | `http://localhost:3000` |
| `RESEND_API_KEY` | real key | real key (but auth.ts allowlists recipients) | real key |
| `MAGIC_LINK_FROM` | `Skytop Lab <noreply@<domain>>` | same | dev value |
| `APP_ENV` | `production` | `preview` | `development` |

**Do NOT put `MIGRATION_DATABASE_URL` in Vercel.** That lives only in GitHub Actions secrets.

## 6. Connect Vercel to the GitHub `production` environment

- In GitHub: Repo → Settings → Environments → create `production`.
  - Required reviewer: Pax (you).
  - Wait timer: 0.
- In Vercel: Settings → Git → Production Branch = `main`. Vercel respects GitHub environments — production deploys will pause for your approval.

## 7. GitHub Actions secrets

Repo → Settings → Secrets and variables → Actions:

- `MIGRATION_DATABASE_URL` → Neon prod with `migration_user` (CI uses this to run `drizzle-kit migrate`)
- `PROD_DATABASE_URL` → Neon prod with `app_user` for `pg_dump` in nightly-backup
- `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, `BACKUP_AWS_REGION`, `BACKUP_S3_BUCKET` → for nightly backup workflow

## 8. Buy and point a domain

Skylar already owns Namecheap; he's said "I'd buy it." Suggested: `fois.<something>.com` or its own short domain. In Vercel: Project → Settings → Domains → add. Vercel issues TLS automatically.

## 9. First migration + seed

Once Neon is up and `MIGRATION_DATABASE_URL` is set locally:

```sh
bun run db:generate   # produces drizzle/migrations/0000_*.sql
bun run db:migrate    # applies to the dev branch DB
bun run db:seed       # creates the 6 users
```

Commit the generated migration file. CI runs migrations on prod after PR merge.

## 10. Install local hooks (one command)

```sh
bun install   # this triggers lefthook install via the prepare script
```

If the hooks didn't install for some reason: `bunx lefthook install`.

You also need `gitleaks` available locally:
```sh
brew install gitleaks
```

## 11. Walk Skylar through it

Schedule a 30-min screen-share. Have him:
1. Clone the repo, run `bun install`, `cp .env.example .env.local`, paste in values from 1Password.
2. Run `bun run dev`, sign in via magic link.
3. Together, make one tiny change ("change the dashboard title color"). Walk through: `bun run check`, "ship it", "open a PR." You review and merge. Watch it deploy.
4. Show him the README sections he needs most: daily loop, what to say to Claude, when something feels broken.

After that, he's loose.

---

## Known security posture (as of scaffold)

`bun audit` reports two remaining findings, both moderate and both dev-time only:

- `vite <=6.4.1` — path traversal in optimized deps `.map` handling. Affects the dev server only. Upgrade when 6.4.2+ ships.
- `esbuild <=0.24.2` — dev server CORS issue. Affects the dev server only.

Neither affects the production runtime (the prod server is just Hono on Bun serving the built SPA). Re-audit after `bun install` periodically and bump direct deps as patched versions ship.

## Verification checklist

Before saying it's ready:

- [ ] `bun install && bun run dev` works on a fresh clone
- [ ] Magic-link login works in dev
- [ ] Submit → approve flow works end-to-end with `bun run dev`
- [ ] Try to push to `main` from local → blocked by `pre-push` hook
- [ ] Try `git push --no-verify` → blocked by Claude's Bash hook
- [ ] Try to commit a fake `sk-test-1234567890abcdef...` string → blocked by gitleaks pre-commit
- [ ] Open a PR with a `DROP COLUMN` migration → `migration-check` workflow fails until `approved-destructive-migration` label added
- [ ] Manually trigger `nightly-backup.yml` → S3 object appears, `pg_restore` of it boots cleanly against a throwaway Neon branch
- [ ] A trivial PR auto-deploys a preview URL, and merging triggers a prod deploy that pauses for your approval
- [ ] `bun audit` shows 0 critical/high findings (dev-time moderates are acceptable)
