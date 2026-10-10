#!/usr/bin/env bash
set -euo pipefail

previous="${1:-none}"
current="$(readlink -f /opt/afaghx/current)"
case "$current" in /opt/afaghx/releases/*) ;; *) echo "Active release outside release boundary; refusing cleanup."; exit 2 ;; esac
if [[ "$previous" != "none" ]]; then
  case "$previous" in /opt/afaghx/releases/*) ;; *) echo "Rollback release outside release boundary; refusing cleanup."; exit 2 ;; esac
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
