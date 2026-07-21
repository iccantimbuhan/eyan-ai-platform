#!/usr/bin/env bash

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

source "$SCRIPT_DIR/common.sh"

activate_python
project_root

header

echo "========================================"
echo "          Architect Mode"
echo "========================================"
echo
echo "Thinking first. Planning before editing."
echo

exec aider \
    -c .aider.conf.yml \
    --architect \
    --read AGENTS.md
