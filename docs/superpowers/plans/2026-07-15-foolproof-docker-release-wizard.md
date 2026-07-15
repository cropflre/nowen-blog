# NOWEN Blog 傻瓜式 Docker 发布向导实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将无参数 `pnpm release:docker` 改为一次确认即可完成标准多架构发布的快速向导，并支持安全回滚与 `--resume` 幂等续传。

**架构：** 继续使用现有 Bash 发布入口，将流程拆为 preflight、prepare、build、publish 四阶段。`.tmp/release-docker-state.json` 只记录非敏感发布进度；发布前失败根据原始 HEAD 自动回滚，发布开始后依靠远端探测和 `--resume` 补齐缺失产物。

**技术栈：** Bash、Docker Buildx/Compose、Git、GitHub CLI、Node.js（状态 JSON）、pnpm。

---

## 文件结构

- 修改 `scripts/release-docker.sh`：快速向导、分阶段编排、状态文件、回滚和续传。
- 修改 `scripts/release-docker-validation.test.sh`：保留 Compose 密钥与日志安全回归。
- 创建 `scripts/release-docker-quick.test.sh`：使用 fake Git/Docker/gh/curl 验证快速模式、回滚和续传。
- 修改 `package.json`：将新发布测试接入根测试命令。
- 修改 `README.md`：记录快速向导、高级模式和续传命令。

### 任务 1：快速模式与单次确认

**文件：**
- 修改：`scripts/release-docker.sh`
- 创建：`scripts/release-docker-quick.test.sh`
- 修改：`package.json`

- [ ] **步骤 1：编写失败的快速模式测试**

测试创建隔离的 fake `git`、`docker`、`gh` 与 `curl`，以 dry-run 执行无参数脚本，并断言：

```bash
printf '%s' "$output" | grep -Fq 'NOWEN Blog 快速发布向导'
printf '%s' "$output" | grep -Fq '架构:          multi (linux/amd64,linux/arm64)'
printf '%s' "$output" | grep -Fq 'GitHub Release: on'
[ "$(printf '%s' "$output" | grep -c '确认开始发布')" -eq 1 ]
```

测试使用回车接受建议版本，fake 远端返回无冲突，并确认 `--yes` 不读取 stdin。

- [ ] **步骤 2：运行测试验证失败**

运行：`bash scripts/release-docker-quick.test.sh`

预期：FAIL，缺少 `NOWEN Blog 快速发布向导`，且默认架构仍为 `amd64`。

- [ ] **步骤 3：实现快速模式最少逻辑**

在参数解析前记录：

```bash
ORIGINAL_ARGC=$#
QUICK_MODE=0
RESUME_MODE=0
```

参数解析后，无参数时设置 `QUICK_MODE=1`、`ARCH=multi`、`GITHUB_RELEASE_MODE=on`，并在版本解析前展示向导标题。保留所有显式 CLI 参数行为；`--yes` 继续完全非交互。

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
bash scripts/release-docker-quick.test.sh
bash scripts/release-docker-entry.test.sh
```

预期：两个脚本均 PASS。

### 任务 2：发布前回滚与状态文件

**文件：**
- 修改：`scripts/release-docker.sh`
- 修改：`scripts/release-docker-quick.test.sh`

- [ ] **步骤 1：编写失败的回滚测试**

fake Git 维护 HEAD 与 release commit 状态，fake Docker 在预构建阶段返回失败。断言脚本失败后：

```bash
grep -Fq 'git reset --mixed original-head' "$CALL_LOG"
grep -Fq '发布失败，本地版本和 release commit 已恢复' "$output"
[ ! -f .tmp/release-docker-state.json ]
```

另一个测试让 Docker 推送阶段失败，断言不调用 `git reset`，状态文件保留并输出：

```text
pnpm release:docker -- --resume -v 99.99.99
```

- [ ] **步骤 2：运行测试验证失败**

运行：`bash scripts/release-docker-quick.test.sh`

预期：FAIL，当前 cleanup 在本地 commit 后不会恢复，也没有阶段状态。

- [ ] **步骤 3：实现状态与安全回滚**

新增稳定变量和函数：

```bash
STATE_FILE="$ROOT_DIR/.tmp/release-docker-state.json"
PHASE="preflight"
ORIGINAL_HEAD=""
RELEASE_SHA=""
LOCAL_RELEASE_CREATED=0
PUBLISH_STARTED=0

