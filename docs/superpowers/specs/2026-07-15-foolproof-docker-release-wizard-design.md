# NOWEN Blog 傻瓜式 Docker 发布向导设计

## 背景

NOWEN Blog 已有 `scripts/release-docker.sh`，能够完成版本更新、质量检查、Docker Buildx 构建、Docker Hub 推送、Git Tag 和 GitHub Release，但默认入口仍要求使用者理解架构、运行时密钥、发布顺序与失败后的恢复方式。

本次设计参考 NOWEN Note `scripts/release.sh` 的交互体验，将博客的 Docker 发版入口改为默认零配置的快速发布向导。博客只有一个单体 Docker 镜像，因此不复制 NOWEN Note 的多客户端、多安装包目标，只保留与博客相关的流程。

## 目标

- 直接执行 `pnpm release:docker` 即可开始快速发布。
- 自动建议下一版本，默认发布 `linux/amd64` 与 `linux/arm64` 多架构镜像。
- 默认同步 `vX.Y.Z` 与 `latest`，推送 release commit、Git Tag，并创建 GitHub Release。
- 所有只读预检和本地构建完成后，才开始产生远端可见副作用。
- 发布前失败自动恢复本地状态；发布中失败可以用 `--resume` 幂等续传。
- 运行时密钥不写入镜像、仓库、发布状态或终端日志。
- 保留现有高级 CLI 参数和自动化用法。

## 非目标

- 不实现服务器安装、升级、卸载或运维菜单。
- 不发布桌面端、移动端、NAS 安装包或其他镜像。
- 不尝试跨 Docker Hub、GitHub 和 Git 仓库执行无法保证的分布式事务。
- 不自动安装 Docker、Git、pnpm、GitHub CLI 或修改宿主机安全配置。
- 不改变应用路由、API、数据库、权限、SEO 或运行时部署结构。

## 用户入口

### 默认快速发布

```bash
pnpm release:docker
```

无参数调用时启动快速向导，采用以下默认值：

- 版本：综合 `package.json`、本地 Git Tag、远端 Git Tag 和 Docker Hub Tag，取最新稳定版本并增加 patch。
- 架构：`multi`，即 `linux/amd64,linux/arm64`。
- Docker Tag：发布 `vX.Y.Z` 并更新 `latest`。
- Git：推送 release commit 和 Git Tag。
- GitHub：创建 GitHub Release。
- 发布策略：先预检和预构建，后统一执行远端发布动作。

向导只展示一次最终摘要并询问一次确认：

```text
╔══════════════════════════════════════╗
║       NOWEN Blog 快速发布向导        ║
╚══════════════════════════════════════╝

✓ Git 工作区干净
✓ Docker / Buildx 可用
✓ Docker Hub 已登录
✓ GitHub 推送权限正常
✓ GitHub CLI 已登录

建议版本：v1.0.5
发布架构：amd64 + arm64
Docker：cropflre/nowen-blog:v1.0.5 + latest
GitHub：release commit + Tag + Release

确认开始发布？[Y/n]
```

确认后不再出现其他交互问题。

### 高级 CLI

已有参数继续受支持，例如：

```bash
pnpm release:docker -- -v 1.0.5 --arch amd64 -y
pnpm release:docker -- -v 1.0.5-rc.1 --no-latest
pnpm release:docker -- -v 1.0.5 --no-github-release
pnpm release:docker -- --dry-run
```

只要显式传入发布选项，脚本就尊重用户选择。`--yes` 跳过最终确认，适合 CI 或自动化。现有 `--skip-checks`、`--no-pull`、`--no-git-push`、`--no-git-tag`、`--no-qemu` 等高级选项不删除。

### 续传入口

```bash
pnpm release:docker -- --resume
pnpm release:docker -- --resume -v 1.0.5
```

未指定版本时，`--resume` 从当前本地 release commit、当前版本和远端产物推断唯一可续传版本。如果无法唯一确定，脚本在执行任何写操作前停止，并要求显式提供 `-v`。

## 发布阶段

### 1. Preflight：只读预检

检查以下条件：

