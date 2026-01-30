# Proposal: CLI Config Manager

## Context

开发者本机常安装多个 CLI 工具（如 Claude Code, Cursor, Windsurf），其配置文件散落在用户目录下的隐藏文件夹中。这些文件缺乏统一管理，版本混乱，难以在不同项目或环境间快速切换配置。

## Problem Statement

1. 配置文件分散，无法统一查看和编辑
2. 缺乏版本控制和备份机制
3. 无法在不同项目间快速切换配置
4. 误操作后难以恢复

## Proposed Solution

构建一个 Windows 桌面应用，提供：
- 项目级 CLI 配置管理
- 类 Finder 的 Column View 分栏视图
- 目录级快照备份与恢复
- Glob 语法的忽略规则

## Technical Constraints

### TC-01: Framework
- **Choice**: Electron + React
- **Rationale**: 成熟生态，跨平台潜力

### TC-02: IPC Communication
- **Choice**: electron-trpc
- **Rationale**: 类型安全的主进程/渲染进程通信

### TC-03: State Management
- **Choice**: Zustand
- **Rationale**: 轻量级，适合中小型应用

### TC-04: UI Components
- **Choice**: Radix UI + Tailwind CSS
- **Rationale**: 无样式组件，完全可控

### TC-05: Editor
- **Choice**: Monaco Editor
- **Rationale**: VS Code 同款，JSON/MD 支持完善

### TC-06: Glob Matching
- **Choice**: `ignore` library (npm: ignore)
- **Rationale**: 完全兼容 .gitignore 语义，无需额外配置

### TC-07: Platform
- **Target**: Windows (MVP)
- **Future**: macOS

## Business Rules (Hard Constraints)

### BR-01: Project-Only Management
所有配置操作必须依附于具体 Project，不维护 Workspace 级别的 CLI 分类池。

### BR-02: Mandatory Path Configuration
用户首次使用或创建项目前，必须在全局设置中配置 CLI 的 `installPath`。未配置路径的 CLI 无法被添加到项目中。

### BR-03: Relative Path Mapping
系统通过相对路径在 `installPath` 和 `Working Copy` 之间同步。
- `installPath/config.json` ↔ `Workspace/Projects/P1/AAA/config.json`

### BR-04: No .bak Files
严禁生成单文件 `.bak`（如 `config.json.bak`）。

### BR-05: Directory Snapshot Backup
- 自动备份：点击 Apply 时强制触发
- 手动备份：Import 前或随时点击"备份"按钮触发
- 快照目录结构：`backup/bak{yyyyMMddHHmmssSSS}/`

### BR-06: Snapshot Types
- `full`：备份某 CLI 的完整目录树（服从 Ignore）
- `partial`：仅备份本次勾选 Apply 涉及的最小子树（服从 Ignore）

### BR-07: Unified Ignore Rules
Import、Backup、Apply 三个动作共用同一套 Ignore Rules。凡是命中规则的文件/文件夹，视为"不存在"。

### BR-08: Restore Ignores Ignore Rules
Restore 默认不受 Ignore Rules 影响（确保时光机一致性），但需风险提示。

### BR-09: Backup Atomicity
备份失败必须立即回滚：删除本次 `bak{timestamp}` 目录，并中止 Apply，提示错误与失败清单。

### BR-10: Partial Snapshot Constraint
`snapshotType = partial` 的快照禁止执行"全量恢复整个 CLI/项目"的一键操作。

### BR-11: Timestamp Format (Millisecond Precision)
- **Format**: `yyyyMMddHHmmssSSS`（17位，含毫秒）
- **Example**: `bak20260130152301123`
- **Rationale**: 避免同一秒内多次备份的命名冲突

### BR-12: Apply Failure Auto-Rollback
Apply 失败后自动从刚创建的快照恢复 installPath，保证一致性。

### BR-13: Symlink/Junction Handling
- **Behavior**: 跳过符号链接和 Junction，记录警告
- **Rationale**: 避免循环引用和越界复制

### BR-14: Case Insensitivity
- CLI 名称和项目名称大小写不敏感
- `AAA` 和 `aaa` 视为同一标识符
- 存储时保留原始大小写，比较时忽略

