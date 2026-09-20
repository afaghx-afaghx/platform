#!/usr/bin/env bash
set -euo pipefail

MODEL="${AFAGHX_LOCAL_MODEL:-qwen2.5-coder:14b}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"

command -v ollama >/dev/null 2>&1 || { echo "ollama_not_installed" >&2; exit 1; }
command -v opencode >/dev/null 2>&1 || { echo "opencode_not_installed" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "curl_not_installed" >&2; exit 1; }

curl --fail --silent --show-error --max-time 10 "${OLLAMA_URL}/api/tags" >/dev/null

if ! ollama list | awk 'NR>1 {print $1}' | grep -Fxq "${MODEL}"; then
  echo "required_local_model_missing: ${MODEL}" >&2
  echo "Install with: ollama pull ${MODEL}" >&2
  exit 1
fi

opencode --version
echo "local_ai_runtime=READY"
echo "ollama_url=${OLLAMA_URL}"
echo "model=${MODEL}"