- 当前目录是 NOWEN Blog 仓库。
- 当前分支为 `main`，工作区和暂存区干净。
- Git、Node.js、pnpm、Docker 与 Buildx 可用。
- Docker daemon 正常，Buildx 支持多架构构建。
- Docker Hub 凭据可用于目标仓库。
- `origin/main` 可拉取且具备推送权限。
- GitHub CLI 已安装并完成认证；快速模式默认创建 GitHub Release，因此该项是必需条件。
- 目标版本的本地/远端 Git Tag、Docker Tag 和 GitHub Release 均不存在。
- `multi` 架构所需的 QEMU/binfmt 可用；允许脚本沿用现有逻辑自动准备。

任何预检失败都不得修改 `package.json`、创建 commit、创建 Tag 或推送远端。错误信息必须包含原因和可复制的修复命令，例如 `docker login` 或 `gh auth login`。

高级模式显式指定 `--no-github-release` 时，不要求 GitHub CLI；显式指定不推送 Git 或 Tag 时，只检查实际启用的能力。

### 2. Prepare：本地准备

- 将 `package.json` 更新为目标版本。
- 执行 `pnpm install --frozen-lockfile`。
- 执行 `pnpm typecheck`、`pnpm test` 和 Compose 配置校验。
- 使用只存在于校验子进程的占位值满足 `SESSION_SECRET` 与 `ADMIN_PASSWORD` 插值要求。
- 创建本地 `chore(release): vX.Y.Z` commit，但不立即推送。

脚本记录：原始 HEAD、目标版本、release commit SHA、当前阶段和已完成动作。状态只存储非敏感信息。

### 3. Build：预构建

- 使用 Docker Buildx 为 `linux/amd64,linux/arm64` 完成预构建。
- 预构建不发布远端 Tag；多架构产物保留在 Buildx 缓存中。
- 镜像包含前端、API、Nginx、SQLite 运行时与备份工具。
- 预构建成功后，再进入远端发布阶段。

如果 Preflight、Prepare 或 Build 失败，脚本自动撤销由本次运行创建且尚未推送的 release commit，恢复原始 `package.json` 和干净工作区。清理动作只允许操作脚本本次创建且 SHA 完全匹配的 commit，避免影响用户提交。

### 4. Publish：远端发布

远端动作顺序固定为：

1. 使用已预热的 Buildx 缓存推送 Docker `vX.Y.Z` 与 `latest`。
2. 推送本地 release commit 到 `origin/main`。
3. 创建并推送 `vX.Y.Z` Git Tag。
4. 创建 GitHub Release。

进入 Publish 后不自动删除任何已存在的远端产物。跨服务发布无法做到真正事务化，设计采用“发布前完整验证 + 发布后幂等续传”的准原子语义。

## 状态与续传

### 状态文件

脚本在仓库的忽略目录下保存 `.tmp/release-docker-state.json`，包含：

- 状态格式版本。
- 目标版本、镜像名、架构与是否更新 `latest`。
- 原始 HEAD 与 release commit SHA。
- 是否启用 Git 推送、Git Tag 和 GitHub Release。
- Docker、Git commit、Git Tag、GitHub Release 的完成状态。

状态文件不得包含 Docker、GitHub、管理员或 Session 凭据。完成全部发布后删除状态文件。

### `--resume` 行为

续传不能只信任本地状态文件，还要查询实际远端状态：

- Docker Hub 是否已有 `vX.Y.Z`。
- `origin/main` 是否包含 release commit。
- 远端是否已有 `vX.Y.Z` Tag，且是否指向正确 commit。
- GitHub Release 是否已存在。

已正确完成的步骤标记为跳过，只执行缺失步骤。若远端同名产物指向不同 commit 或内容不一致，脚本停止并报告冲突，不覆盖、不删除。

没有状态文件时，`--resume -v X.Y.Z` 仍可根据本地 commit 与远端状态重建发布进度。无法安全推断时拒绝继续。

## 信号与清理

