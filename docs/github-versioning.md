# GitHub 与版本回滚流程

当前仓库应使用独立 GitHub remote，不复用其他 agent 的仓库。

当前 GitHub remote：

```bash
https://github.com/misscerasis-tech/A-group--agent.git
```

主开发分支：

```bash
main
```

查看当前最新稳定 tag：

```bash
git tag --sort=-creatordate | head -1
```

## 分支策略

- `main`：保存 A 组稳定可演示版本。
- `feature/*`：用于阶段性功能开发。

## 每轮开发完成必须做

1. 检查工作区：

```bash
git status --short --branch
```

2. 运行质量检查：

```bash
./node_modules/.bin/tsc --noEmit
./node_modules/.bin/vitest run
./node_modules/.bin/eslint .
```

3. 提交：

```bash
git add .
git commit -m "feat: build a-group ecommerce ops agent prototype"
```

4. 打 Tag：

```bash
git tag <tag>
```

5. 推送到 GitHub：

```bash
git push -u origin main
git push origin <tag>
```

## 回滚到稳定版本

只查看旧版本：

```bash
git checkout <tag>
```

从旧版本开修复分支：

```bash
git checkout -b hotfix/from-a-group-demo <tag>
```

回滚线上部署时，优先选择重新部署某个 GitHub commit 或 tag，不直接在生产机器上手工改文件。

## 数据库回滚原则

当前 A 组原型不新增数据库迁移，`/agent` 页面不依赖 PostgreSQL。

未来如果接入飞书连接、上传数据或真实平台授权，需要：

- 新增 Prisma migration。
- 在迁移前备份数据库。
- 保留旧连接记录。
- 给飞书机器人迁移创建 Migration record。
- 不直接在线修改数据库结构。

## Secret 管理

禁止提交：

- `.env`
- `.agent-state/`
- Feishu App Secret
- Feishu Encrypt Key
- Feishu Verification Token
- chat ID
- document ID
- bitable ID
- 平台 OAuth token

`.env.example` 可以放非敏感默认值，例如公开 App ID 和样例数据路径；不能放 App Secret、token、chat ID、doc ID、bitable ID 或任何真实平台授权信息。

## CI 说明

本地已经有 `agent:smoke`、`smoke:api` 和 `smoke:web` 三类检查，可以在提交前手动跑。

GitHub Actions workflow 需要由带 `workflow` scope 的 GitHub 凭证创建或更新。当前自动推送凭证没有这个权限，所以 Codex 不能直接把 `.github/workflows/ci.yml` 推到远端。用户回来后如果要开启 CI，可以在 GitHub 重新授权带 `workflow` scope 的 token，或手动创建 workflow。
