#!/bin/bash
# ─── 编译 Windows 可执行文件 ────────────────────────────────────────────
# 运行此脚本将生成 rc-server.exe 和 rc-client.exe
# 
# 前置要求:
#   - 安装 Bun (https://bun.sh)
#   - Windows 系统可直接运行，Linux/Mac 交叉编译也可以
#
# 用法:
#   chmod +x build.sh
#   ./build.sh

set -e

echo "╔═══════════════════════════════════════════════════╗"
echo "║       RC-Server/Client Windows 编译脚本           ║"
echo "╚═══════════════════════════════════════════════════╝"
echo ""

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
OUTPUT_DIR="$PROJECT_DIR/public/downloads"

mkdir -p "$OUTPUT_DIR"

echo "[1/2] 编译 rc-server.exe ..."
cd "$SCRIPT_DIR/rc-server"
bun build --compile --target=bun-windows-x64 --outfile="$OUTPUT_DIR/rc-server.exe" index.ts
echo "  ✓ rc-server.exe 已生成"

echo "[2/2] 编译 rc-client.exe ..."
cd "$SCRIPT_DIR/rc-client"
bun build --compile --target=bun-windows-x64 --outfile="$OUTPUT_DIR/rc-client.exe" index.ts
echo "  ✓ rc-client.exe 已生成"

echo ""
echo "═══════════════════════════════════════════════════"
echo "  编译完成！文件位于:"
echo "  - $OUTPUT_DIR/rc-server.exe"
echo "  - $OUTPUT_DIR/rc-client.exe"
echo ""
ls -lh "$OUTPUT_DIR"/*.exe
echo "═══════════════════════════════════════════════════"
