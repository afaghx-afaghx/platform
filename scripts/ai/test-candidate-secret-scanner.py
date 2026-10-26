#!/usr/bin/env python3
# Regression tests for secret scanning; examples are assembled so this test file contains no literal credentials.
from __future__ import annotations

from pathlib import Path
from runpy import run_path

# Filename intentionally uses hyphens; load its definitions without invoking main().
SCANNER_PATH = Path(__file__).with_name('scan-candidate-secrets.py')
PATTERNS = run_path(str(SCANNER_PATH))['PATTERNS']

CASES = [
    ('private_key', '-' * 5 + 'BEGIN RSA PRIVATE KEY' + '-' * 5),
    ('openai_api_key', 's' + 'k-' + 'A' * 30),
    ('github_token', 'ghp_' + 'A' * 40),
    ('aws_access_key_id', 'AKIA' + 'A' * 16),
    ('bearer_token', 'Bearer ' + 'a' * 40),
    ('credential_url', 'postgresql' + '://' + 'svc:secret@db.example.invalid/app'),
    ('credential_assignment', 'OPENAI_' + 'API_KEY=' + 'A' * 24),
    ('credential_assignment', 'NPM_TOKEN: ' + 'A' * 24),
    ('credential_assignment', 'CLIENT_SECRET = "' + 'A' * 28 + '"'),
    ('credential_assignment', '"DATABASE_URL" = "postgresql' + '://' + 'svc:secret@db.example.invalid/app"'),
]
for rule, value in CASES:
    if not PATTERNS[rule].search(value):
        raise SystemExit(f'secret-scanner-regression=FAIL positive rule={rule}')

SAFE_ASSIGNMENTS = [
    'OPENAI_' + 'API_KEY=' + '$' + '{OPENAI_API_KEY}',
    'OPENAI_' + 'API_KEY=process.env.OPENAI_API_KEY',
    'DATABASE_URL=' + '$' + '{DATABASE_URL}',
    'OPENAI_' + 'API_KEY=your_api_key_here',
    'OPENAI_API_KEY is documented as a required environment variable',
    'The scanner detects OPENAI_API_KEY assignments, not the variable name alone.',
    'TOKEN',
    'API_KEY',
]
for value in SAFE_ASSIGNMENTS:
    if PATTERNS['credential_assignment'].search(value):
        raise SystemExit(f'secret-scanner-regression=FAIL safe placeholder falsely flagged: {value}')

# The scanner's own source contains regex definitions for credential names and key
# formats. It must not flag those code declarations as actual assigned credentials.
for number, line in enumerate(SCANNER_PATH.read_text(encoding='utf-8').splitlines(), 1):
    if PATTERNS['credential_assignment'].search(line):
        raise SystemExit(f'secret-scanner-regression=FAIL scanner self-match line={number}')

print(f'secret-scanner-regression=PASS positive_cases={len(CASES)} safe_placeholders={len(SAFE_ASSIGNMENTS)}')
