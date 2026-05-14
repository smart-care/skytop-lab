#!/usr/bin/env bash
# Stop hook — runs at the end of a Claude session.
# If there are uncommitted changes on a non-main branch, remind the user.

set -euo pipefail

if [ -z "$(git status --porcelain 2>/dev/null)" ]; then
  exit 0
fi

branch=$(git symbolic-ref --short HEAD 2>/dev/null || echo "")
if [ "$branch" = "main" ] || [ -z "$branch" ]; then
  exit 0
fi

echo "" >&2
echo "Heads up — you have uncommitted changes on branch '$branch'." >&2
echo "Either commit + push them, or run 'git stash' to set them aside." >&2
echo "Don't lose work by closing the terminal." >&2
exit 0
