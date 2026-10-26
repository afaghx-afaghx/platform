#!/usr/bin/env bash
set -euo pipefail

MODEL="${AFAGHX_LOCAL_MODEL:-qwen2.5-coder:14b}"
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

OPENCODE_VERSION="$(opencode --version 2>&1 | tr -d '\r')"
if [[ "$OPENCODE_VERSION" != *"$EXPECTED_OPENCODE_CLI_VERSION"* ]]; then
  echo "opencode_version_mismatch expected=${EXPECTED_OPENCODE_CLI_VERSION} actual=${OPENCODE_VERSION}" >&2
  exit 1
fi

echo "local_ai_runtime=READY"
echo "opencode_version=${OPENCODE_VERSION}"
echo "ollama_url=${OLLAMA_URL}"
echo "model=${MODEL}"
