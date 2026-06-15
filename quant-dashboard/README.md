# Quant Dashboard — 个人量化盯盘系统

深色科技风格的全栈量化监控仪表盘，9 张实时数据卡片覆盖资产总览、实时波动、风险评估、历史收益等维度。前后端分离架构，支持一键本地部署。

![screenshot](layout-test.png)

---

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React 18 + Vite 5 |
| UI 样式 | Tailwind CSS v3 |
| 图表库 | ECharts 5.4 + echarts-for-react |
| 图标 | Font Awesome 6 |
| 后端 | Node.js + Express.js |
| 数据库 | SQLite (sql.js WASM) |
| 实时通信 | Socket.IO 4（双端口 3001 + 3002） |
| 代码规范 | ESLint |

---

## 环境要求

- **Node.js** >= 18（推荐 20 LTS）
- **npm** >= 9
- Windows / macOS / Linux

---

## 一键启动

### Windows

双击项目根目录的 `start.bat`，脚本会自动：

1. 检测 Node.js 是否安装
2. 安装后端 + 前端依赖
3. 分别启动后端 (3001) 和前端 (5173)
4. 自动打开浏览器访问 `http://localhost:5173`

### macOS / Linux

```bash
chmod +x start.sh
./start.sh
```

关闭终端窗口即停止所有服务。

---

## 手动部署

### 1. 启动后端

```bash
cd server
npm install
node app.js
```

后端启动后：
- REST API: `http://localhost:3001`
- WebSocket: `http://localhost:3002/realtime`

### 2. 启动前端（开发模式）

```bash
cd client
npm install
npm run dev
```

前端启动后：`http://localhost:5173`

Vite 开发服务器会自动代理 `/api` 请求，但本项目前端直接通过 CORS 连接 `localhost:3001`。

---

## 项目结构

```
quant-dashboard/
├── client/                        # 前端 (React + Vite)
│   ├── public/                    # 静态资源
│   ├── src/
│   │   ├── components/            # 9 张卡片 + 布局组件
│   │   │   ├── AssetOverview.jsx       # 卡1：资产总览（折线图）
│   │   │   ├── VolatilityMonitor.jsx   # 卡2：实时波动（紫色折线）
│   │   │   ├── RealtimeMonitor.jsx     # 卡3：实时监控（环形图+指标）
│   │   │   ├── VolumeMonitor.jsx       # 卡4：成交量（柱状图）
│   │   │   ├── HistoricalReturns.jsx   # 卡5：历史收益（分组柱）
│   │   │   ├── RiskAssessment.jsx      # 卡6：风险评估（K线+MA5）
│   │   │   ├── ReturnComparison.jsx    # 卡7：收益对比（双线）
│   │   │   ├── RiskMetrics.jsx         # 卡8：回撤/波动率
│   │   │   ├── AssetRisk.jsx           # 卡9：资产风险（分组柱）
│   │   │   ├── Card.jsx                # 通用卡片容器
│   │   │   ├── Sidebar.jsx             # 侧边导航栏
│   │   │   └── TitleBar.jsx            # 顶部标题栏
│   │   ├── hooks/                 # 自定义 Hooks
│   │   │   ├── useApiData.js           # REST API 数据获取
│   │   │   └── useWebSocket.js         # WebSocket 实时连接
│   │   ├── services/              # 服务层
│   │   │   ├── api.js                  # 14 个 REST API 封装
│   │   │   └── socket.js              # WebSocket 双通道客户端
│   │   ├── App.jsx                # 根组件（数据编排）
│   │   ├── main.jsx               # 入口
│   │   └── index.css              # 全局样式 + Tailwind
│   ├── index.html
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── package.json
├── server/                        # 后端 (Express + SQLite)
│   ├── db/                       # SQLite 数据库文件（自动生成）
│   ├── controllers/              # 控制器
│   │   ├── assetController.js         # 资产总览
│   │   ├── marketController.js        # 实时行情 + 历史
│   │   ├── riskController.js          # 风险评估
│   │   ├── portfolioController.js     # 持仓管理
│   │   └── alertController.js         # 涨跌提醒 CRUD
│   ├── models/
│   │   └── index.js                   # 统一数据模型（6 张表）
│   ├── routes/
│   │   ├── asset.js                   # /api/asset/*
│   │   ├── market.js                  # /api/market/*
│   │   ├── stock.js                   # /api/stock/*
│   │   ├── risk.js                    # /api/risk/*
│   │   ├── portfolio.js              # /api/portfolio/*
│   │   └── alert.js                   # /api/alert/*
│   ├── services/
│   │   ├── simulator.js               # WebSocket 实时模拟推送
│   │   ├── socketService.js           # 广播辅助
│   │   └── mockData.js                # 全部模拟数据生成器
│   ├── utils/
│   │   ├── initDb.js                  # 数据库初始化 + prepare/run
│   │   ├── cache.js                   # 内存缓存（TTL）
│   │   └── response.js                # 统一响应格式
│   ├── app.js                     # 入口（双服务器）
│   └── package.json
├── start.bat                      # Windows 一键启动
├── start.sh                       # macOS/Linux 一键启动
├── .gitignore
└── README.md
```

---

## API 接口

