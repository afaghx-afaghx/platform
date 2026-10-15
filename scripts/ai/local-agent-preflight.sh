#!/usr/bin/env bash
set -euo pipefail

MODEL="${AFAGHX_LOCAL_MODEL:-afaghx-qwen3:14b-32k}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"
EXPECTED_OPENCODE_CLI_VERSION="${OPENCODE_CLI_VERSION:-2.0.28}"

command -v ollama >/dev/null 2>&1 || { echo "ollama_not_installed" >&2; exit 1; }
command -v opencode >/dev/null 2>&1 || { echo "opencode_not_installed" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl_not_installed" >&2; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "docker_not_installed" >&2; exit 1; }
command -v gh >/dev/null 2>&1 || { echo "github_cli_not_installed" >&2; exit 1; }

docker info >/dev/null
curl --fail --silent --show-error --max-time 10 "${OLLAMA_URL}/api/tags" >/dev/null

if ! ollama list | awk 'NR>1 {print $1}' | grep -Fxq "${MODEL}"; then
  echo "required_local_model_missing: ${MODEL}" >&2
  echo "Install with: ollama pull ${MODEL}" >&2
  exit 1
fi

# Prove Ollama returns a native function tool call before launching the coding agent.
python3 - "$OLLAMA_URL" "$MODEL" <<'PY'
import json
import sys
import urllib.error
import urllib.request

base_url, model = sys.argv[1:3]
payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": "Call afx_tool_probe exactly once with probe=AFAGHX_TOOL_CALL_OK. Do not answer with plain text."},
        {"role": "user", "content": "Invoke the provided function now."},
    ],
    "tools": [{
        "type": "function",
        "function": {
            "name": "afx_tool_probe",
            "description": "Validates native Ollama tool calling.",
            "parameters": {
                "type": "object",
                "properties": {"probe": {"type": "string", "enum": ["AFAGHX_TOOL_CALL_OK"]}},
                "required": ["probe"],
            },
        },
    }],
    "stream": False,
    "think": True,
    "options": {"temperature": 0, "num_predict": 512},
}
request = urllib.request.Request(
    base_url.rstrip("/") + "/api/chat",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(request, timeout=180) as response:
        body = json.loads(response.read().decode("utf-8"))
except Exception as exc:
    print(f"OLLAMA_TOOL_CALL_GATE=FAIL reason={type(exc).__name__}", file=sys.stderr)
    raise SystemExit(1)
message = body.get("message") or {}
calls = message.get("tool_calls") or []
valid = False
for call in calls:
    fn = call.get("function") or {}
    args = fn.get("arguments") or {}
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except json.JSONDecodeError:
            args = {}
    if fn.get("name") == "afx_tool_probe" and args.get("probe") == "AFAGHX_TOOL_CALL_OK":
        valid = True
if not valid:
    print("OLLAMA_TOOL_CALL_GATE=FAIL expected_native_tool_call=afx_tool_probe", file=sys.stderr)
    print("OLLAMA_TOOL_CALL_GATE_RESPONSE_KEYS=" + ",".join(sorted(body.keys())), file=sys.stderr)
    raise SystemExit(1)
print(f"OLLAMA_TOOL_CALL_GATE=PASS model={model} tool=afx_tool_probe")
PY

# Prove the OpenAI-compatible endpoint honors the exact request override required by OpenCode.
# This isolates model/API behavior from OpenCode transport and tool orchestration.
python3 - "$OLLAMA_URL" "$MODEL" <<'PY'
import json
import sys
import urllib.error
import urllib.request

base_url, model = sys.argv[1:3]
expected = "AFX_OPENAI_COMPAT_TOOL_CALL_OK"
payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": f"Call afx_openai_compat_probe exactly once with probe={expected}. Do not answer with plain text."},
        {"role": "user", "content": "Invoke the provided function now."},
    ],
    "tools": [{
        "type": "function",
        "function": {
            "name": "afx_openai_compat_probe",
            "description": "Validates OpenAI-compatible tool calling with reasoning disabled.",
            "parameters": {
                "type": "object",
                "properties": {"probe": {"type": "string", "enum": [expected]}},
                "required": ["probe"],
            },
        },
    }],
    "reasoning_effort": "none",
    "stream": False,
    "max_tokens": 512,
    "temperature": 0,
}
request = urllib.request.Request(
    base_url.rstrip("/") + "/v1/chat/completions",
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)
try:
    with urllib.request.urlopen(request, timeout=180) as response:
        body = json.loads(response.read().decode("utf-8"))
except Exception as exc:
    print(f"OLLAMA_OPENAI_TOOL_CALL_GATE=FAIL reason={type(exc).__name__}", file=sys.stderr)
    raise SystemExit(1)
choices = body.get("choices") or []
message = (choices[0].get("message") or {}) if choices else {}
calls = message.get("tool_calls") or []
valid = False
for call in calls:
    fn = call.get("function") or {}
    args = fn.get("arguments") or {}
    if isinstance(args, str):
        try:
            args = json.loads(args)
        except json.JSONDecodeError:
            args = {}
    if fn.get("name") == "afx_openai_compat_probe" and args.get("probe") == expected:
        valid = True
if not valid:
    print("OLLAMA_OPENAI_TOOL_CALL_GATE=FAIL expected_native_tool_call=afx_openai_compat_probe", file=sys.stderr)
    print("OLLAMA_OPENAI_TOOL_CALL_GATE_RESPONSE_KEYS=" + ",".join(sorted(body.keys())), file=sys.stderr)
    raise SystemExit(1)
print(f"OLLAMA_OPENAI_TOOL_CALL_GATE=PASS model={model} reasoning_effort=none tool=afx_openai_compat_probe")
PY

OPENCODE_VERSION="$(opencode --version 2>&1 | tr -d '\r')"
if [[ "$OPENCODE_VERSION" != *"$EXPECTED_OPENCODE_CLI_VERSION"* ]]; then
  echo "opencode_version_mismatch expected=${EXPECTED_OPENCODE_CLI_VERSION} actual=${OPENCODE_VERSION}" >&2
  exit 1
fi

echo "local_ai_runtime=READY"
echo "opencode_version=${OPENCODE_VERSION}"
echo "ollama_url=${OLLAMA_URL}"
echo "model=${MODEL}"