write_release_state()
mark_release_state()
remove_release_state()
rollback_local_release()
print_resume_hint()
```

状态 JSON 包含目标版本、镜像、架构、latest、release SHA 和四个远端完成布尔值，不包含任何凭据。回滚前同时验证 `LOCAL_RELEASE_CREATED=1` 与当前 HEAD 等于 `RELEASE_SHA`，只执行 `git reset --mixed "$ORIGINAL_HEAD"` 并恢复备份。

- [ ] **步骤 4：运行测试验证通过**

运行：`bash scripts/release-docker-quick.test.sh`

预期：预构建失败自动回滚；Publish 失败保留状态并输出续传命令。

### 任务 3：调整发布顺序并实现 `--resume`

**文件：**
- 修改：`scripts/release-docker.sh`
- 修改：`scripts/release-docker-quick.test.sh`

- [ ] **步骤 1：编写失败的发布顺序与续传测试**

成功路径根据 fake 调用日志断言顺序：

```text
docker buildx bake ... --push
git push origin HEAD:main
git push origin v99.99.99
gh release create v99.99.99
```

续传路径让 fake 远端报告 Docker Tag 和 Git commit 已存在、Git Tag 与 GitHub Release 缺失，断言仅执行后两步。冲突测试让远端同名 Tag 指向其他 commit，断言脚本退出且不覆盖。

- [ ] **步骤 2：运行测试验证失败**

运行：`bash scripts/release-docker-quick.test.sh`

预期：FAIL，当前顺序先推 Git，并且不识别 `--resume`。

- [ ] **步骤 3：实现远端探测和续传**

参数解析新增：

```bash
--resume) RESUME_MODE=1 ;;
```

新增函数：

```bash
remote_commit_contains_release()
remote_tag_target()
github_release_exists()
load_release_state()
resume_release()
```

标准发布将 `PUBLISH_STARTED=1` 后按 Docker、Git commit、Git Tag、GitHub Release 顺序执行，每步成功立即更新状态。`--resume` 先读取状态，再以远端实际结果校正；正确产物跳过、缺失产物补做、冲突产物拒绝覆盖。

- [ ] **步骤 4：运行测试验证通过**

运行：`bash scripts/release-docker-quick.test.sh`

预期：成功顺序、部分续传、重复续传和冲突拒绝全部 PASS。

### 任务 4：加强预检、信号处理与日志安全

**文件：**
- 修改：`scripts/release-docker.sh`
- 修改：`scripts/release-docker-validation.test.sh`
- 修改：`scripts/release-docker-quick.test.sh`

- [ ] **步骤 1：编写失败的预检与信号测试**

分别模拟 `gh` 缺失、`gh auth status` 失败、Docker daemon 失败、Git 推送预检失败，断言均发生在 `set_package_version` 前并显示修复命令。向 prepare/build 进程发送 `SIGINT`，断言走发布前回滚；Publish 阶段中断则保留状态。

保留哨兵密钥断言：

```bash
if grep -Fq 'must-not-appear' "$output" "$STATE_FILE"; then
  exit 1
fi
```

- [ ] **步骤 2：运行测试验证失败**

运行：

```bash
bash scripts/release-docker-validation.test.sh
bash scripts/release-docker-quick.test.sh
```

预期：新增的强制 GitHub CLI 和信号阶段断言 FAIL。

- [ ] **步骤 3：实现条件预检和统一清理**

快速模式下强制 `gh` 存在且已认证；高级模式仅在 `--github-release` 时强制。为 `EXIT INT TERM` 注册统一处理函数，根据 `PUBLISH_STARTED` 选择本地回滚或续传提示。命令显示继续使用安全占位值，真实密钥只进入 Compose 子进程环境。

- [ ] **步骤 4：运行测试验证通过**

运行：

```bash
bash scripts/release-docker-entry.test.sh
bash scripts/release-docker-validation.test.sh
bash scripts/release-docker-quick.test.sh
```

预期：全部 PASS，输出中无哨兵密钥。

### 任务 5：文档与完整验证

**文件：**
- 修改：`README.md`
- 修改：`package.json`

- [ ] **步骤 1：更新使用文档**

README 的 Docker 一键发版章节改为：默认无参数快速发布 multi；只确认一次；高级参数示例；失败后使用 `pnpm release:docker -- --resume -v X.Y.Z`。明确发布校验占位密钥不替代服务器 `.env`。

- [ ] **步骤 2：接入根测试命令**

根 `test` 依次执行：

```json
"test": "bash scripts/release-docker-entry.test.sh && bash scripts/release-docker-validation.test.sh && bash scripts/release-docker-quick.test.sh && pnpm --filter @blog/server test"
```

- [ ] **步骤 3：运行完整验证**

运行：

```bash
pnpm typecheck
pnpm test
pnpm build
SESSION_SECRET=release-validation-session-secret-at-least-32-characters \
ADMIN_PASSWORD=release-validation-admin-password \
docker compose config --quiet
SESSION_SECRET=release-validation-session-secret-at-least-32-characters \
ADMIN_PASSWORD=release-validation-admin-password \
docker compose -f docker-compose.release.yml config --quiet
git diff --check
```

预期：全部退出 0；构建只允许已有的 Vite chunk-size warning；Git 状态只包含本计划涉及文件。
