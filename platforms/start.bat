@echo off
setlocal

REM URL to open
set "URL=https://tripshred.com/crazeoh/#/crazeoh"

REM Microsoft Edge (Chromium) App Mode
if exist "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" (
    start "" "%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe" --app="%URL%"
    goto :EOF
)

REM Google Chrome 64-bit
if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome\Application\chrome.exe" --app="%URL%"
    goto :EOF
)

REM Google Chrome 32-bit
if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" --app="%URL%"
    goto :EOF
)

REM Google Chrome Dev
if exist "%ProgramFiles(x86)%\Google\Chrome Dev\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Google\Chrome Dev\Application\chrome.exe" --app="%URL%"
    goto :EOF
)
if exist "%ProgramFiles%\Google\Chrome Dev\Application\chrome.exe" (
    start "" "%ProgramFiles%\Google\Chrome Dev\Application\chrome.exe" --app="%URL%"
    goto :EOF
)

REM Google Chrome Canary
if exist "%LocalAppData%\Google\Chrome SxS\Application\chrome.exe" (
    start "" "%LocalAppData%\Google\Chrome SxS\Application\chrome.exe" --app="%URL%"
    goto :EOF
)

REM Chromium
if exist "%LocalAppData%\Chromium\Application\chrome.exe" (
    start "" "%LocalAppData%\Chromium\Application\chrome.exe" --app="%URL%"
    goto :EOF
)
if exist "%ProgramFiles(x86)%\Chromium\Application\chrome.exe" (
    start "" "%ProgramFiles(x86)%\Chromium\Application\chrome.exe" --app="%URL%"
    goto :EOF
)
if exist "%ProgramFiles%\Chromium\Application\chrome.exe" (
    start "" "%ProgramFiles%\Chromium\Application\chrome.exe" --app="%URL%"
    goto :EOF
)

REM Brave App Mode
if exist "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" (
    start "" "%ProgramFiles%\BraveSoftware\Brave-Browser\Application\brave.exe" --app="%URL%"
    goto :EOF
)

REM Vivaldi App Mode
if exist "%LOCALAPPDATA%\Vivaldi\Application\vivaldi.exe" (
    start "" "%LOCALAPPDATA%\Vivaldi\Application\vivaldi.exe" --app="%URL%"
    goto :EOF
)
if exist "%ProgramFiles%\Vivaldi\Application\vivaldi.exe" (
    start "" "%ProgramFiles%\Vivaldi\Application\vivaldi.exe" --app="%URL%"
    goto :EOF
)

REM Firefox Developer Edition (Site-Specific Browser)
if exist "%ProgramFiles%\Firefox Developer Edition\firefox.exe" (
    start "" "%ProgramFiles%\Firefox Developer Edition\firefox.exe" --kiosk --private-window "%URL%"
    goto :EOF
)
if exist "%ProgramFiles(x86)%\Firefox Developer Edition\firefox.exe" (
    start "" "%ProgramFiles(x86)%\Firefox Developer Edition\firefox.exe" --kiosk --private-window "%URL%"
    goto :EOF
)

REM Firefox Stable (Site-Specific Browser)
if exist "%ProgramFiles%\Mozilla Firefox\firefox.exe" (
    start "" "%ProgramFiles%\Mozilla Firefox\firefox.exe" --kiosk --private-window "%URL%"
    goto :EOF
)
if exist "%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe" (
    start "" "%ProgramFiles(x86)%\Mozilla Firefox\firefox.exe" --kiosk --private-window "%URL%"
    goto :EOF
)

echo No supported browser found.
pause
endlocal