所有接口返回统一格式 `{ code: 0, data: {...}, ts: timestamp }`。错误时 `code: -1` + `error` 字段。

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查（含 uptime） |
| GET | `/api/asset/overview` | 30 日资产趋势 + 总额/涨幅 |
| GET | `/api/market/realtime` | 盘中实时价格序列 + OHLCV |
| GET | `/api/market/history` | 24 小时成交量柱状数据 |
| GET | `/api/market/index` | 大盘指数列表 |
| GET | `/api/market/sectors` | 板块热度 |
| GET | `/api/risk/assessment` | 风险评估综合数据（K线+指标+快照+收益） |
| GET | `/api/portfolio/holdings` | 持仓列表 + 总市值/总盈亏 |
| GET | `/api/stock/watchlist` | 自选股列表 |
| POST | `/api/stock/watchlist` | 添加自选股 |
| GET | `/api/alert/list` | 提醒列表 |
| POST | `/api/alert/set` | 创建提醒 |
| PATCH | `/api/alert/:id` | 更新提醒 |
| DELETE | `/api/alert/:id` | 删除提醒 |

### WebSocket 事件

| 事件 | 方向 | 端口 | 说明 |
|------|------|------|------|
| `subscribe` | Client → Server | 3001 / 3002 | 订阅股票代码 |
| `market:tick` | Server → Client | 3001 | 每 3 秒推送 6 只标的实时行情 |
| `dashboard:snapshot` | Server → Client | 3002 | 风险快照（约每秒 1 次） |

---

## 数据库

系统使用 SQLite（sql.js WASM 实现），数据库文件自动创建在 `server/db/quant.db`。

### 数据表

| 表名 | 说明 |
|------|------|
| `users` | 用户信息（默认管理员 admin/admin123） |
| `stocks` | 股票基础信息 |
| `watchlist` | 自选股列表 |
| `market_snapshot` | 行情快照缓存 |
| `holdings` | 持仓数据（首次访问自动种子 5 只示例） |
| `transactions` | 交易记录 |
| `alerts` | 涨跌提醒设置 |
| `system_config` | 系统配置键值对（数据源、推送间隔等） |

---

## 替换为真实数据源

系统当前以模拟数据运行。要接入真实行情，按以下步骤操作：

### 1. REST API 替换

编辑 `server/services/mockData.js`，每个函数内均有注释标注真实 API 接入位置。例如：

```js
// 当前：模拟数据
export function mockRealtime() { ... }

// 替换为：东方财富实时行情
// const resp = await fetch('http://push2.eastmoney.com/api/qt/stock/get?...')
// 将响应转换为 { times, prices, volume, high, low, open, prevClose, change }
```

### 2. WebSocket 实时推送替换

编辑 `server/services/simulator.js`，将 `setInterval` 内的模拟逻辑替换为真实数据源 WebSocket 订阅：

```js
// 东方财富 WebSocket
const ws = new WebSocket('ws://...');
ws.on('message', (data) => {
  const parsed = parseEastMoney(data);
  io.emit('market:tick', parsed);
});
```

### 3. 常见数据源

| 数据源 | 接入方式 | 备注 |
|--------|----------|------|
| [东方财富](https://www.eastmoney.com) | HTTP / WebSocket | 免费，无需注册 |
| [Tushare](https://tushare.pro) | HTTP API + SDK | 需注册获取 Token |
| [Sina 新浪财经](http://hq.sinajs.cn) | HTTP | 免费，格式简单 |
| [AKShare](https://akshare.akfamily.xyz) | Python | 需通过子进程桥接 |

### 4. 切换数据源模式

数据库 `system_config` 表中的 `data_source` 键控制模式：

- `mock` — 模拟数据（默认）
- `eastmoney` — 东方财富
- `tushare` — Tushare

通过 API 切换：

```bash
# 暂无专用接口，直接修改 SQLite 或通过代码切换
```

---

## 打包部署

### 生产环境部署

**第一步：构建前端静态文件**

```bash
cd client
npm run build
```

生成文件位于 `client/dist/`，包含 `index.html` 和优化后的 JS/CSS。

**第二步：配置后端托管静态文件**

编辑 `server/app.js`，在 `app.use(express.json())` 之后添加：

```js
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, '..', 'client', 'dist')));

// SPA fallback — 所有非 API 路由返回 index.html
app.get(/^(?!\/api).*/, (_req, res) => {
  res.sendFile(join(__dirname, '..', 'client', 'dist', 'index.html'));
});
```

**第三步：启动生产服务**

```bash
cd server
NODE_ENV=production node app.js
```

此时访问 `http://localhost:3001` 即可看到完整系统。

### Docker 部署（可选）

```dockerfile
# Dockerfile（项目根目录）
FROM node:20-alpine
WORKDIR /app

COPY server/package*.json ./server/
RUN cd server && npm ci --production

COPY client/package*.json ./client/
RUN cd client && npm ci && npm run build

COPY . .

EXPOSE 3001 3002
CMD ["node", "server/app.js"]
```

---

## 常见问题

**Q: 启动后浏览器一片空白？**  
A: 确认后端已成功启动（控制台显示 `[server] API running at http://localhost:3001`），然后刷新前端页面。检查浏览器控制台是否有 CORS 错误。

**Q: 图表不显示 / 数据为 0？**  
A: 检查后端是否在运行。打开 `http://localhost:3001/api/health` 确认 API 正常。查看浏览器 Network 面板中 API 请求的响应。

**Q: WebSocket 连接失败？**  
A: 检查防火墙是否阻止了 3001 和 3002 端口。确认后端两个端口均已启动。

**Q: 如何修改模拟数据？**  
A: 编辑 `server/services/mockData.js` 中的对应函数。修改后重启后端即可生效。

**Q: 如何清空数据库重新开始？**  
A: 删除 `server/db/quant.db` 文件，重启后端会自动重建并种子数据。

**Q: 端口被占用怎么办？**  
A: 修改 `server/app.js` 中的 `API_PORT` 和 `WS_PORT` 常量，以及前端 `client/src/services/api.js` 和 `socket.js` 中的端口号。

---

## License

MIT
