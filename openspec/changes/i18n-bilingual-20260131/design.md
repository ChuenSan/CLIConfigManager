# Design: 双语国际化 (i18n Bilingual Support)

## Context

CLI Config Manager 是一个 Electron + React + TypeScript 桌面应用，当前所有 UI 文本硬编码在组件中（约 92 个字符串）。需要实现中英文双语支持，默认中文，用户可切换。

当前状态：
- 无 i18n 基础设施
- 使用原生 `alert/confirm` 对话框（无法本地化）
- 已有 Radix UI Dialog 依赖可复用
- Settings 通过 tRPC + JSON 文件持久化

## Goals / Non-Goals

**Goals:**
- 所有 UI 文本可翻译（中/英）
- 语言偏好持久化
- 原生对话框替换为可翻译组件
- 动态文本支持插值

**Non-Goals:**
- 日期/数字格式本地化（当前无此需求）
- 复数形式处理（中文无复数）
- RTL 语言支持
- 翻译文件懒加载（文件小，无需拆分）

## Decisions

### D1: i18n 库选择 → react-i18next

**选择**: react-i18next + i18next
**替代方案**: react-intl (FormatJS)

| 考量 | react-i18next | react-intl |
|-----|---------------|------------|
| 动态切换 | 内置 `changeLanguage()` | 需手动实现 |
| TypeScript | 自动生成类型 | 内置但较弱 |
| 包大小 | 22KB | 18KB |
| 插值语法 | `{{count}}` | ICU `{count}` |

**理由**: 内置动态切换简化实现，Electron 生态插件丰富。

### D2: 翻译文件格式 → 静态 JSON 导入

**选择**: 编译时导入 JSON 文件
**替代方案**: 运行时 HTTP/文件系统加载

```typescript
// 选择方案：静态导入
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

// 替代方案：动态加载
i18n.use(Backend).init({ backend: { loadPath: '/locales/{{lng}}.json' } })
```

**理由**:
- 翻译文件小（<10KB），无需懒加载
- 静态导入有 TypeScript 类型检查
- 避免运行时文件路径问题

### D3: 语言持久化 → settings.json

**选择**: 复用现有 Settings 服务
**替代方案**: localStorage / 独立配置文件

```typescript
// settings.json
{
  "cliRegistry": {...},
  "ignoreRules": {...},
  "language": "zh-CN"  // 新增字段
}
```

**理由**:
- 复用现有 tRPC 基础设施
- 与其他设置统一管理
- 主进程可访问（未来菜单本地化）

### D4: 对话框替换 → 通用 ConfirmDialog 组件

**选择**: 基于 Radix Dialog 的通用确认组件
**替代方案**: 每处单独实现 / 第三方库

```typescript
// 通用组件 API
<ConfirmDialog
  open={open}
  title={t('dialog.deleteTitle')}
  description={t('dialog.deleteDesc', { name })}
  variant="danger"
  onConfirm={handleDelete}
/>
```

**理由**:
- 项目已有 @radix-ui/react-dialog 依赖
- 统一样式和行为
- 支持 danger/default 变体

### D5: 初始化时机 → main.tsx 顶层

**选择**: 在 React 渲染前初始化 i18n
**替代方案**: 在 App 组件内初始化

```typescript
// main.tsx
import './i18n'  // 先初始化
import App from './App'

ReactDOM.createRoot(...).render(<App />)
```

**理由**: 确保首次渲染即有翻译，避免闪烁。

### D6: 翻译键命名 → 模块.功能 结构

**选择**: 扁平化两级结构 `module.key`
**替代方案**: 深层嵌套 / 完全扁平

```json
{
  "nav.projects": "项目",
  "home.newProject": "新建项目",
  "dialog.confirm": "确认"
}
```

**理由**:
- 两级足够组织 92 个键
- 避免深层嵌套的类型复杂度
- 便于按模块查找

## Risks / Trade-offs

| 风险 | 缓解措施 |
|-----|---------|
| 翻译遗漏 | 使用 `i18next-scanner` 提取所有 `t()` 调用，对比翻译文件 |
| 键名拼写错误 | TypeScript 类型检查 + IDE 自动补全 |
| 动态文本插值错误 | 单元测试覆盖带参数的翻译 |
| 语言切换后状态丢失 | 仅切换 i18n 语言，不重载页面 |
| 首次加载闪烁 | 同步初始化 + 默认语言内联 |

## Migration Plan

1. **Phase 1**: 基础设施
   - 安装依赖
   - 创建 i18n 配置和翻译文件
   - 添加 ConfirmDialog 组件

2. **Phase 2**: 文本替换
   - 逐组件替换硬编码字符串
   - 替换原生 alert/confirm

3. **Phase 3**: 集成
   - Settings 页面添加语言切换器
   - 持久化语言偏好
   - 启动时恢复语言设置

**回滚**: 删除 i18n 导入，恢复硬编码字符串（Git revert）
