#!/usr/bin/env bash
set -euo pipefail

MODEL="${AFAGHX_LOCAL_MODEL:-qwen2.5-coder:14b}"
OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"

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

EXPECTED_OPENCODE_VERSION="${AFAGHX_OPENCODE_VERSION:-1.19.3}"
OPENCODE_VERSION="$(opencode --version)"
VERSION_PATTERN="${EXPECTED_OPENCODE_VERSION//./\\.}"
if ! printf '%s\n' "$OPENCODE_VERSION" | grep -Eq "(^|[^0-9])${VERSION_PATTERN}([^0-9]|$)"; then
  echo "opencode_version_mismatch: expected=$EXPECTED_OPENCODE_VERSION actual=$OPENCODE_VERSION" >&2
  exit 1
fi

MODELS="$(opencode models ollama)"
printf '%s\n' "$MODELS"
if ! printf '%s\n' "$MODELS" | grep -Fq "ollama/${MODEL}"; then
  echo "opencode_model_not_registered: ollama/${MODEL}" >&2
  exit 1
fi

echo "local_ai_runtime=READY"
echo "ollama_url=${OLLAMA_URL}"
echo "model=${MODEL}"
echo "opencode_version=${OPENCODE_VERSION}"
