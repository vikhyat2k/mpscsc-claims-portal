@echo off
echo ======================================================
echo   Starting MPSCSC Claims Portal
echo ======================================================
echo Synchronizing PROJECT_DOCS.md...
node scripts/sync_docs.js

start "MPSCSC Backend" cmd /k "cd server && node index.js"
timeout /t 2 /nobreak
start "MPSCSC Frontend" cmd /k "cd client && npm run dev"
echo System Started. Access at http://localhost:5173
pause
