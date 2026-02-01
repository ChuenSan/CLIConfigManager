# Proposal: CLI Additional Paths Support

## Context

当前系统中，每个 CLI 只能配置单一 `installPath`。但实际场景中，某些 CLI 的配置文件分散在多个目录（如用户目录、AppData、自定义路径等），无法统一管理。

## Problem Statement

1. CLI 配置文件可能散落在 `installPath` 之外的其他位置
2. 当前数据模型只支持单一路径，无法覆盖分散配置
3. Import/Apply/Backup 只能操作主路径，遗漏其他关键配置

## Proposed Solution

扩展 `CliEntry` 数据模型，支持附加路径（`additionalPaths`），实现：
- 主路径 + 附加路径统一 Import/Apply/Backup
- Working Copy 按路径别名分子目录存储
- Settings 页面管理附加路径

## Technical Constraints

### TC-01: Backward Compatibility
- `installPath` 字段必须保留
- `additionalPaths` 为可选字段，默认 `undefined`
- 现有 settings.json 无需迁移即可正常工作

### TC-02: Working Copy Structure
```
Project/<CLI>/
  _main/           # installPath 内容
  <alias>/         # additionalPaths[n] 内容
```

### TC-03: Alias Naming
- `alias` 在同一 CLI 内必须唯一
- 保留名 `_main` 不可用于 additionalPaths
- 合法字符：字母、数字、下划线、连字符

## Business Rules (Hard Constraints)

### BR-AP-01: Atomic Import
Import 操作必须原子性：主路径 + 所有附加路径全部成功，或全部回滚。

### BR-AP-02: Unified Backup
Backup 必须包含主路径和所有附加路径的完整内容。

### BR-AP-03: Apply Pre-Backup
Apply 前必须先备份所有路径（主路径 + 附加路径），再统一应用。

### BR-AP-04: Shared Ignore Rules
附加路径复用 CLI 级别的 Ignore Rules，不单独配置。

### BR-AP-05: Path Validation
添加附加路径时必须验证：
- 路径存在且可访问
- alias 不与现有 alias 或 `_main` 冲突

### BR-AP-06: LinkedCLIs Snapshot
`project.json` 的 `linkedCLIs` 需记录快照时的附加路径配置，确保 Restore 时路径映射正确。

## Data Models

### settings.json (Extended)
```typescript
interface CliEntry {
  installPath: string
  additionalPaths?: Array<{
    alias: string   // 子目录名，如 "config", "scripts"
    path: string    // 绝对路径
  }>
}

interface Settings {
  cliRegistry: Record<string, CliEntry>
  ignoreRules: {
    global: string[]
    perCli: Record<string, string[]>
  }
}
```

### project.json (Extended)
```typescript
interface LinkedCliEntry {
  snapshotInstallPath: string
  snapshotAdditionalPaths?: Array<{
    alias: string
    path: string
  }>
}

interface ProjectMeta {
  projectName: string
  createdTime: string
  linkedCLIs: Record<string, LinkedCliEntry>
}
```

## UI Changes

### Settings Page
- CLI 卡片展示附加路径列表
- 「添加附加路径」按钮，弹窗输入 alias + path
- 每个附加路径可单独删除

### Project Detail Page
- ColumnView 根目录显示 `_main` + 各 alias 子目录
- 路径来源标识（可选：tooltip 显示原始路径）

## Success Criteria

| ID | Criterion | Verification |
|---|---|---|
| SC-01 | 现有 settings.json 无 additionalPaths 时正常工作 | 启动应用，功能不受影响 |
| SC-02 | 添加附加路径后，Import 导入到正确子目录 | 检查 Working Copy 结构 |
| SC-03 | Apply 将各子目录内容应用回各自原始路径 | 检查目标路径文件 |
| SC-04 | Backup 包含所有路径的完整内容 | 检查快照目录结构 |
| SC-05 | Restore 正确恢复所有路径 | 检查各路径文件 |
| SC-06 | alias 冲突时拒绝添加并提示 | UI 错误提示 |

## Out of Scope

- 附加路径的独立 Ignore Rules
- 附加路径的单独 Import/Apply（必须与主路径统一操作）
- 跨 CLI 共享附加路径
