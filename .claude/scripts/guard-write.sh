#!/usr/bin/env bash
# PreToolUse hook for Write/Edit. Blocks two things:
#   1) any write to a real env file (.env, .env.local, etc. — but not .env.example)
#   2) any content that looks like a real secret (API key, JWT, DB URL with password)

set -euo pipefail

input=$(cat)
path=$(printf '%s' "$input" | jq -r '.tool_input.file_path // ""')
content=$(printf '%s' "$input" | jq -r '.tool_input.content // .tool_input.new_string // ""')

block() {
  echo "BLOCKED by skytop-lab safety hook:" >&2
  echo "$1" >&2
  echo "" >&2
  echo "Why: $2" >&2
  exit 2
}

case "$(basename "$path")" in
  .env|.env.local|.env.production|.env.preview|.env.development)
    block "Refusing to write to $path." \
      "Real env files are gitignored on purpose. If you need to set a value, edit it yourself in your editor — don't have Claude write to it."
    ;;
esac

# Secret-shaped content patterns. These are heuristics — false positives are okay
# (Skylar can put the value in .env.local himself).
if echo "$content" | grep -qE '(sk-[a-zA-Z0-9]{20,}|pk_live_[a-zA-Z0-9]{20,}|postgres(ql)?://[^:]+:[^@]+@[^/]+|eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]+)'; then
  block "That content looks like a real credential (API key, DB password, or JWT)." \
    "Don't paste credentials into files. Put them in .env.local (which is gitignored), and I will reference them by env-var name."
fi

exit 0
