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
- `AI_PROVIDER`
- `AI_API_BASE_URL`
- `AI_API_KEY`
- `ARK_API_KEY`
- `AI_MODEL_ANALYZE`
- `ARK_MODEL`
- `ARK_MODEL_ANALYZE`

## 路由注册约定

所有路由模块放在 `server/route/modules/` 下，再由 `server/route/index.ts` 统一注册给 `server/main.ts`。

## 数据库策略

当前骨架按 PostgreSQL 作为长期主库进行规划。本轮只预留数据库配置与接入层，不创建业务表，也不接入 ORM。

## AI 接入说明

- AI 能力通过 `server/lib/ai/` 下的 provider 抽象层接入。
- 当前支持的配置模式为：
  - `AI_PROVIDER=unconfigured`
  - `AI_PROVIDER=openai-compatible`
  - `AI_PROVIDER=volcengine-ark`
- 如果未配置 AI 服务，任务接口仍可创建任务，但任务会在处理阶段返回明确失败原因，方便前端提示用户补齐配置。
- 火山方舟模式兼容 OpenAI 风格接口，默认 `base_url` 为 `https://ark.cn-beijing.volces.com/api/v3`。
- 火山方舟模式优先读取 `ARK_API_KEY`，也兼容 `AI_API_KEY`。
- 模型 ID 建议通过 `AI_MODEL_ANALYZE` 配置；如果你想共用一个模型，也可只填写 `ARK_MODEL`。

## 异步任务接口

- `POST /api/ai-tasks/analyze`：创建 AI 识别任务
- `GET /api/ai-tasks/:taskId`：查询 AI 识别任务状态

## 前端服务层约定

- 前端统一通过 `src/utils/http.ts` 发起请求。
- 服务封装位于 `src/services/*`。
- 每个服务文件均采用 `class ServiceName {}` + `export default new ServiceName()` 形式。
- 当前约定优先只使用 `get` 和 `post`。
