#!/bin/bash
set -e
cd /home/flow/calendar-main
echo "→ Pulling latest..."
git pull
echo "→ Building..."
npx vite build
echo "→ Deploying..."
cp -r dist/* /root/flow-dist/
docker cp /root/flow-dist/. calendar_flow:/usr/share/nginx/html/
docker exec calendar_flow nginx -s reload
STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://app.187.77.154.212.sslip.io)
echo "→ Deploy complete. Status: $STATUS"
