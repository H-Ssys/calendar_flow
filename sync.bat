@echo off
cd /d C:\Users\H\Project\Flow-platform
git pull --rebase origin main
git add -A
git diff-index --quiet HEAD || git commit -m "Vault sync %date% %time%"
git push origin main
pause