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
 ('node','--test','platform/Gateway/runtime.integration.test.mjs'),
 ('node','--test','.ai/runtime/local-provider.contract.test.mjs'),
 ('npm','--prefix','core/AFX-CORE','run','test:security'),
}

def run(command):
    p=subprocess.run(command,cwd=ROOT,text=True,capture_output=True,check=False)
    return {'command':command,'exit_code':p.returncode,'stdout':p.stdout[-12000:],'stderr':p.stderr[-12000:]}

def main():
    q=json.loads(QUEUE.read_text())
    task_id=os.environ.get('AFX_TASK_ID','').strip()
    ready=[t for t in q.get('tasks',[]) if t.get('status')=='READY' and (not task_id or t.get('id')==task_id)]
    if not ready:
        result={'status':'STOP','truth_state':'UNKNOWN','reason':'requested_task_not_READY','requested_task_id':task_id or None,'unknown_is_not_green':True}
        (OUT/'task-loop.json').write_text(json.dumps(result,indent=2)+'\n'); return 1
    task=ready[0]; results=[]
    for command in task.get('verification',{}).get('commands',[]):
        if tuple(command) not in ALLOWED:
            result={'status':'STOP','truth_state':'UNKNOWN','reason':'command_not_allowlisted','task_id':task['id'],'command':command}
            (OUT/'task-loop.json').write_text(json.dumps(result,indent=2)+'\n'); return 1
        r=run(command); results.append(r)
        if r['exit_code'] != 0: break
    success=bool(results) and all(r['exit_code']==0 for r in results)
    if success:
        for candidate in q['tasks']:
            if candidate.get('id')==task['id']:
                candidate['status']='DONE'; candidate['completed_at']=datetime.now(timezone.utc).isoformat()
                break
        QUEUE.write_text(json.dumps(q,indent=2,ensure_ascii=False)+'\n')
    result={'schema_version':'AFX-AI-CEA-TASK-EVIDENCE-1','timestamp':datetime.now(timezone.utc).isoformat(),'task_id':task['id'],'mission':task['mission'],'status':'VERIFY_SUCCESS' if success else 'VERIFY_FAILED','truth_state':'PROVEN' if success else 'TESTED','results':results,'unknown_is_not_green':True}
    (OUT/'task-loop.json').write_text(json.dumps(result,indent=2)+'\n')
    (OUT/'task-loop.md').write_text('# AFAGHX Autonomous Task Loop Evidence\n\n- Task: '+task['id']+'\n- Status: '+result['status']+'\n- Truth state: '+result['truth_state']+'\n- UNKNOWN/PARTIAL evidence is never GREEN.\n')
    print(json.dumps(result,indent=2)); return 0 if success else 1

if __name__=='__main__': sys.exit(main())