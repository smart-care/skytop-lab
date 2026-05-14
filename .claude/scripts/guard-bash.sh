#!/usr/bin/env bash
# PreToolUse hook for Bash. Reads tool input from stdin (JSON), inspects the command,
# and blocks anything that matches our hard-deny list with a plain-language explanation.
#
# Exit 0 = allow, exit 2 = block with the message printed to stderr.

set -euo pipefail

input=$(cat)
cmd=$(printf '%s' "$input" | jq -r '.tool_input.command // ""' 2>/dev/null || echo "")

if [ -z "$cmd" ]; then
  exit 0
fi

block() {
  echo "BLOCKED by skytop-lab safety hook:" >&2
  echo "$1" >&2
  echo "" >&2
  echo "Why: $2" >&2
  echo "" >&2
  echo "If you genuinely need to do this, stop and ask Pax for help." >&2
  exit 2
}

# --- Git foot-guns ---
if echo "$cmd" | grep -qE 'git\s+push\s+(-f|--force)'; then
  block "Force-pushing is not allowed." \
    "Force-push rewrites history and can destroy other people's work. Use a normal push, and open a PR."
fi
if echo "$cmd" | grep -qE 'git\s+(push|commit)\s+.*--no-verify'; then
  block "Bypassing pre-commit/pre-push hooks is not allowed." \
    "The hooks exist to catch problems before they ship. If a hook is wrong, fix the underlying issue; don't skip it."
fi
if echo "$cmd" | grep -qE 'git\s+reset\s+--hard\s+(origin|HEAD)'; then
  block "Hard reset is destructive — refusing." \
    "This throws away uncommitted work. Stash or commit first."
fi

# --- Destructive SQL ---
if echo "$cmd" | grep -qiE '(DROP\s+TABLE|DROP\s+DATABASE|TRUNCATE\s+TABLE|TRUNCATE\b|DELETE\s+FROM)'; then
  block "Refusing to run destructive SQL from a shell command." \
    "Destructive SQL belongs in a reviewed migration file, never an ad-hoc command. Ask Pax if you genuinely need this."
fi

# --- Direct psql against production ---
if echo "$cmd" | grep -qE 'psql.*neon\.tech'; then
  block "Direct psql against a Neon-hosted database is blocked." \
    "Use the app's typed query layer in app/server/ or write a migration. Never touch prod with ad-hoc psql."
fi

# --- rm -rf at dangerous paths ---
if echo "$cmd" | grep -qE 'rm\s+-rf\s+(/|~|\$HOME)\b'; then
  block "rm -rf at a dangerous path is blocked." \
    "Use a more specific path, or ask Pax if you genuinely need to delete that much."
fi

# --- Merging your own PRs ---
if echo "$cmd" | grep -qE 'gh\s+pr\s+merge'; then
  block "Merging PRs from the CLI is blocked." \
    "All PRs need a human review on GitHub. Wait for Pax (or another reviewer) to approve and merge."
fi

exit 0
