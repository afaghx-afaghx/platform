#!/usr/bin/env python3
from __future__ import annotations
import json, os, subprocess, sys
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
QUEUE=ROOT/'.ai'/'tasks'/'queue.json'
OUT=ROOT/'agent-evidence'; OUT.mkdir(exist_ok=True)
PROVIDER_TEST=('node','--test','.ai/runtime/local-provider.contract.test.mjs')
PROVIDER_SANDBOX_IMAGE='node@sha256:efd0ab5780c2d9ab1f0f869571a00d5edb17793bff4cce4a2792e3eb0ffc7562'
ALLOWED={
 PROVIDER_TEST,
 ('node','--test','.ai/runtime/golden-execution.contract.test.mjs'),
 ('node','--test','platform/Gateway/runtime.integration.test.mjs'),
 ('npm','--prefix','core/AFX-CORE','run','test:security'),
}

def _text_tail(value):
    if isinstance(value, bytes):
        value=value.decode('utf-8',errors='replace')
    return (value or '')[-12000:]

def run(command):
    sandboxed=tuple(command)==PROVIDER_TEST
    execution_command=list(command)
    timeout=None
    container_name=None
    if sandboxed:
        container_name=f'afaghx-provider-contract-{os.getpid()}'
        execution_command=[
            'docker','run','--rm','--name',container_name,
            '--network','none',
            '--read-only',
            '--cap-drop','ALL',
            '--security-opt','no-new-privileges:true',
            '--pids-limit','64',
            '--memory','1g',
            '--cpus','1',
            '--user',f'{os.getuid()}:{os.getgid()}',
            '--tmpfs','/tmp:rw,noexec,nosuid,size=64m',
            '--mount',f'type=bind,src={ROOT.resolve()},dst=/workspace,readonly',
            '--workdir','/workspace',
            '--entrypoint','node',
            PROVIDER_SANDBOX_IMAGE,
            '--test','.ai/runtime/local-provider.contract.test.mjs'
        ]
        timeout=120
    try:
        p=subprocess.run(execution_command,cwd=ROOT,text=True,capture_output=True,
                         check=False,timeout=timeout)
        return {
            'command':list(command),
            'execution_command':execution_command if sandboxed else list(command),
            'sandboxed':sandboxed,
            'sandbox_image':PROVIDER_SANDBOX_IMAGE if sandboxed else None,
            'exit_code':p.returncode,
            'stdout':_text_tail(p.stdout),
            'stderr':_text_tail(p.stderr)
        }
    except subprocess.TimeoutExpired as exc:
        if container_name:
            subprocess.run(['docker','rm','--force',container_name],cwd=ROOT,
                           text=True,capture_output=True,check=False,timeout=15)
        return {
            'command':list(command),
            'execution_command':execution_command if sandboxed else list(command),
            'sandboxed':sandboxed,
            'sandbox_image':PROVIDER_SANDBOX_IMAGE if sandboxed else None,
            'exit_code':124,
            'stdout':_text_tail(exc.stdout),
            'stderr':(_text_tail(exc.stderr)+'\\nverification_timeout: 120 seconds')[-12000:]
        }

def main():
    q=json.loads(QUEUE.read_text())
    task_id=os.environ.get('AFX_TASK_ID','').strip()
    ready=[t for t in q.get('tasks',[]) if t.get('status')=='READY' and (not task_id or t.get('id')==task_id)]
    if not ready:
        result={'status':'STOP','truth_state':'UNKNOWN','reason':'requested_task_not_READY','requested_task_id':task_id or None,'unknown_is_not_green':True}
        (OUT/'task-loop.json').write_text(json.dumps(result,indent=2)+'\\n'); return 1
    task=ready[0]; results=[]
    for command in task.get('verification',{}).get('commands',[]):
        if tuple(command) not in ALLOWED:
            result={'status':'STOP','truth_state':'UNKNOWN','reason':'command_not_allowlisted','task_id':task['id'],'command':command}
            (OUT/'task-loop.json').write_text(json.dumps(result,indent=2)+'\\n'); return 1
        r=run(command); results.append(r)
        if r['exit_code'] != 0: break
    success=bool(results) and all(r['exit_code']==0 for r in results)
    if success:
        for candidate in q['tasks']:
            if candidate.get('id')==task['id']:
                candidate['status']='DONE'; candidate['completed_at']=datetime.now(timezone.utc).isoformat()
                break
        QUEUE.write_text(json.dumps(q,indent=2,ensure_ascii=False)+'\\n')
    result={'schema_version':'AFX-AI-CEA-TASK-EVIDENCE-1','timestamp':datetime.now(timezone.utc).isoformat(),'scope':'task_execution','task_id':task['id'],'mission':task['mission'],'status':'VERIFY_SUCCESS' if success else 'VERIFY_FAILED','truth_state':'TESTED' if success else 'RED','system_production_gate_evaluated':False,'results':results,'unknown_is_not_green':True}
    (OUT/'task-loop.json').write_text(json.dumps(result,indent=2)+'\\n')
    (OUT/'task-loop.md').write_text('# AFAGHX Autonomous Task Loop Evidence\\n\\n- Task: '+task['id']+'\\n- Status: '+result['status']+'\\n- Truth state: '+result['truth_state']+'\\n- Scope: task_execution only; system-level PROVEN/Production is not evaluated here.\\n- Generated provider test executes in a pinned, no-network, read-only sandbox.\\n- UNKNOWN/PARTIAL evidence is never GREEN.\\n')
    print(json.dumps(result,indent=2)); return 0 if success else 1

if __name__=='__main__': sys.exit(main())
