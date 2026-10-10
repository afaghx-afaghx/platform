#!/usr/bin/env bash
set -euo pipefail

previous="${1:-none}"
current="$(readlink -f /opt/afaghx/current)"
case "$current" in /opt/afaghx/releases/*) ;; *) echo "Active release outside release boundary; refusing cleanup."; exit 2 ;; esac
if [[ "$previous" != "none" ]]; then
  if [[ ! "$previous" =~ ^/opt/afaghx/releases/[0-9a-f]{40}-[0-9]+$ ]]; then
    echo "Rollback target is not a canonical versioned release; refusing cleanup."
    exit 2
  fi
fi

for candidate in /opt/afaghx/releases/*; do
  [[ -d "$candidate" ]] || continue
  resolved="$(readlink -f "$candidate")"
  [[ "$resolved" == "$current" || "$resolved" == "$previous" ]] && continue
  case "$resolved" in
    /opt/afaghx/releases/*) rm -rf -- "$resolved" ;;
    *) echo "Candidate outside release boundary; refusing cleanup."; exit 2 ;;
  esac
done

echo "Retained active release and the immediate rollback target."
