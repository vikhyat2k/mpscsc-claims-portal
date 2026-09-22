@echo off
setlocal
echo Packaging project for transfer...

rem Simple timestamp
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set timestamp=%datetime:~0,8%_%datetime:~8,4%

rem Define the output zip file name
set zipFile=mpscsc-claims-portal_backup_%timestamp%.zip

rem Try using standard tar command (available on Windows 10/11)
echo creating backup %zipFile%...
tar -a -c -f "%zipFile%" --exclude "node_modules" --exclude ".git" --exclude ".gemini" --exclude "*.zip" --exclude "backups" *

if %ERRORLEVEL% EQU 0 (
    echo.
    echo ========================================================
    echo Backup created successfully: %zipFile%
    echo.
    echo To transfer to another computer:
    echo 1. Copy this ZIP file to the new computer.
    echo 2. Extract it.
    echo 3. Install Node.js on the new computer.
    echo 4. Open the extracted folder in a terminal.
    echo 5. Run 'install_dependencies.bat'.
    echo 6. Run 'run_portal.bat'.
    echo ========================================================
) else (
    echo.
    echo Tool 'tar' failed or not found. Falling back to PowerShell...
    powershell -command "Get-ChildItem -Path . -Exclude 'node_modules','.git','.gemini','%zipFile%','backups' | Compress-Archive -DestinationPath '%zipFile%' -Force"
    
    if %ERRORLEVEL% EQU 0 (
        echo Backup created successfully with PowerShell.
    ) else (
        echo Backup failed. Please check permissions or install 7-Zip.
    )
)

pause
endlocal
