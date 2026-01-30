
# AI 配置文件统一管理工具 PRD

| 文档版本 | v0.2 |
| :--- | :--- |
| 适用平台 | Windows (优先), macOS (后续) |
| 核心理念 | 一切皆文件；仅项目级管理；相对路径映射；全目录快照备份 |
| 最后更新 | 2026-01-30 |

## 1. 背景与目标

### 1.1 背景
开发者本机常安装多个 CLI 工具（如 AAA, BBB, CCC），其配置文件通常散落在用户目录下的隐藏文件夹中（如 `C:\Users\a\.AAA`）。这些文件缺乏统一管理，版本混乱，且难以在不同项目或环境间快速切换配置。

### 1.2 产品目标
1. 统一项目级管理：放弃分散的 CLI 管理视角，强制通过“项目（Project）”容器来管理一组 CLI 配置。
2. 可视化交互：提供类似 Finder/Explorer 的 Column View（分栏视图），支持 MD/JSON 的预览与编辑。
3. 零入侵安全机制：
   - Workspace 纯净：Workspace 内不生成 `.bak` 单文件垃圾。
   - 全量快照：Apply 前自动进行目录级快照，支持时光机式的一键恢复。
4. 精细化过滤：支持 Glob 语法的忽略规则（Ignore Rules），贯穿导入、备份、生效全流程。

### 1.3 范围边界 (MVP)
- 包含：Windows 客户端、项目级目录管理、文件编辑、导入/Apply/Restore 流、Glob 过滤。
- 不包含：CLI 配置的语义级解析（API 扩展）、Git 集成、云同步、macOS 正式版。

---

## 2. 核心术语定义

| 术语 | 定义 |
| :--- | :--- |
| Workspace | 本应用的工作根目录。仅存放 `Projects/` 数据和全局设置。 |
| Project | 一个逻辑单元，包含一组 CLI 的工作副本（Working Copy）和历史快照。 |
| CLI Registry | 全局注册表，记录 CLI 名称与其本地安装路径（`installPath`）的映射关系。 |
| installPath | CLI 在操作系统中的实际安装/配置目录（源/目标），如 `C:\Users\a\.AAA`。 |
| Working Copy | 位于 `Project/<CLI>/` 下的文件，用户在此处查看、编辑、勾选。 |
| Backup Snapshot | 位于 `Project/backup/bak{timestamp}/` 下的目录快照。不做单文件备份。 |
| Snapshot Type | 快照类型：`full`（全量）或 `partial`（局部）。用于约束可恢复范围。 |
| Ignore Rules | Glob 语法的过滤规则；命中路径在 Import/Backup/Apply 中均被跳过。 |

---

## 3. 总体业务规则 (Constraints)

### 3.1 仅项目级目录
- 程序不维护 Workspace 级别的 CLI 分类池。
- 所有配置操作必须依附于某个具体的“项目”。

### 3.2 强制路径配置
- 用户首次使用或创建项目前，必须在全局设置（Settings）中配置 CLI 的 `installPath`。
- 未配置路径的 CLI 无法被添加到项目中。

### 3.3 相对路径映射 (Relative Path Mapping)
- 系统通过相对路径在 `installPath` 和 `Working Copy` 之间同步。
- 结构对应关系：`installPath/config.json` <==> `Workspace/Projects/P1/AAA/config.json`。

### 3.4 备份策略：目录快照（无 .bak）
- 严禁生成单文件 `.bak`（如 `config.json.bak`）。
- 自动备份：点击 Apply 时强制触发。
- 手动备份：Import 前或随时点击“备份”按钮触发。
- 快照目录结构：备份为原目录结构的复制，存放在 `backup/bak{timestamp}/`。
- 快照类型（Snapshot Type）：
  - `full`：备份某 CLI 的完整目录树（服从 Ignore）。
  - `partial`：仅备份本次勾选 Apply 涉及的最小子树（服从 Ignore）。

### 3.5 忽略规则 (Ignore Rules)
- 全局统一：Import、Backup、Apply 三个动作共用同一套 Ignore Rules。
- 效果：凡是命中规则的文件/文件夹，视为“不存在”，不读取、不复制、不覆盖。
- 注意：Restore 默认不受 Ignore Rules 影响（见 7.5）。

---

## 4. 目录结构规范

```text
Workspace/
├── app.exe
├── settings.json                   # 全局配置（CLI 注册表、全局 Ignore）
└── Projects/
    └── MyProject/                  # 项目目录
        ├── project.json            # 项目元数据
        ├── AAA/                    # [工作副本] AAA 的配置
        │   ├── config.json
        │   └── subfolder/
        ├── BBB/                    # [工作副本] BBB 的配置
        └── backup/                 # [备份仓库]
            ├── bak20260130152301/  # 一次快照
            │   ├── meta.json       # 快照元数据（推荐）
            │   ├── AAA/
            │   └── BBB/
            └── bak20260130160000/
```

