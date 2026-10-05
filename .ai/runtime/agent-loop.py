#!/usr/bin/env python3
from __future__ import annotations
import json, os, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
QUEUE=ROOT/'.ai'/'tasks'/'queue.json'
OUT=ROOT/'agent-evidence'; OUT.mkdir(exist_ok=True)

ALLOWED={
 ('node','--test','.ai/runtime/golden-execution.contract.test.mjs'),
 ('node','--test','.ai/runtime/local-provider.contract.test.mjs'),
 ('node','--test','.ai/runtime/gpt56-provider.contract.test.mjs'),
 ('node','--test','platform/Gateway/runtime.integration.test.mjs'),
 ('npm','--prefix','core/AFX-CORE','run','test:security'),
}

TRUTH_STATE_CEILINGS={
 'local-validation': 'TESTED',
 'golden-execution': 'PROVEN',
}

def run(command):
    p=subprocess.run(command,cwd=ROOT,text=True,capture_output=True,check=False)
    return {
        'command':command,
        'exit_code':p.returncode,
        'stdout':p.stdout[-12000:],
        'stderr':p.stderr[-12000:],
    }

def write_stop(reason, task_id=None, command=None):
    result={
        'schema_version':'AFX-AI-CEA-TASK-EVIDENCE-1',
        'timestamp':datetime.now(timezone.utc).isoformat(),
        'status':'STOP',
        'truth_state':'UNKNOWN',
        'reason':reason,
        'task_id':task_id,
        'command':command,
        'unknown_is_not_green':True,
    }
    (OUT/'task-loop.json').write_text(json.dumps(result,indent=2)+'\n')
    (OUT/'task-loop.md').write_text(
        '# AFAGHX Autonomous Task Loop Evidence\n\n'
        f'- Status: STOP\n- Truth state: UNKNOWN\n- Reason: {reason}\n'
        '- UNKNOWN/PARTIAL evidence is never GREEN.\n'
    )
    print(json.dumps(result,indent=2))
    return 1

def main():
    q=json.loads(QUEUE.read_text())
    task_id=os.environ.get('AFX_TASK_ID','').strip()
    ready=[
        t for t in q.get('tasks',[])
        if t.get('status')=='READY' and (not task_id or t.get('id')==task_id)
    ]
    if not ready:
        return write_stop('requested_task_not_READY', task_id or None)

    task=ready[0]
    mode=task.get('mode')
    verification=task.get('verification',{})
    truth_state_ceiling=TRUTH_STATE_CEILINGS.get(mode)

    if truth_state_ceiling is None:
        return write_stop('unsupported_truth_state_mode', task.get('id'))

    if verification.get('truth_required') != truth_state_ceiling:
        return write_stop(
            'task_truth_requirement_exceeds_or_conflicts_with_mode_ceiling',
            task.get('id'),
        )

    results=[]
    for command in verification.get('commands',[]):
        if tuple(command) not in ALLOWED:
            return write_stop('command_not_allowlisted', task.get('id'), command)
        r=run(command)
        results.append(r)
        if r['exit_code'] != 0:
            break

    success=bool(results) and all(r['exit_code']==0 for r in results)

    if success:
        for candidate in q['tasks']:
            if candidate.get('id')==task['id']:
                candidate['status']='DONE'
                candidate['completed_at']=datetime.now(timezone.utc).isoformat()
                break
        QUEUE.write_text(json.dumps(q,indent=2,ensure_ascii=False)+'\n')

    truth_state=truth_state_ceiling if success else 'UNKNOWN'
    result={
        'schema_version':'AFX-AI-CEA-TASK-EVIDENCE-1',
        'timestamp':datetime.now(timezone.utc).isoformat(),
        'task_id':task['id'],
        'mode':mode,
        'mission':task['mission'],
        'status':'VERIFY_SUCCESS' if success else 'VERIFY_FAILED',
        'truth_state':truth_state,
        'truth_state_ceiling':truth_state_ceiling,
        'results':results,
        'unknown_is_not_green':True,
    }

    (OUT/'task-loop.json').write_text(json.dumps(result,indent=2)+'\n')
    (OUT/'task-loop.md').write_text(
        '# AFAGHX Autonomous Task Loop Evidence\n\n'
        f"- Task: {task['id']}\n"
        f"- Mode: {mode}\n"
        f"- Status: {result['status']}\n"
        f"- Truth state: {truth_state}\n"
        f"- Truth-state ceiling: {truth_state_ceiling}\n"
        '- UNKNOWN/PARTIAL evidence is never GREEN.\n'
    )
    print(json.dumps(result,indent=2))
    return 0 if success else 1

if __name__=='__main__':
    sys.exit(main())
