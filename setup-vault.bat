@echo off
REM Run this from C:\Users\H\Project\Flow-platform
REM Creates .gitkeep in empty vault folders so Git tracks them

cd /d C:\Users\H\Project\Flow-platform

REM Create all vault folders
mkdir 00-inbox 2>nul
mkdir 01-product 2>nul
mkdir 02-features 2>nul
mkdir 03-architecture\code-registry 2>nul
mkdir 03-architecture\adr 2>nul
mkdir 03-architecture\schemas 2>nul
mkdir 03-architecture\api 2>nul
mkdir 04-engineering\phases 2>nul
mkdir 04-engineering\sprints 2>nul
mkdir 04-engineering\agents 2>nul
mkdir 05-bugs\active 2>nul
mkdir 05-bugs\resolved 2>nul
mkdir 05-bugs\patterns 2>nul
mkdir 06-design\components 2>nul
mkdir 06-design\reviews 2>nul
mkdir 07-security\audits 2>nul
mkdir 08-releases 2>nul
mkdir 09-decisions 2>nul
mkdir 10-sync 2>nul
mkdir 11-cost-tracking 2>nul
mkdir 12-session-resume 2>nul
mkdir templates 2>nul

REM Add .gitkeep to empty folders
for %%d in (00-inbox 01-product 02-features 03-architecture\schemas 03-architecture\api 04-engineering\phases 04-engineering\sprints 04-engineering\agents 05-bugs\active 05-bugs\resolved 05-bugs\patterns 06-design\components 06-design\reviews 07-security\audits 08-releases 09-decisions 12-session-resume) do (
    if not exist "%%d\.gitkeep" echo. > "%%d\.gitkeep"
)

echo Vault folders created with .gitkeep files.
pause