### BR-15: Workspace Location
- **Path**: `%APPDATA%/CLIConfigManager/`
- **Rationale**: 符合 Windows 应用数据规范

### BR-16: Single Instance
- 同一时间只允许运行一个应用实例
- 使用文件锁或 Electron 内置机制实现

### BR-17: Large File Warning
- 超过 100MB 的文件在 Import/Backup/Apply 时显示警告
- 用户确认后继续操作

### BR-18: Snapshot Retention
- 每个项目最多保留 5 个快照
- 超出时自动删除最旧的快照

### BR-19: Editor File Size Limit
- 超过 10MB 的文件以只读模式打开
- 防止 Monaco Editor 性能问题

### BR-20: UTC Timezone
- 所有时间字段（timestamp、createdTime）使用 UTC
- 避免时区混乱

## Directory Structure

```
Workspace/                              # Located at %APPDATA%/CLIConfigManager/
├── settings.json                       # CLI Registry + Ignore Rules
└── Projects/
    └── {ProjectName}/
        ├── project.json                # 项目元数据
        ├── {CLI}/                      # Working Copy
        └── backup/
            └── bak{yyyyMMddHHmmssSSS}/ # 17位毫秒精度时间戳
                ├── meta.json
                └── {CLI}/
```

## Data Models

### settings.json
```typescript
interface Settings {
  cliRegistry: Record<string, { installPath: string }>
  ignoreRules: {
    global: string[]
    perCli: Record<string, string[]>
  }
}
```

### project.json
```typescript
interface ProjectMeta {
  projectName: string
  createdTime: string  // ISO 8601
  linkedCLIs: Record<string, { snapshotInstallPath: string }>
}
```

### meta.json (Snapshot)
```typescript
interface SnapshotMeta {
  timestamp: string           // yyyyMMddHHmmssSSS (17位毫秒精度)
  snapshotType: 'full' | 'partial'
  includedCLIs: string[]
  source: 'auto-apply-backup' | 'manual-backup' | 'pre-import-backup'
  createdTime: string         // ISO 8601 UTC
  notes: string
}
```

## Core Modules

| Module | Responsibility |
|--------|----------------|
| Settings | CLI 注册表管理、Ignore Rules 编辑 |
| Project | 项目 CRUD、CLI 关联 |
| FileOps | Import/Backup/Apply/Restore |
| ColumnView | 分栏视图、复选框级联 |
| Editor | JSON/MD 编辑预览 |

## Acceptance Criteria

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| AC-01 | 未配置 CLI 路径时点击"新建项目" | 入口置灰或报错提示 |
| AC-02 | Apply 时备份过程中任一文件失败 | 回滚 bak 目录，阻断 Apply，显示失败清单 |
| AC-03 | 任何操作后检查 Workspace | 无 `.bak` 后缀文件存在 |
| AC-04 | 配置 Ignore `*.log` 后执行 Import | log 文件不被导入 |
| AC-05 | 配置 Ignore `*.log` 后执行 Apply | Working Copy 中的 log 文件不被复制到 installPath |
| AC-06 | 修改配置 → Apply → Restore | CLI 恢复到修改前状态 |
| AC-07 | Restore 时选择 partial 快照 | 禁止一键全量恢复，UI 提示"仅能恢复快照包含范围" |
| AC-08 | Restore 执行前 | 显示风险提示"恢复将忽略当前 Ignore Rules" |

## Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| 文件被占用 (Locked) | 备份/Apply/Restore 失败 | 提示用户关闭占用程序 |
| 路径过长 (Windows 260 限制) | 复制失败 | 使用 `\\?\` 前缀或提示用户 |
| 权限不足 (EPERM) | 操作失败 | 提示以管理员身份运行 |
| 磁盘空间不足 | 备份写入失败 | 写入失败时回滚 |

## Property-Based Testing (PBT) Properties

### PBT-01: Round-Trip Invariant (BR-03)
```
∀p,c: Apply(p,c) ∘ Import(p,c) leaves Filter(Install(c), Ignore) unchanged
```
**Falsification**: Generate random directory trees with deep nesting, Unicode names; run Import→Apply repeatedly and assert path-by-path equality on non-ignored set.

### PBT-02: No .bak Files Invariant (BR-04)
```
∀ created paths x by any operation: ¬endsWith(x, ".bak")
```
**Falsification**: Instrument file creations during randomized Import/Backup/Apply/Restore sequences; assert no `*.bak` files created.

### PBT-03: Backup Atomicity (BR-09)
```
If backup fails: (a) bak{ts} directory does not remain, (b) Install_after = Install_before
```
**Falsification**: Fault-inject failures at random points during backup copy; assert no partial snapshot dir remains and Apply makes zero changes.

### PBT-04: Ignore Rules Consistency (BR-07)
```
∀r: Ignore(c,r)=true ⇒ Install_after(r) = Install_before(r)
```
**Falsification**: Generate `.gitignore`-style rules with edge cases (`**`, trailing `/`, negation `!`); assert ignored paths are never copied nor modified.

### PBT-05: Restore Independence from Ignore (BR-08)
```
∀Ignore1,Ignore2: Restore(snapshot, Ignore1) = Restore(snapshot, Ignore2)
```
**Falsification**: Create snapshot with paths that would be ignored by later config; change ignore rules and restore; assert all snapshot files reappear exactly.

### PBT-06: Timestamp Monotonicity (BR-11)
```
∀ sequential backups A, B in project p: tsA < tsB (lexicographically)
```
**Falsification**: Generate rapid backup bursts; mock clock to produce same-ms and backwards time; assert no collisions and order is non-decreasing.

### PBT-07: Apply Failure Rollback (BR-12)
```
Apply_fail ⇒ Install_after = Install_snapshot(s)
```
**Falsification**: Fault-inject Apply failures mid-copy; assert final install tree equals snapshot exactly with no mixed partial state.

### PBT-08: Symlink Boundary (BR-13)
```
∀ symlink/junction n: n ∉ TraversedNodes ∧ no writes outside intended root
```
**Falsification**: Generate directory graphs with symlink loops, links to parent, links outside root; assert termination and no out-of-root writes.

### PBT-09: Case Insensitivity (BR-14)
```
∀a,b: casefold(a) = casefold(b) ⇒ same entity (no duplicates)
```
**Falsification**: Generate random names with casing variants; attempt create/link/import; assert no duplicate directories/records.

### PBT-10: Workspace Containment (BR-15)
```
∀ writes w: normalize(w.path) hasPrefix normalize(WorkspaceRoot)
```
**Falsification**: Generate project/CLI names with `..`, path separators, absolute paths, reserved device names; assert no file written outside WorkspaceRoot.

### PBT-11: Single Instance Mutex (BR-16)
```
At most one instance holds app lock; non-owners must not mutate workspace
```
**Falsification**: Start N instances concurrently; assert exactly one acquires lock and others exit without changes.

### PBT-12: Large File Gating (BR-17)
```
size > 100MB ⇒ requires confirmation; without confirmation, no state change
```
**Falsification**: Generate trees with sizes `{100MB-1, 100MB, 100MB+1}`; assert warning gating and full rollback when canceled.

### PBT-13: Snapshot Retention Bound (BR-18)
```
∀p: #snapshots(p) ≤ 5; after creating 6th, oldest by timestamp is deleted
```
**Falsification**: Generate backup sequences longer than 5; assert post-condition count is 5 and remaining are top-5 by timestamp.

### PBT-14: Editor Size Limit (BR-19)
```
size > 10MB ⇒ read-only; any edit/save leaves on-disk bytes unchanged
```
**Falsification**: Generate files around 10MB threshold; assert writes blocked for >10MB and allowed for ≤10MB.

### PBT-15: UTC Timezone Consistency (BR-20)
```
All time fields parse as ISO-8601 with offset 0 (Z or +00:00)
```
**Falsification**: Run with randomized local time zones/DST settings; assert serialized times always use UTC offset 0.

### PBT-16: Partial Snapshot Scope (BR-10)
```
s.type='partial' ⇒ RestoreAllCLI(s) and RestoreAllProject(s) are invalid
```
**Falsification**: Generate partial snapshots with narrow scopes; attempt full restore; assert hard failure and no filesystem change.
