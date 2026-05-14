---
name: ask-human
description: Draft a message to Pax (or another engineer) describing what Skylar is stuck on, with current context attached. Use whenever a safety check is blocking, a feature is bigger than vibe-coding can handle, or Skylar says "I'm stuck", "I need help", "ask Pax".
---

# Ask for human help

Some changes are too big or too risky for vibe coding. That's fine — knowing when to hand off is a feature, not a failure.

## When to use this proactively

- A migration requires destructive changes (DROP COLUMN, TYPE change with data loss)
- A change touches auth, authorization, or the rate-limit middleware
- `bun run check` fails for a reason you can't explain in plain English
- A safety hook blocks the same thing 2+ times — keep trying is the wrong move
- A change spans more than ~5 files or involves a new external integration

## Procedure

1. Summarize what Skylar is trying to do, in 2-3 sentences.
2. List what you tried.
3. Quote any specific error messages or failing check output verbatim.
4. Note which files are involved.
5. Format as a draft message for Skylar to send to Pax. Do NOT send it yourself — show it to Skylar to confirm.

## Template

```
Hi Pax — getting stuck on skytop-lab.

Goal: <what Skylar is trying to do>

What I tried: <approach + result>

Error / blocker:
> <verbatim error or hook output>

Files involved: <paths>

Branch: <branch name, if pushed>
```
