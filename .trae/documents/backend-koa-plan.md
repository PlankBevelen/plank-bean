## 概要

本次改造目标是为当前纯前端的 `plank-bean` 单仓项目接入一套后端基础骨架，采用 `Node.js + Koa + TypeScript`，以 `nodemon + tsx` 作为开发启动链路，服务端入口固定为 `server/main.ts`，路由通过 `server/route/index.ts` 统一注册。数据库不在本轮真正落地业务表和业务接口，但整体架构按 `PostgreSQL` 作为长期主库进行规划，同时兼顾开发环境与未来生产环境的配置分层。

本轮已确认的范围与决策：
- 只做后端基础骨架，不做首批业务接口。
- 后端采用 `Node + Koa`。
- 开发启动采用 `nodemon + tsx`。
- 服务端入口为 `server/main.ts`。
- 路由统一通过 `server/route/index.ts` 注册。
- 数据库策略按 `PostgreSQL` 主库规划，但本轮不强制真正接入业务数据模型。
- 配置范围同时考虑 `开发 + 生产`。

## 当前状态分析

### 当前仓库结构

- 当前仓库是一个纯前端 Vite + React + TypeScript 项目，核心目录为 `src/`，没有现成后端目录，也没有任何 `server/` 相关文件。
- 根目录已有：
  - `package.json`
  - `vite.config.ts`
  - `tsconfig.json`
  - `tsconfig.app.json`
  - `tsconfig.node.json`
- 当前 `package.json` 仅包含前端脚本：
  - `dev`
  - `build`
  - `lint`
  - `preview`
  - `verify:algorithm`
- 当前 `tsconfig.node.json` 只覆盖 `vite.config.ts`，并不适合直接拿来承载 Koa 服务端工程。

### 当前前后端耦合情况

- 当前前端 `src/` 下没有任何 `fetch`、`axios` 或 `/api/` 请求调用。
- 这意味着后端可以先以独立工程结构并入同仓，而不会立刻影响现有前端逻辑。
- 当前前端路由仅有页面路由 `src/router/index.ts`，未存在与服务端 API 约定绑定的代码。

### 数据库分析结论

结合“后期可能扩展拼豆社区以及个人服务”的补充信息，数据库推荐顺序如下：

#### 推荐：PostgreSQL

- 更适合后续用户体系、作品发布、收藏点赞、评论、通知、后台管理等中长期场景。
- 对 JSON 字段、索引能力、事务一致性、迁移演进和复杂查询都更友好。
- 更适合作为长期主库，不会在功能扩展到一定规模后过早遇到上限。

#### 不作为本轮主方案：SQLite

- 优点是本地起步快，但更适合“单机轻量工具”阶段。
- 如果后续明确会扩展社区和个人服务，过早采用 SQLite 只会增加一次后续主库迁移成本。

#### 本轮策略

- 本轮后端骨架按 `PostgreSQL` 主库规划目录、配置和依赖接口。
- 但本轮不强制建设业务表、ORM 模型、迁移文件和 Repository 细节。
- 重点是把后端目录、配置分层、应用启动、统一路由注册、基础中间件和数据库配置占位搭好。

## 拟议改动

### 一、建立服务端目录骨架

#### 文件与目录

- `server/main.ts`
- `server/app.ts`
- `server/route/index.ts`
- `server/route/modules/`
- `server/controller/`
- `server/service/`
- `server/middleware/`
- `server/config/`
- `server/lib/`
- `server/types/`
- `server/utils/`

#### 改动内容

- 新建 `server/` 顶层目录，所有服务端实现都收拢在这个目录下。
- 保持 `server/main.ts` 只负责：
  - 读取配置
  - 创建应用
  - 启动监听
  - 处理启动日志与致命错误
- 将 Koa 实例创建放到 `server/app.ts`，避免入口文件承担过多职责。
- 将路由统一注册收敛到 `server/route/index.ts`。
- 预留 `route/modules`、`controller`、`service`、`middleware`、`config`、`lib` 等子目录，保证后续功能扩展时不会再次大拆结构。

#### 目的

- 满足你提出的 `server/main.ts` 和 `server/route/index.ts` 统一注册要求。
- 提前建立适合社区化和个人服务扩展的后端分层骨架。

