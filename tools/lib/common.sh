#!/usr/bin/env bash

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

VENV="$HOME/ai-tools/.venv"

export OLLAMA_API_BASE="http://127.0.0.1:11434"

activate_python() {
    source "$VENV/bin/activate"
}

project_root() {
    cd "$ROOT_DIR"
}

header() {
    clear
    echo "========================================"
    echo "      Eyan AI Platform"
    echo "========================================"
    echo ""
}
