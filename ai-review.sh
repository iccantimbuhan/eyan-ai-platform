#!/bin/bash

set -e

cd "$(dirname "$0")"

source ~/ai-tools/.venv/bin/activate

export OLLAMA_API_BASE=http://127.0.0.1:11434

echo ""
echo "========================================="
echo " Eyan AI Platform - Review Mode"
echo "========================================="
echo ""
echo "Rules:"
echo "  • AGENTS.md is loaded read-only."
echo "  • No project files are editable."
echo "  • Use /read to inspect files."
echo "  • Use /add only if you intentionally"
echo "    want a file to become editable."
echo ""

aider \
  -c .aider.conf.yml \
  --read AGENTS.md
