@echo off
REM ─── 编译 Windows 可执行文件 ────────────────────────────────────────────
REM 运行此脚本将生成 rc-server.exe 和 rc-client.exe
REM 前置要求: 安装 Bun (https://bun.sh)

echo ===================================================
echo        RC-Server/Client Windows 编译脚本
echo ===================================================
echo.

set SCRIPT_DIR=%~dp0
set PROJECT_DIR=%SCRIPT_DIR%..
set OUTPUT_DIR=%PROJECT_DIR%\public\downloads

if not exist "%OUTPUT_DIR%" mkdir "%OUTPUT_DIR%"

echo [1/2] 编译 rc-server.exe ...
cd /d "%SCRIPT_DIR%rc-server"
bun build --compile --target=bun-windows-x64 --outfile="%OUTPUT_DIR%\rc-server.exe" index.ts
echo   √ rc-server.exe 已生成

echo [2/2] 编译 rc-client.exe ...
cd /d "%SCRIPT_DIR%rc-client"
bun build --compile --target=bun-windows-x64 --outfile="%OUTPUT_DIR%\rc-client.exe" index.ts
echo   √ rc-client.exe 已生成

echo.
echo ===================================================
echo   编译完成！文件位于:
echo   - %OUTPUT_DIR%\rc-server.exe
echo   - %OUTPUT_DIR%\rc-client.exe
echo ===================================================
echo.

dir "%OUTPUT_DIR%\*.exe"

cd /d "%PROJECT_DIR%"
pause