### 二、补齐 Koa 服务端运行依赖与脚本

#### 文件

- `package.json`

#### 改动内容

- 新增后端运行相关依赖，至少包括：
  - `koa`
  - `@koa/router`
  - `koa-bodyparser`
  - `koa-helmet`
  - `koa-compress`
  - `koa-cors` 或 `@koa/cors`
- 新增服务端开发依赖，至少包括：
  - `nodemon`
  - `tsx`
- 更新脚本，使前后端都能在同仓中被明确启动，例如：
  - `server:dev`
  - `server:start`
  - `server:typecheck` 或纳入统一 `build`
- 保持现有前端脚本不被破坏。

#### 目的

- 让当前项目从“只有前端 dev/build”扩展为“前后端同仓开发”。
- 用 `nodemon + tsx` 满足快速迭代和 TypeScript 直跑需求。

### 三、建立独立的服务端 TypeScript 配置

#### 文件

- `tsconfig.server.json`
- `tsconfig.json`

#### 改动内容

- 新增 `tsconfig.server.json`，专门服务于 `server/` 目录，而不是继续复用当前仅覆盖 Vite 配置的 `tsconfig.node.json`。
- 让服务端配置包含：
  - Node 环境类型
  - ESM 兼容设置
  - 针对 `server/**/*.ts` 的 `include`
- 视实现方式决定是否在根 `tsconfig.json` 中增加对 `tsconfig.server.json` 的引用。
- 保留 `tsconfig.node.json` 服务于 Vite 工具链，不和服务端职责混在一起。

#### 目的

- 避免前端 `bundler` 配置和服务端 Node 运行配置互相干扰。
- 让服务端拥有清晰、可维护、可独立检查的 TS 编译上下文。

### 四、建立配置分层与环境变量读取

#### 文件

- `server/config/env.ts`
- `server/config/index.ts`
- `.env.example`
- 视需要补充 `.env.development` / `.env.production` 约定说明

#### 改动内容

- 在 `server/config/` 下建立统一配置读取入口。
- 至少规划以下配置项：
  - `NODE_ENV`
  - `SERVER_HOST`
  - `SERVER_PORT`
  - `SERVER_PREFIX`
  - `CORS_ORIGIN`
  - `DATABASE_URL`
- 用配置层而不是在业务代码中直接读取 `process.env`。
- 输出开发/生产两套配置读取逻辑或统一解析规则。
- 提供 `.env.example` 作为环境变量模板，方便本地与生产部署对照。

#### 目的

- 满足你要求的开发与生产双环境规划。
- 为后续数据库接入和社区化能力扩展提供稳定配置入口。

### 五、建立基础中间件和统一响应结构

#### 文件

- `server/app.ts`
- `server/middleware/error-handler.ts`
- `server/middleware/request-id.ts`
- `server/middleware/not-found.ts`
- `server/utils/response.ts`

#### 改动内容

- 在 Koa 应用初始化阶段接入基础中间件：
  - 错误处理
  - 请求日志或请求 ID
  - 安全头
  - body 解析
  - 压缩
  - CORS
- 定义统一响应结构，哪怕当前只做基础接口，也要提前规范：
  - 成功响应
  - 失败响应
  - 404 响应
- 保持后续 controller 层直接复用统一响应工具。

#### 目的

- 后端从第一天起就具备基础可维护性，不只是一个裸 Koa 实例。
- 为后续 API 增长时保持响应规范一致打基础。

### 六、通过 `server/route/index.ts` 统一注册路由

#### 文件

- `server/route/index.ts`
- `server/route/modules/health.ts`

#### 改动内容

- 建立 `registerRoutes(app)` 或 `createRouter()` 形式的统一注册入口。
- 所有实际路由模块放到 `server/route/modules/` 下，再由 `server/route/index.ts` 汇总挂载。
- 本轮虽然不做业务接口，但至少保留一个基础健康检查路由模块，例如：
  - `GET /api/health`
- 统一在 `server/main.ts` 里注册，不在入口散落各类 `app.use(router.routes())`。

#### 目的

- 精确满足你指定的“route 里面放路由，通过 `server/route/index.ts` 提供给 `server/main.ts` 统一注册”。
- 让后续新增业务路由时结构天然可扩展。

