#!/usr/bin/env bash
# ──────────────────────────────────────────────
#  Quant Dashboard — One-Click Launcher (macOS / Linux)
#  Auto-installs dependencies & starts all services
# ──────────────────────────────────────────────

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo -e "${BOLD}================================================${NC}"
echo -e "${BOLD}   Quant Dashboard — 个人量化盯盘系统${NC}"
echo -e "${BOLD}================================================${NC}"
echo ""

# ── Check Node.js ──
if ! command -v node &> /dev/null; then
    echo -e "${RED}[ERROR] 未找到 Node.js，请先安装 Node.js (>=18)${NC}"
    echo "         下载地址: https://nodejs.org"
    exit 1
fi
echo -e "${GREEN}[OK]${NC} Node.js $(node -v)"
echo -e "${GREEN}[OK]${NC} npm $(npm -v)"

# ── Install server dependencies ──
cd "$SCRIPT_DIR/server"
echo ""
echo -e "${YELLOW}[1/3]${NC} 安装后端依赖..."
npm install --silent
echo -e "${GREEN}[OK]${NC} 后端依赖安装完成"

# ── Install client dependencies ──
cd "$SCRIPT_DIR/client"
echo ""
echo -e "${YELLOW}[2/3]${NC} 安装前端依赖..."
npm install --silent
echo -e "${GREEN}[OK]${NC} 前端依赖安装完成"

# ── Start services ──
cd "$SCRIPT_DIR"
echo ""
echo -e "${YELLOW}[3/3]${NC} 启动服务..."
echo ""
echo -e "${BOLD}================================================${NC}"
echo "   后端 API:     http://localhost:3001"
echo "   WebSocket:    http://localhost:3002/realtime"
echo "   前端界面:     http://localhost:5173"
echo -e "${BOLD}================================================${NC}"
echo ""

# Start backend in background
cd "$SCRIPT_DIR/server"
node app.js &
SERVER_PID=$!

# Start frontend in background
cd "$SCRIPT_DIR/client"
npx vite --host 0.0.0.0 &
CLIENT_PID=$!

# Wait for services to be ready
sleep 3

# Try to open browser
if command -v xdg-open &> /dev/null; then
    xdg-open http://localhost:5173
elif command -v open &> /dev/null; then
    open http://localhost:5173
fi

echo ""
echo -e "${BOLD}================================================${NC}"
echo "  系统已启动!"
echo "  后端 PID: $SERVER_PID   前端 PID: $CLIENT_PID"
echo "  按 Ctrl+C 停止所有服务"
echo -e "${BOLD}================================================${NC}"
echo ""

# Trap Ctrl+C to stop both services
trap "kill $SERVER_PID $CLIENT_PID 2>/dev/null; echo '服务已停止'; exit 0" INT TERM

# Wait for either process to exit
wait
