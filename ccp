#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
while true; do
  node "$DIR/server/src/index.js"
  EXIT_CODE=$?
  if [ $EXIT_CODE -eq 42 ]; then
    echo "🔄 Restarting Claude Code Proxy (CCP) server..."
  else
    exit $EXIT_CODE
  fi
done
