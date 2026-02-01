# CLI Config Manager

AI CLI 配置文件统一管理工具。集中管理 Claude Code、Cursor、Windsurf 等 AI CLI 工具的配置文件，支持项目级快照备份与恢复。

## 功能特性

- **项目级管理** - 通过"项目"容器统一管理多个 CLI 配置
- **分栏视图** - 类 Finder 的 Column View，直观浏览文件结构
- **快照备份** - Apply 前自动备份，支持一键恢复
- **忽略规则** - Glob 语法过滤，精确控制同步范围
- **附加文件** - 支持备份 CLI 目录外的单独配置文件
- **双语支持** - 中文/英文界面切换

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | Electron 28 |
| 构建 | electron-vite |
| 前端 | React 18 + TypeScript |
| 状态 | Zustand |
| IPC | electron-trpc |
| UI | Radix UI + Tailwind CSS |
| 验证 | Zod |

## 快速开始

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建

```bash
# 构建应用
npm run build

# 打包当前平台
npm run dist

# 打包指定平台
npm run dist:win    # Windows
npm run dist:mac    # macOS
npm run dist:linux  # Linux
```

## 项目结构

```
src/
├── main/                 # 主进程
│   ├── index.ts          # 入口
│   ├── trpc/             # tRPC 路由
│   └── services/         # 业务服务
│       ├── SettingsService.ts
│       ├── ProjectService.ts
│       ├── SnapshotService.ts
│       ├── SyncService.ts
│       └── IgnoreService.ts
├── preload/              # 预加载脚本
├── renderer/             # 渲染进程
│   ├── App.tsx           # 主组件
│   ├── stores/           # Zustand 状态
│   └── i18n/             # 国际化
└── shared/               # 共享类型和常量
```

## 核心概念

| 术语 | 说明 |
|------|------|
| CLI Registry | 全局注册表，记录 CLI 名称与安装路径的映射 |
| Project | 项目容器，包含多个 CLI 的工作副本和快照 |
| Working Copy | 项目内的 CLI 配置副本，用于编辑 |
| Snapshot | 目录级快照备份，Apply 前自动创建 |
| Ignore Rules | Glob 语法过滤规则 |

## 工作流程

1. **注册 CLI** - 在设置中添加 CLI 及其安装路径
2. **创建项目** - 选择要管理的 CLI 创建项目
3. **导入配置** - 从 CLI 安装目录导入到工作副本
4. **编辑配置** - 在工作副本中修改配置文件
5. **应用更改** - 将修改同步回 CLI 安装目录（自动备份）
6. **恢复快照** - 如需回滚，从快照恢复

## 数据存储

应用数据存储在 `%APPDATA%/CLIConfigManager/`：

```
CLIConfigManager/
├── settings.json         # 全局设置
└── Projects/
    └── <project-name>/
        ├── project.json  # 项目元数据
        ├── <cli-name>/   # 工作副本
        └── backup/       # 快照目录
```

## 发布

推送版本标签后，GitHub Actions 自动构建并发布：

```bash
git tag v1.0.0
git push origin main --tags
```

## License

MIT
