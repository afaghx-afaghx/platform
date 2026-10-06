#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
FILE="$ROOT/routes/ownership.json"
python3 - "$FILE" <<'PY'
import json, pathlib, re, sys
p=pathlib.Path(sys.argv[1])
if not p.is_file(): raise SystemExit("ownership.json missing")
d=json.loads(p.read_text())
required=["path","owner","layer","authRequired","tenantRequired","rbacRequired"]
layers={"CORE","PLATFORM","DOMAIN","INTELLIGENCE","EXPERIENCE","INFRASTRUCTURE","ENGINEERING_GOVERNANCE"}
flow=["Authentication","Identity","Tenant/Organization Context","Membership","RBAC/Permission","Policy","Resource State"]
if d.get("canonicalFlow") != flow: raise SystemExit("canonical flow mismatch")
if d.get("validation",{}).get("requireCanonicalFlow") is not True: raise SystemExit("canonical-flow validation disabled")
for r in d.get("routes",[]):
    missing=[k for k in required if k not in r]
    if missing: raise SystemExit(f"missing fields: {missing}")
    if r["layer"] not in layers: raise SystemExit(f"unknown layer: {r['layer']}")
    if r["layer"]=="EXPERIENCE" and re.search(r"(database|postgres|postgresql|redis|mysql|mongodb|sqlite)", r["path"], re.I):
        raise SystemExit(f"Experience database path rejected: {r['path']}")
print("ROUTES_VALIDATION=PASS")
print(f"ROUTES_COUNT={len(d.get('routes',[]))}")
PY
