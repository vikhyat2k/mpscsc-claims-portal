@echo off
REM ===================================================
REM MPSCSC Claims Portal - Database Backup Script
REM ===================================================
REM This script creates a timestamped backup of your
REM database files for safekeeping.
REM ===================================================

echo.
echo ========================================
echo  MPSCSC Claims Portal - Database Backup
echo ========================================
echo.

REM Create backups folder if it doesn't exist
if not exist "backups" (
    mkdir "backups"
    echo [INFO] Created backups directory
)

REM Generate timestamp for backup filename
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%-%datetime:~12,2%

echo Creating backup with timestamp: %timestamp%
echo.

REM Backup server database
if exist "server\claims.db" (
    copy "server\claims.db" "backups\claims_%timestamp%.db" >nul
    if exist "backups\claims_%timestamp%.db" (
        echo [OK] Backed up: server\claims.db
        echo     Saved to: backups\claims_%timestamp%.db
    ) else (
        echo [ERROR] Failed to backup: server\claims.db
    )
) else (
    echo [INFO] No database found at: server\claims.db
)

echo.
echo ========================================
echo  Backup Complete!
echo ========================================
echo.
echo Your database has been backed up to:
echo   backups\claims_%timestamp%.db
echo.
echo You can restore this backup by copying it
echo back to server\claims.db when needed.
echo.
pause
