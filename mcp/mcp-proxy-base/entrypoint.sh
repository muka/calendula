#!/bin/bash
echo "Starting mcp-proxy on http://0.0.0.0:${PORT}${ENDPOINT} with command '${COMMAND}'"
npx -y mcp-proxy --port $PORT --endpoint $ENDPOINT $COMMAND