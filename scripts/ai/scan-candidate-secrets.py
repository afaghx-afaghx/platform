#!/usr/bin/env python3
# Fail-closed secret scan of added candidate lines, including intent-to-add untracked files.
from __future__ import annotations

import re
import subprocess
import sys

_CREDENTIAL_NAMES = (
    r"(?:OPENAI_API_KEY|GITHUB_TOKEN|GH_TOKEN|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_SESSION_TOKEN|DATABASE_URL|DB_URL|JWT_SECRET|CLIENT_SECRET|SECRET_KEY|ACCESS_TOKEN|AUTH_TOKEN|API_KEY|PASSWORD|PASSWD|TOKEN|PRIVATE_KEY|SIGNING_KEY|WEBHOOK_SECRET|ENCRYPTION_KEY)"
    r"|[A-Z0-9_]*(?:SECRET|TOKEN|PASSWORD|PASSWD|API_KEY|PRIVATE_KEY|ACCESS_KEY|DATABASE_URL|DB_URL)[A-Z0-9_]*"
)
_CREDENTIAL_ASSIGNMENT_PATTERN = (
    r"(?ix)^\\s*[+]?\\s*[\\x22\\x27]?"
    + _CREDENTIAL_NAMES
    + r"[\\x22\\x27]?\\s*[:=]\\s*[\\x22\\x27]?(?!\\s*$|[#]|your_|replace_me|changeme|example|<|\\$\\{|process\\.env|os\\.getenv|env\\.get|secrets\\.)[^\\x22\\x27\\s#]{12,}"
)

PATTERNS = {
    'private_key': re.compile(r'-----BEGIN (?:OPENSSH |RSA |EC |DSA )?PRIVATE KEY-----', re.I),
    'openai_api_key': re.compile(r'\\bsk-[A-Za-z0-9_-]{24,}\\b'),
    'github_token': re.compile(r'\\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,})\\b'),
    'aws_access_key_id': re.compile(r'\\bAKIA[0-9A-Z]{16}\\b'),
    'bearer_token': re.compile(r'\\bBearer\\s+[A-Za-z0-9._~+/=-]{24,}\\b', re.I),
    'credential_url': re.compile(r'\\b(?:postgres(?:ql)?|mysql|mongodb(?:\\+srv)?|redis)://[^:\\s\\x27\\x22<>]+:[^@\\s/\\x27\\x22<>]+@', re.I),
    'credential_assignment': re.compile(_CREDENTIAL_ASSIGNMENT_PATTERN),
}

def main() -> int:
    if len(sys.argv) != 2 or not sys.argv[1].strip():
        print('secret_scan=BLOCKED reason=baseline_sha_required', file=sys.stderr)
        return 2
    try:
        result = subprocess.run(
            ['git', 'diff', '--binary', '--unified=0', '--no-ext-diff', sys.argv[1], '--'],
            check=True,
            capture_output=True,
            timeout=60,
        )
    except (OSError, subprocess.SubprocessError) as exc:
        print(f'secret_scan=BLOCKED reason=git_diff_unavailable error={type(exc).__name__}', file=sys.stderr)
        return 2

    text = result.stdout.decode('utf-8', errors='replace')
    current_path = 'UNKNOWN_PATH'
    added_lines = 0
    findings: list[tuple[str, str]] = []
    for line in text.splitlines():
        if line.startswith('+++ b/'):
            current_path = line[6:]
            continue
        if not line.startswith('+') or line.startswith('+++'):
            continue
        added_lines += 1
        candidate = line[1:]
        for rule_name, pattern in PATTERNS.items():
            if pattern.search(candidate):
                findings.append((current_path, rule_name))

    if findings:
        for found_path, rule in sorted(set(findings)):
            print(f'secret_scan=BLOCKED path={found_path} rule={rule}', file=sys.stderr)
        return 1
    print(f'secret_scan=PASS scanned_added_lines={added_lines} baseline={sys.argv[1]}')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
