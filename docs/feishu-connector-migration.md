# 飞书机器人迁移能力设计

比赛要求飞书作为统一入口和结果输出平台。为了避免 Demo 只能绑定一个临时机器人，本项目必须支持飞书机器人迁移。

## 核心原则

- 飞书连接归属于 Workspace，不归属于全局应用。
- 不在代码里写死 App ID、App Secret、tenant key、chat ID、document ID 或 bitable ID。
- 一个 Workspace 可以保留历史飞书连接记录。
- 同一时间只有一个连接被标记为 active。
- 迁移时先测试新连接，再切换默认连接，最后停用旧连接。
- 每次迁移必须保存来源、目标、原因、执行人、时间和结果。
- 旧飞书连接停用后，业务数据仍保存在本系统，不依赖飞书作为业务底座。

## 需要保存的连接信息

非敏感配置：

- Workspace ID
- 连接名称
- Feishu App ID
- tenant key
- 默认通知群 chat ID
- 结果沉淀文档或多维表格 ID
- 连接状态
- 创建时间、更新时间、最后测试时间

敏感配置：

- App Secret
- Encrypt Key
- Verification Token
- OAuth token

敏感配置不得进入浏览器，不得写入日志，不得提交 Git。原型阶段放在 `.env`，生产阶段进入加密配置或密钥管理服务。

## 迁移流程

1. 用户在 Workspace 设置中新增飞书连接。
2. 系统读取新连接配置，但不立即替换当前连接。
3. 系统发送测试消息到新机器人或新群。
4. 测试成功后，创建迁移记录。
5. 将新连接设为 active。
6. 将旧连接设为 disabled 或 migrated。
7. 保存迁移结果。
8. 后续任务、周报、提醒都走新的 active 连接。

## 迁移记录字段

| 字段 | 含义 |
| --- | --- |
| workspaceId | 所属 Workspace |
| fromConnectionId | 原连接 |
| toConnectionId | 新连接 |
| reason | 迁移原因 |
| initiatedBy | 执行人 |
| status | planned / tested / switched / rolled_back / failed |
| startedAt | 开始时间 |
| finishedAt | 完成时间 |
| notes | 备注 |

## 回滚流程

如果新机器人不可用：

1. 停止发送新任务。
2. 将旧连接重新标记为 active。
3. 将新连接标记为 failed 或 disabled。
4. 记录 rollback 迁移事件。
5. 向 Workspace 管理员提示失败原因。

## 演示阶段实现

第一版原型先做：

- 飞书连接配置契约。
- 迁移计划生成函数。
- Secret 脱敏函数。
- 迁移规则测试。
- 页面保留“飞书回写预览”。

后续接真实飞书时再补：

- 飞书事件回调。
- 群消息发送。
- 文档写入。
- 多维表格写入。
- OAuth 或应用凭证加密存储。
