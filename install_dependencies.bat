@echo off
echo Installing dependencies...
echo.
echo This may take a few minutes depending on your internet connection.
echo.

cd server
call npm install
cd ..

cd client
call npm install
cd ..

echo.
echo Dependencies installed successfully!
echo You can now run 'run_portal.bat' to start the application.
pause
