@echo off
cd /d C:\Users\H\Project\Flow-platform
echo === Pulling latest ===
git pull --rebase origin main
echo === Pushing local changes ===
git add -A
git diff-index --quiet HEAD || git commit -m "Vault sync %date% %time%"
git push origin main
echo === Done ===
pause
