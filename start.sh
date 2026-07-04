#!/bin/bash
DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"
URL_FILE="$DIR/public-url.txt"
TUNNEL_LOG="$DIR/tunnel.log"

cleanup() {
  kill $NODE_PID 2>/dev/null
  kill $CLOUD_PID 2>/dev/null
  exit 0
}
trap cleanup SIGTERM SIGINT SIGHUP

node server.js &
NODE_PID=$!

sleep 2

cloudflared tunnel --url http://localhost:3000 > "$TUNNEL_LOG" 2>&1 &
CLOUD_PID=$!

sleep 8

URL=$(grep -oP 'https://[a-zA-Z0-9-]+\.trycloudflare\.com' "$TUNNEL_LOG" | tail -1)
if [ -n "$URL" ]; then
  echo "$URL" > "$URL_FILE"
  echo ""
  echo "======================================"
  echo "  YOUR SITE IS LIVE AT:"
  echo "  $URL"
  echo "  (saved to $URL_FILE)"
  echo "======================================"
  echo ""
fi

wait $NODE_PID $CLOUD_PID