- `ERR`、正常退出与 `SIGINT`/`SIGTERM` 使用统一清理入口。
- Publish 开始前中断：恢复脚本创建的本地 release commit 和 `package.json`。
- Publish 开始后中断：保留本地 commit 与状态文件，输出 `pnpm release:docker -- --resume -v X.Y.Z`。
- 临时文件使用受控目录，清理前验证绝对路径位于仓库内。
- 清理失败时保留现场并打印人工恢复命令，不进行猜测性 Git 重置。

## 密钥与日志安全

- Compose 校验可以使用当前 Shell 中已有的真实变量，但真实 `SESSION_SECRET` 和 `ADMIN_PASSWORD` 只传给子进程，不经过通用命令打印器。
- 终端展示固定的无敏感校验占位值。
- 不读取或打印 Docker、GitHub 的凭据内容，只检查认证是否可用。
- 不把运行时密钥作为 Docker build args、镜像标签、GitHub Release 内容或状态文件字段。
- 服务器实际部署仍必须通过 `.env` 配置强随机 `SESSION_SECRET` 与 `ADMIN_PASSWORD`；发布向导不替代部署配置。

## 输出与错误信息

每个阶段使用稳定的标题和状态标记：

- `[✓]` 已完成。
- `[*]` 正在执行或提示信息。
- `[!]` 非阻塞警告。
- `[✗]` 阻塞错误。

成功时输出：

- 发布版本和镜像完整引用。
- Docker Hub、Git Tag 与 GitHub Release 结果。
- 固定版本和 `latest` 的部署命令。

失败时输出：

- 失败阶段和失败命令。
- 已完成的远端动作。
- 本地是否已自动恢复。
- 唯一推荐的下一条命令；进入 Publish 后统一优先推荐 `--resume`。

## 代码组织

保留现有 Bash 架构，避免引入新的 Node CLI 依赖：

- `scripts/release-docker-entry.sh`：继续处理 pnpm 参数分隔符兼容。
- `scripts/release-docker.sh`：参数、向导、阶段编排与发布逻辑。
- 发布状态、远端探测和清理逻辑拆成职责清晰的 Bash 函数，避免继续扩大顶层流程。
- Shell 回归测试使用受控的 fake Git、Docker、curl/gh 边界，不访问真实远端、不执行真实发布。

不复制 NOWEN Note 与博客无关的 PC、Android、NAS、Lite 或浏览器扩展发布代码。

## 测试与验收

### 自动化回归测试

- 无参数调用进入快速模式，默认 `multi`、更新 `latest`、推送 Git/Tag 并创建 GitHub Release。
- 建议版本综合本地、远端和 Docker Hub 版本。
- 显式 CLI 参数覆盖快速模式默认值。
- 最终摘要只确认一次；`--yes` 全程无交互。
- 任一 Preflight 失败时 `package.json` 与 HEAD 不变。
- Prepare 或 Build 失败时，脚本创建的 release commit 被安全撤销。
- Publish 各步骤失败时，状态文件记录准确，输出正确的 `--resume` 命令。
- `--resume` 跳过已完成动作，只补做缺失动作，多次执行保持幂等。
- 同名远端产物指向错误 commit 时拒绝覆盖。
- `SIGINT`/`SIGTERM` 在 Publish 前后分别执行正确清理策略。
- dry-run 不修改文件、不创建 commit、不调用真实推送。
- 哨兵密钥不出现在 stdout、stderr、状态文件或打印命令中。
- 现有 `--help`、pnpm `--` 分隔符和高级参数保持兼容。

### 项目验证

实现完成后至少执行：

```bash
pnpm typecheck
pnpm test
pnpm build
```

还要使用临时校验变量执行：

```bash
docker compose config --quiet
docker compose -f docker-compose.release.yml config --quiet
```

最后执行一次完全 fake 边界的快速发布和续传验收，确认没有真实网络写操作。

## 成功标准

- 新使用者无需记忆参数，运行 `pnpm release:docker`、确认一次即可完成标准多架构发布。
- 所有凭据、权限、版本冲突和工具缺失在修改版本文件前被发现。
- 远端发布前的失败不会留下本地 release commit 或半改的 `package.json`。
- 远端发布中断后，一条 `--resume` 命令可以安全补齐缺失产物。
- 发布日志不包含任何真实密钥。
- 现有高级发布参数与 CI 自动化用法保持兼容。
