@echo off
echo Starting MPSCSC Claims Portal...
start "MPSCSC Backend" cmd /k "cd server && node index.js"
timeout /t 2 /nobreak
start "MPSCSC Frontend" cmd /k "cd client && npm run dev"
echo System Started. Access at http://localhost:5173
pause