### 4.1 时间戳格式

- 格式：`yyyyMMddHHmmss`（纯数字）
- 示例：`bak20260130152301`

------

## 5. 配置文件详情

### 5.1 settings.json (全局)

```json
{
  "cliRegistry": {
    "AAA": { "installPath": "C:\\Users\\a\\.AAA" },
    "CCC": { "installPath": "D:\\Tools\\CCC_Config" }
  },
  "ignoreRules": {
    "global": ["**/*.log", "**/.DS_Store", "**/tmp/"],
    "perCli": {
      "AAA": ["**/session.cache"],
      "CCC": []
    }
  }
}
```

### 5.2 project.json (项目级)

```json
{
  "projectName": "MyProject",
  "createdTime": "2026-01-30T10:00:00Z",
  "linkedCLIs": {
    "AAA": { "snapshotInstallPath": "C:\\Users\\a\\.AAA" },
    "CCC": { "snapshotInstallPath": "D:\\Tools\\CCC_Config" }
  }
}
```

注：记录 `snapshotInstallPath` 是为了防止全局设置变更后，旧项目的映射关系失效。

### 5.3 快照元数据 meta.json（推荐）

每次生成快照时写入元数据，便于 UI 展示和约束恢复能力：

```json
{
  "timestamp": "20260130152301",
  "snapshotType": "full",
  "includedCLIs": ["AAA", "BBB"],
  "source": "auto-apply-backup",
  "createdTime": "2026-01-30T15:23:01Z",
  "notes": ""
}
```

------

## 6. 忽略规则 (Ignore Rules) 语法

### 6.1 语法标准

采用标准 Glob 语法：

- `*`：匹配文件名中的任意字符。
- `**`：递归匹配任意目录层级。
- `/` 结尾：明确指定为目录。

### 6.2 判读流程

1. 读取 `settings.json` 中的 `global` 规则。
2. 读取 `settings.json` 中 `perCli` 的特定规则。
3. 合并规则集合。
4. 将待处理文件的相对路径与规则进行匹配；命中则跳过。

------

## 7. 核心功能流程

### 7.1 初始化与设置

- 前置条件：应用启动时检查 CLI Registry。
- 空状态：若注册表为空，首页引导用户前往“设置”页。
- 设置页功能：
  - 添加/编辑/删除 CLI（名称 + 路径）。
  - 编辑 Ignore Rules。

### 7.2 新建项目与导入 (Import)

#### 7.2.1 交互流程

1. 用户点击“新建项目”。
2. 输入项目名称（校验重名）。
3. 勾选需要纳管的 CLI（多选）。
4. 弹出导入确认窗：
   - 文案：“即将从系统安装目录复制配置到项目工作区”。
   - 操作按钮：
     - [ 备份 ]：先对源目录做快照（手动）。
     - [ 开始导入 ]：执行复制（Import）。
     - [ 取消 ]。

#### 7.2.2 备份逻辑 (Pre-Import 手动备份)

- 源：`installPath`
- 目标：`Project/backup/bak{timestamp}/<CLI>/`
- 类型：默认 `full`
- 规则：服从 Ignore Rules
- 时序：点击按钮 -> 创建目录 -> 复制文件 -> 生成 meta.json -> 提示成功 -> 停留在确认窗允许继续导入

#### 7.2.3 导入逻辑 (Import Execute)

- 源：`installPath`
- 目标：`Project/<CLI>/`
- 规则：递归复制，服从 Ignore Rules
- 结果：生成 `project.json`，跳转至项目浏览视图

### 7.3 项目浏览与编辑 (GUI)

#### 7.3.1 Column View (分栏视图)

- 层级逻辑：`Project Root` -> `CLI Folders` -> `Subfolders` -> `Files`
- 交互细节：
  - 单选文件夹：下一列展开内容
  - 单选文件：右侧面板显示编辑器
  - 复选框（Checkbox）：每个节点前有复选框，支持 Shift 连选和父子级联勾选（勾父全选子）
  - 目录勾选语义：勾选目录等价于勾选该目录下所有“非 ignore”的文件（递归）

#### 7.3.2 编辑器

- 支持格式：JSON（高亮、格式化按钮）、MD（预览/源码切换）、纯文本
- 保存机制：修改即保存（或 Ctrl+S），直接写入 Working Copy

### 7.4 生效 (Apply)

#### 7.4.1 范围选择

用户在 Column View 中勾选文件或文件夹（支持部分勾选）。

#### 7.4.2 自动备份 (Auto-Backup，强制)

