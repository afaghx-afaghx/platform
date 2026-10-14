#!/usr/bin/env python3
"""Fail-closed validator for the AFAGHX marketing capability registry.

This tool validates governance metadata only. It does not claim that a listed
marketing capability is implemented or live.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ALLOWED_STATUSES = {"planned", "implemented", "tested", "operational"}
REQUIRED_EVIDENCE = {
    "implemented": ("implementation_pr", "reviewed_commit"),
    "tested": ("implementation_pr", "reviewed_commit", "test_run"),
    "operational": ("implementation_pr", "reviewed_commit", "test_run", "runtime_smoke"),
}


def validate(data: object) -> list[str]:
    errors: list[str] = []
    if not isinstance(data, dict):
        return ["registry root must be an object"]
    if data.get("schema_version") != "1.0.0":
        errors.append("schema_version must be 1.0.0")
    capabilities = data.get("capabilities")
    if not isinstance(capabilities, list) or not capabilities:
        return errors + ["capabilities must be a non-empty list"]

    seen: set[str] = set()
    for index, item in enumerate(capabilities):
        prefix = f"capabilities[{index}]"
        if not isinstance(item, dict):
            errors.append(f"{prefix} must be an object")
            continue
        capability_id = item.get("id")
        if not isinstance(capability_id, str) or not capability_id.strip():
            errors.append(f"{prefix}.id must be a non-empty string")
        elif capability_id in seen:
            errors.append(f"duplicate capability id: {capability_id}")
        else:
            seen.add(capability_id)

        for field in ("name", "scope", "owner"):
            if not isinstance(item.get(field), str) or not item[field].strip():
                errors.append(f"{prefix}.{field} must be a non-empty string")

        status = item.get("status")
        if status not in ALLOWED_STATUSES:
            errors.append(f"{prefix}.status must be one of {sorted(ALLOWED_STATUSES)}")
            continue
        evidence = item.get("evidence")
        if not isinstance(evidence, dict):
            errors.append(f"{prefix}.evidence must be an object")
            continue
        for field in REQUIRED_EVIDENCE.get(status, ()):
            if not isinstance(evidence.get(field), str) or not evidence[field].strip():
                errors.append(
                    f"{prefix} cannot be marked {status}: missing evidence.{field}"
                )
    return errors


def main() -> int:
    path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(
        "docs/marketing/marketing-capability-registry.json"
    )
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as exc:
        print(f"FAIL: cannot read valid JSON from {path}: {exc}", file=sys.stderr)
        return 2

    errors = validate(data)
    if errors:
        print("FAIL: marketing registry validation")
        for error in errors:
            print(f"- {error}")
        return 1
    print(f"PASS: registry structure valid; {len(data['capabilities'])} capabilities.")
    print("NOTE: registry validity is not proof of implementation or production readiness.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
