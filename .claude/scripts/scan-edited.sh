#!/usr/bin/env bash
# PostToolUse hook for Write/Edit. Runs gitleaks against the file we just edited
# so any leaked secret surfaces before it gets staged. Non-blocking (advisory).

set -euo pipefail

input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')

if [ -z "$path" ] || [ ! -f "$path" ]; then
  exit 0
fi

# Skip non-text or large files.
if [ "$(wc -c < "$path")" -gt 524288 ]; then exit 0; fi
if ! file "$path" 2>/dev/null | grep -q text; then exit 0; fi

if command -v gitleaks >/dev/null 2>&1; then
  if ! gitleaks detect --no-git --redact -v --source "$path" >/dev/null 2>&1; then
    echo "[scan-edited] gitleaks flagged $path — review before staging." >&2
  fi
fi

exit 0
