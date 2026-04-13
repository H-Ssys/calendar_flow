@echo off
cd /d C:\Users\quang\Projects\Flow-platform
git add -A
set /p MSG="Commit message: "
git commit -m "%MSG%"
git push
echo.
echo Done. Now deploy with:
echo   ssh root@187.77.154.212 "/home/flow/calendar-main/scripts/deploy.sh"
pause