- 触发：点击 Apply 后，写文件前立即执行。
- 范围与类型：
  - 全量 Apply：备份该 CLI 的完整安装目录，生成 `snapshotType = full`
  - 勾选 Apply：仅备份被勾选路径涉及的最小目录树，生成 `snapshotType = partial`
- 流程：`installPath` -> `Project/backup/bak{timestamp}/`
- 规则：服从 Ignore Rules
- 备份成功判定（严格）：
  - 若复制过程中出现任何失败文件/目录（权限、占用、路径过长等），视为备份失败
  - 备份失败必须立即回滚：删除本次 `bak{timestamp}` 目录（含 meta.json），并中止 Apply，提示错误与失败清单

#### 7.4.3 写入逻辑 (Write)

- 源：Working Copy（被勾选部分）
- 目标：installPath
- 规则：基于相对路径映射，服从 Ignore Rules
- 覆盖策略：
  - 目标存在：覆盖（Overwrite）
  - 目标不存在：创建（Create）
  - 注意：不执行删除操作（即 Project 中不存在但 Target 中存在的文件保持原样）

### 7.5 恢复 (Restore)

#### 7.5.1 交互流程

1. 用户进入“备份管理”或点击“一键恢复”。
2. 选择一个历史快照（`bak{timestamp}`）。
3. 系统展示该快照内的文件结构（Column View）。
4. 用户勾选需要恢复的内容（默认全选）。
5. 点击 [ 确认恢复 ]。

#### 7.5.2 快照类型约束（关键规则）

- 若选择的快照 `snapshotType = partial`：
  - 禁止执行“全量恢复整个 CLI/项目”的一键操作
  - UI 提示：“该快照为局部备份，仅能恢复快照中包含的范围”
  - 仅允许按快照内可见内容进行恢复（用户可勾选子集）
- 若 `snapshotType = full`：
  - 允许一键全量恢复该 CLI（或项目内所有 CLI，取决于快照包含范围）

#### 7.5.3 执行逻辑（Restore 默认不受 Ignore 影响）

- 源：`Project/backup/bak{timestamp}/...`
- 目标：`installPath`
- 规则：
  - 基于相对路径覆盖
  - 默认不应用 Ignore Rules（确保时光机一致性）
- 风险提示（必须）：
  - 在恢复确认前提示：“恢复将忽略当前 Ignore Rules，可能覆盖被你标记为忽略的文件/目录”
  - 可选开关（高级）：[ ] 恢复时遵循 Ignore Rules（不推荐）
- 反馈：Toast 提示“已成功恢复 X 个文件”；如有失败文件，弹窗列出失败清单

------

## 8. CLI 变更管理

### 8.1 添加 CLI (Add)

- 项目设置 -> 添加 CLI -> 选择列表
- 流程同 7.2（含手动备份选项；手动备份默认生成 full 快照）

### 8.2 移除 CLI (Remove)

- 行为：
  1. 从 `project.json` 移除记录
  2. 物理删除 `Project/<CLI>/` 文件夹
  3. 保留 `backup/` 中的历史数据
- 警示：弹窗必须使用红色高亮警示：
  “此操作将永久删除项目内的该 CLI 配置副本，但不会影响系统安装目录和历史备份。”

------

## 9. 异常处理

| 场景                         | 行为                                                         |
| ---------------------------- | ------------------------------------------------------------ |
| installPath 不存在/不可读    | Import/Backup 报错，阻止操作。UI 提示用户检查设置。          |
| installPath 权限拒绝 (EPERM) | Apply/Restore 失败。提示用户“请以管理员身份运行”或“关闭占用文件的程序”。 |
| 磁盘空间不足                 | 备份阶段写入失败：立即回滚（删除不完整的备份文件夹），中止流程。 |
| 文件被占用 (Locked)          | 备份阶段：视为失败并回滚；Restore/Apply 写入阶段：记录失败清单并提示。 |

------

## 10. 验收标准 (MVP)

1. 设置强依赖：未配置 CLI 路径时，新建项目入口置灰或点击报错。
2. 备份原子性：Apply 操作必须在备份完整成功后，才开始修改 installPath；备份过程中任一失败即回滚并阻断。
3. 无残留：任何操作均不在 Workspace 或 installPath 中生成 `.bak` 后缀文件。
4. 过滤生效：配置 Ignore `*.log` 后，Import 不导入 log；Apply 也不会将 Working Copy 中命中 ignore 的文件复制到 installPath。
5. 恢复有效性：修改配置 -> Apply -> 发现错误 -> Restore，CLI 必须能恢复到修改前的状态；Restore 默认不受 Ignore 影响且有风险提示。
6. 局部快照约束：partial 快照无法执行一键全量恢复，仅能恢复快照包含范围；UI 有明确提示。