### 七、预留 PostgreSQL 接入层，但不在本轮深做业务表

#### 文件

- `server/lib/database.ts`
- `server/config/index.ts`
- `server/types/database.ts`

#### 改动内容

- 本轮不做完整 ORM、迁移或数据模型，但应建立 PostgreSQL 的连接配置占位与抽象入口。
- 设计方式上优先考虑“后续易于接 ORM/Query Builder”，而不是把数据库细节直接散在业务代码中。
- 至少做到：
  - 配置项存在
  - 数据库模块目录存在
  - 对外暴露统一初始化或访问入口的接口占位
- 本轮不强制真实连库成功，避免范围扩散到数据库基础设施搭建。

#### 目的

- 让本轮骨架和你后续的社区/个人服务目标保持一致。
- 避免后续再重做目录与配置结构。

### 八、为前后端联调预留开发代理位

#### 文件

- `vite.config.ts`

#### 改动内容

- 在前端尚未真正发起 API 请求的前提下，先在 Vite 配置中预留 `/api` 代理到 Koa 服务端的能力。
- 保持该配置简单明确，不引入额外联调复杂度。

#### 目的

- 为你后续接业务接口时减少跨域和路径调整成本。
- 让同仓前后端开发体验更顺滑。

### 九、补充服务端基础说明文档

#### 文件

- `README.md` 或新增服务端说明文档

#### 改动内容

- 在文档中补充：
  - 服务端目录说明
  - 开发启动命令
  - 环境变量说明
  - 路由注册方式
  - PostgreSQL 作为长期主库的决策说明

#### 目的

- 避免后续再次只靠代码猜结构。
- 让后端骨架接手和扩展更容易。

## 具体实施步骤

1. 在根目录新增 `server/` 目录及其子目录骨架。
2. 新建 `tsconfig.server.json`，并按需要更新根 `tsconfig.json` 的引用关系。
3. 更新 `package.json`，安装并配置 Koa、nodemon、tsx 相关脚本。
4. 实现 `server/config/` 配置层与 `.env.example`。
5. 实现 `server/app.ts`、基础中间件、统一响应工具。
6. 实现 `server/route/modules/health.ts` 与 `server/route/index.ts`。
7. 实现 `server/main.ts`，通过 `server/route/index.ts` 完成统一注册与服务启动。
8. 在 `server/lib/database.ts` 中预留 PostgreSQL 接入层与配置占位。
9. 在 `vite.config.ts` 中预留开发代理。
10. 更新 README 或新增文档，说明后端启动与环境配置。
11. 运行 lint、类型检查、构建与后端启动验证，确保新骨架可运行。

## 假设与决策

- 本轮不实现业务 API，仅保留健康检查等基础接口。
- 本轮不实现用户、作品、社区等真实数据表。
- 本轮数据库策略按 PostgreSQL 主库规划，但不强制完成真实数据库部署。
- 本轮采用同仓结构，不单独拆分为 monorepo 或独立服务仓库。
- 服务端入口固定为 `server/main.ts`。
- 路由统一通过 `server/route/index.ts` 汇总后注册到应用。
- 开发环境使用 `nodemon + tsx`，优先保证本地直跑 TS 的开发体验。
- 生产环境配置只做规划与脚手架支持，不在本轮展开部署脚本或容器化。

## 验证步骤

### 静态验证

- 运行 ESLint，确认新增服务端文件与现有前端代码无新增 lint 问题。
- 运行 TypeScript 检查，确认前端与服务端 TS 配置互不冲突。

### 运行验证

- 运行后端开发命令，确认 `server/main.ts` 可通过 `nodemon + tsx` 正常启动。
- 验证 `server/route/index.ts` 统一注册的路由可被访问。
- 验证健康检查接口返回统一结构。

### 联调验证

- 启动前端 Vite 服务，确认 `/api` 代理配置不破坏现有前端运行。
- 验证在开发环境下通过前端访问服务端 `/api/health` 能成功到达 Koa 服务。

### 配置验证

- 验证 `.env.example` 中的配置项能够覆盖服务端启动所需的核心字段。
- 验证开发和生产模式下配置读取逻辑行为一致且可预期。
