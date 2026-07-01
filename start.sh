#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
URL_FILE="$DIR/public-url.txt"

cleanup() {
  kill $NODE_PID 2>/dev/null
  kill $CLOUD_PID 2>/dev/null
  exit 0
}
trap cleanup SIGTERM SIGINT SIGHUP

node server.js &
NODE_PID=$!

sleep 2

cloudflared tunnel --url http://localhost:3000 &
CLOUD_PID=$!

# Monitor cloudflared output for the URL by reading its stderr directly
sleep 8
CLOUD_LOG=$(journalctl --user -u mysite.service -n 50 --no-pager 2>/dev/null || true)
URL=$(echo "$CLOUD_LOG" | grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' | tail -1)
if [ -n "$URL" ]; then
  echo "$URL" > "$URL_FILE"
  echo ""
  echo "======================================"
  echo "  YOUR SITE IS LIVE AT:"
  echo "  $URL"
  echo "======================================"
  echo ""
fi

wait $NODE_PID $CLOUD_PID
