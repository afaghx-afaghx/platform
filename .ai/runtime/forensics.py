#!/usr/bin/env python3
from __future__ import annotations
import hashlib,json,subprocess
from datetime import datetime,timezone
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'agent-evidence'; OUT.mkdir(exist_ok=True)
def cmd(*a): return subprocess.check_output(a,cwd=ROOT,text=True).strip()
baseline=cmd('git','rev-parse','HEAD')
controls=['AGENTS.md','.ai/command-center.yaml','.ai/providers.yaml','.ai/tasks/queue.json']
hashes={p:(hashlib.sha256((ROOT/p).read_bytes()).hexdigest() if (ROOT/p).exists() else None) for p in controls}
e={'schema_version':'AFX-AI-CEA-FORENSICS-1','timestamp':datetime.now(timezone.utc).isoformat(),'baseline_sha':baseline,'tracked_file_count':len(cmd('git','ls-files').splitlines()),'control_hashes':hashes,'unknown_is_not_green':True}
(OUT/'forensics.json').write_text(json.dumps(e,indent=2)+'\n')
(OUT/'baseline-sha.txt').write_text(baseline+'\n')