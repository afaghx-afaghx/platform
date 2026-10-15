#!/usr/bin/env bash
set -euo pipefail

# Git diff omits untracked files. Register them as intent-to-add so scope checks,
# secret scans, and evidence manifests see the actual contents before commit.
mapfile -d '' -t untracked < <(git ls-files --others --exclude-standard -z)
if (("${#untracked[@]}")); then
  git add -N -- "${untracked[@]}"
fi
