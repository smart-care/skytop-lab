---
name: undo-db
description: Walk Skylar through restoring the database to a point in time using Neon's Point-In-Time Restore. Does NOT execute the restore — only documents the click-path. Use when data is wrong/missing/corrupted, never for code bugs.
---

# Undo a database mistake

**Read this first.** If the problem is the site showing wrong UI or behavior, use `rollback`, not this. This skill is only for when the *data* is wrong — rows missing, wrong values, deleted records.

**Critical:** Claude will NOT execute a database restore. The restore happens in Neon's web console, with Pax on the call. This skill exists to give Skylar the exact click-path and to tell him to stop and call Pax first.

## What to tell Skylar

1. "Stop touching the database. Don't try to fix it yourself."
2. "Text Pax. Say: 'PITR needed on skytop-lab, target time ~<approx-time>.' Pax will join you on a call."
3. "While you wait, write down: what changed, when you noticed, what action you took right before things went wrong. This shortens the recovery."
4. "Neon keeps a continuous backup. We can rewind the database to any point in the last 30 days, down to the second. We have not lost data."

## Click-path (for Pax / future reference)

1. Log into Neon at https://console.neon.tech
2. Open the `skytop-lab` project
3. Branches tab → select the production branch
4. "Restore" → "Point in time" → pick the timestamp just *before* the problem
5. Restore creates a new branch with the rewound state. Validate it (use Neon SQL Editor) before swapping production over.
6. Update Vercel's `DATABASE_URL` to point at the restored branch. Redeploy.

Do not skip the validation step. Restoring blindly can replace good data with stale data.
