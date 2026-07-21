#!/bin/bash

set -e

cd "$(dirname "$0")"

source ~/ai-tools/.venv/bin/activate

export OLLAMA_API_BASE=http://127.0.0.1:11434

echo ""
echo "=========================================="
echo "   Eyan AI Platform - Architect Mode"
echo "=========================================="
echo ""
echo "Workflow:"
echo "  1. Think"
echo "  2. Plan"
echo "  3. Ask for approval"
echo "  4. Edit"
echo "  5. Show diff"
echo ""

aider \
    -c .aider.conf.yml \
    --architect \
    --read AGENTS.md
