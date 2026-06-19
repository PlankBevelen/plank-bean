# 后端骨架说明

## 目录

- `server/main.ts`：服务入口，只负责启动与统一注册
- `server/app.ts`：Koa 应用初始化
- `server/route/index.ts`：统一挂载所有路由模块
- `server/route/modules/`：具体路由模块
- `server/controller/`：控制器层
- `server/service/`：服务层
- `server/middleware/`：中间件层
- `server/config/`：环境变量与配置解析
- `server/lib/`：基础库与第三方能力接入层
- `server/types/`：服务端类型
- `server/utils/`：响应与日志等工具

## 开发命令

- 启动前端：`npm run dev`
- 启动后端：`npm run server:dev`
- 服务端类型检查：`npm run server:typecheck`

## 环境变量

复制 `.env.example` 为 `.env` 后再启动后端，关键变量包括：

- `SERVER_HOST`
- `SERVER_PORT`
- `SERVER_PREFIX`
- `CORS_ORIGIN`
- `DATABASE_URL`

## 路由注册约定

所有路由模块放在 `server/route/modules/` 下，再由 `server/route/index.ts` 统一注册给 `server/main.ts`。

## 数据库策略

当前骨架按 PostgreSQL 作为长期主库进行规划。本轮只预留数据库配置与接入层，不创建业务表，也不接入 ORM。
