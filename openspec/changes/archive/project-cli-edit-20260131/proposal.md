# Proposal: Project CLI Edit Button

## Context

用户在 HomePage 的项目列表中，每个项目卡片有 "Open" 和 "Delete" 按钮。用户需要在这两个按钮之间添加 "Edit" 按钮，用于管理该项目支持的 CLI（添加或移除）。

## Problem Statement

当前项目创建后，无法在 HomePage 直接修改其关联的 CLI 列表。用户必须进入项目详情页才能进行 CLI 管理，操作路径过长。

## Proposed Solution

在项目卡片的 "Open" 和 "Delete" 按钮之间添加 "Edit" 按钮，点击后弹出 Checkbox 列表弹窗，显示所有已注册的 CLI，勾选状态表示是否链接到该项目。

## Technical Constraints

### TC-01: Reuse Existing tRPC Interfaces
- **Choice**: 复用 `projects.linkCli` 和 `projects.unlinkCli`
- **Rationale**: 接口已存在且经过验证，无需新增后端代码

### TC-02: UI Component Pattern
- **Choice**: Radix Dialog + Checkbox 列表
- **Rationale**: 与现有 Create Project 弹窗保持一致

## Business Rules (Hard Constraints)

### BR-01: Button Placement
"Edit" 按钮必须位于 "Open" 和 "Delete" 按钮之间。

### BR-02: CLI Source
只能添加已在全局 `settings.cliRegistry` 注册的 CLI。

### BR-03: No Duplicate Links
已链接的 CLI 不可重复添加（大小写不敏感检查）。

### BR-04: Preserve Backups on Unlink
移除 CLI 时删除 working copy 目录，但保留 backup 中的历史数据。

### BR-05: Unlink Warning
移除 CLI 时必须显示红色高亮警示弹窗：
"此操作将永久删除项目内的该 CLI 配置副本，但不会影响系统安装目录和历史备份。"

## UI Specification

### Edit Dialog
- 标题: "Edit CLIs - {ProjectName}"
- 内容: Checkbox 列表，每行显示一个 CLI 名称
  - 已链接的 CLI 默认勾选
  - 未链接但已注册的 CLI 默认未勾选
- 操作:
  - 勾选未链接 CLI → 调用 `linkCli`
  - 取消勾选已链接 CLI → 显示警告弹窗 → 确认后调用 `unlinkCli`
- 按钮: "Done" (关闭弹窗)

### Button Style
- 样式: `bg-app-surface-hover text-app-text` (与 "Open" 按钮一致)
- 图标: 可选使用 `Pencil` 或 `Settings2` 图标

## Success Criteria

1. "Edit" 按钮在 HomePage 项目卡片中可见
2. 点击 "Edit" 弹出 CLI 管理弹窗
3. 勾选/取消勾选 CLI 后，`project.json.linkedCLIs` 正确更新
4. 取消勾选时显示警告弹窗
5. 弹窗关闭后项目列表自动刷新
