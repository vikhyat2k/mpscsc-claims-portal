@echo off
REM ===================================================
REM MPSCSC Claims Portal - Database Reset Script
REM ===================================================
REM This script stops the backend server if running
REM and deletes database files to reset the app.
REM ===================================================

echo.
echo ========================================
echo  MPSCSC Claims Portal - Database Reset
echo ========================================
echo.
echo ************************************************
echo *                                              *
echo *   WARNING: PERMANENT DATA LOSS AHEAD!       *
echo *                                              *
echo ************************************************
echo.
echo This will PERMANENTLY DELETE:
echo   - ALL employees
echo   - ALL claims (TA/DA, Transfer, Medical)
echo   - ALL journey details
echo   - ALL medical bills
echo   - EVERYTHING in the database
echo.
echo Database files to be deleted:
echo   - claims.db (root folder)
echo   - server\claims.db
echo.
echo ================================================
echo RECOMMENDATION: Run backup_database.bat first!
echo ================================================
echo.

REM Prompt for confirmation
set /p confirm="Type 'DELETE' to confirm permanent data loss: "

if /i "%confirm%"=="DELETE" goto proceed

echo.
echo Database reset cancelled. Your data is safe.
echo.
pause
exit /b 0

:proceed
echo.
echo Stopping backend server (port 5000)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5000 ^| findstr LISTENING') do (
    echo [INFO] Killing process ID: %%a
    taskkill /F /PID %%a 2>nul
)

echo.
echo Proceeding with database reset...
echo.

REM Delete database file in root folder
if exist "claims.db" (
    attrib -r -s -h "claims.db" 2>nul
    del /f /q "claims.db"
    if exist "claims.db" (
        echo [ERROR] Failed to delete: claims.db (File still in use)
    ) else (
        echo [OK] Deleted: claims.db
    )
) else (
    echo [INFO] Not found: claims.db
)

REM Delete database file in server folder
if exist "server\claims.db" (
    attrib -r -s -h "server\claims.db" 2>nul
    del /f /q "server\claims.db"
    if exist "server\claims.db" (
        echo [ERROR] Failed to delete: server\claims.db (File still in use)
    ) else (
        echo [OK] Deleted: server\claims.db
    )
) else (
    echo [INFO] Not found: server\claims.db
)

echo.
echo ========================================
echo  Database Reset Complete!
echo ========================================
echo.
echo All database files have been deleted.
echo The application will create new empty
echo databases on next startup.
echo.
pause
