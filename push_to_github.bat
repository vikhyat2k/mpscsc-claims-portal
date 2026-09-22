@echo off
echo ======================================================
echo   Pushing MPSCSC Claims Portal to GitHub
echo   Repository: https://github.com/vikhyat2k/mpscsc-claims-portal
echo ======================================================
echo.

git push origin main

if %ERRORLEVEL% equ 0 (
    echo.
    echo ======================================================
    echo   [SUCCESS] GitHub repository is now fully up to date!
    echo ======================================================
) else (
    echo.
    echo ======================================================
    echo   [ACTION NEEDED] Authentication required.
    echo   Please sign in using the GitHub prompt or token.
    echo   Once authenticated, future pushes will happen automatically!
    echo ======================================================
)

echo.
pause
