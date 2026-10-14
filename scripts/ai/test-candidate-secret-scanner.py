#!/usr/bin/env python3
# Regression tests for secret scanning; examples are assembled so this test file contains no literal credentials.
from __future__ import annotations

from scan_candidate_secrets import PATTERNS

CASES = [
    ('private_key', '-' * 5 + 'BEGIN RSA PRIVATE KEY' + '-' * 5),
    ('openai_api_key', 's' + 'k-' + 'A' * 30),
    ('github_token', 'ghp_' + 'A' * 40),
    ('aws_access_key_id', 'AKIA' + 'A' * 16),
    ('bearer_token', 'Bearer ' + 'a' * 40),
    ('credential_url', 'postgresql' + '://' + 'svc:secret@db.example.invalid/app'),
    ('credential_assignment', 'OPENAI_' + 'API_KEY=' + 'A' * 24),
    ('credential_assignment', 'NPM_TOKEN: ' + 'A' * 24),
]
for rule, value in CASES:
    if not PATTERNS[rule].search(value):
        raise SystemExit(f'secret-scanner-regression=FAIL rule={rule}')

SAFE_ASSIGNMENTS = [
    'OPENAI_' + 'API_KEY=${OPENAI_API_KEY}',
    'OPENAI_' + 'API_KEY=process.env.OPENAI_API_KEY',
    'DATABASE_URL=${DATABASE_URL}',
    'OPENAI_' + 'API_KEY=your_api_key_here',
]
for value in SAFE_ASSIGNMENTS:
    if PATTERNS['credential_assignment'].search(value):
        raise SystemExit('secret-scanner-regression=FAIL placeholder falsely flagged')

print(f'secret-scanner-regression=PASS positive_cases={len(CASES)} safe_placeholders={len(SAFE_ASSIGNMENTS)}')
