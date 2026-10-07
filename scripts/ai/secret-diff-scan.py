#!/usr/bin/env python3
import os
import re
import subprocess
import sys

baseline = os.environ['BASELINE_SHA']
diff = subprocess.check_output(['git', 'diff', '--binary', baseline])
prefix_a = ''.join(map(chr, (103, 104, 112, 95)))
prefix_b = ''.join(map(chr, (115, 107, 45)))
patterns = [
    re.compile(rb'BEGIN (RSA|OPENSSH|EC|PRIVATE) KEY'),
    re.compile(prefix_a.encode() + rb'[A-Za-z0-9_]+'),
    re.compile(prefix_b.encode() + rb'[A-Za-z0-9_-]{20,}'),
]
for pattern in patterns:
    if pattern.search(diff):
        raise SystemExit('Secret-like material detected in generated diff.')
sys.exit(0)