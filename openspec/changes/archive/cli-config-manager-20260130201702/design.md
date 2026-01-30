# Technical Design: CLI Config Manager

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Electron Application                      │
├─────────────────────────────────────────────────────────────┤
│  Renderer Process (React)                                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ ColumnView  │ │   Editor    │ │  Settings   │            │
│  │  Component  │ │  (Monaco)   │ │    Page     │            │
│  └──────┬──────┘ └──────┬──────┘ └──────┬──────┘            │
│         │               │               │                    │
│  ┌──────┴───────────────┴───────────────┴──────┐            │
│  │              Zustand Store                   │            │
│  │  (settings, projects, explorer, selection)  │            │
│  └──────────────────────┬──────────────────────┘            │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────┐            │
│  │           electron-trpc Client               │            │
│  └──────────────────────┬──────────────────────┘            │
├─────────────────────────┼───────────────────────────────────┤
│  Preload Script         │                                    │
│  ┌──────────────────────┴──────────────────────┐            │
│  │              IPC Bridge                      │            │
│  └──────────────────────┬──────────────────────┘            │
├─────────────────────────┼───────────────────────────────────┤
│  Main Process (Node.js) │                                    │
│  ┌──────────────────────┴──────────────────────┐            │
│  │           electron-trpc Router               │            │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐        │            │
│  │  │settings │ │projects │ │ fileOps │        │            │
│  │  └────┬────┘ └────┬────┘ └────┬────┘        │            │
│  └───────┼───────────┼───────────┼─────────────┘            │
│          │           │           │                           │
│  ┌───────┴───────────┴───────────┴─────────────┐            │
│  │              Services Layer                  │            │
│  │  SettingsService, ProjectService,           │            │
│  │  SnapshotService, SyncService, IgnoreService│            │
│  └──────────────────────┬──────────────────────┘            │
│                         │                                    │
│  ┌──────────────────────┴──────────────────────┐            │
│  │           File System (Node fs)              │            │
│  └─────────────────────────────────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

## Directory Structure

```
cli-config-manager/
├── package.json
├── electron.vite.config.ts
├── tsconfig.json
├── src/
│   ├── main/                      # Main process
│   │   ├── index.ts               # Entry point
│   │   ├── trpc/
│   │   │   ├── router.ts          # tRPC router
│   │   │   └── context.ts         # tRPC context
│   │   └── services/
│   │       ├── SettingsService.ts
│   │       ├── ProjectService.ts
│   │       ├── SnapshotService.ts
│   │       ├── SyncService.ts
│   │       └── IgnoreService.ts
│   ├── preload/
│   │   └── index.ts               # Preload script
│   ├── renderer/                  # Renderer process
│   │   ├── index.html
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── trpc/
│   │   │   └── client.ts
│   │   ├── stores/
│   │   │   ├── settingsStore.ts
│   │   │   ├── projectStore.ts
│   │   │   └── explorerStore.ts
│   │   ├── components/
│   │   │   ├── ColumnView/
│   │   │   │   ├── ColumnView.tsx
│   │   │   │   ├── Column.tsx
│   │   │   │   └── ColumnItem.tsx
│   │   │   ├── Editor/
│   │   │   │   ├── MonacoEditor.tsx
│   │   │   │   └── MarkdownPreview.tsx
│   │   │   └── ui/                # Radix UI primitives
│   │   └── pages/
│   │       ├── HomePage.tsx
│   │       ├── ProjectPage.tsx
│   │       └── SettingsPage.tsx
│   └── shared/                    # Shared types
│       ├── types.ts
│       └── constants.ts
└── resources/                     # App icons
```

## Data Flow

### Import Flow
```
User clicks Import
    ↓
Renderer: trpc.fileOps.import.mutate({ project, cli })
    ↓
Main: SyncService.import()
    ├── IgnoreService.compile(cli)
    ├── Read installPath recursively (skip symlinks)
    ├── Filter by ignore rules
    ├── Check large files (>100MB) → return warning list
    ↓
Renderer: Show confirmation if large files exist
    ↓
Main: Copy files to Working Copy
    ↓
Renderer: Refresh explorer
```

### Apply Flow (with Auto-Backup)
```
User clicks Apply
    ↓
Renderer: trpc.fileOps.apply.mutate({ project, cli, selection })
    ↓
Main: SyncService.apply()
    ├── 1. Create backup (SnapshotService.create)
    │   ├── Create bak{timestamp}.tmp directory
    │   ├── Copy files from installPath
    │   ├── Write meta.json
    │   ├── Rename to bak{timestamp} (atomic commit)
    │   └── On failure: delete .tmp, abort
    ├── 2. Apply changes
    │   ├── Copy selected files to installPath
    │   └── On failure: auto-restore from backup
    └── 3. Cleanup old snapshots (keep max 5)
    ↓
Renderer: Show result
```

## Key Implementation Details

### 1. Timestamp Generation (BR-11)
```typescript
function generateTimestamp(): string {
  const now = new Date();
  const pad = (n: number, len: number) => n.toString().padStart(len, '0');
  return [
    now.getUTCFullYear(),
    pad(now.getUTCMonth() + 1, 2),
    pad(now.getUTCDate(), 2),
    pad(now.getUTCHours(), 2),
    pad(now.getUTCMinutes(), 2),
    pad(now.getUTCSeconds(), 2),
    pad(now.getUTCMilliseconds(), 3)
  ].join('');
}
```

### 2. Ignore Rules (BR-07)
```typescript
import ignore from 'ignore';

class IgnoreService {
  compile(cli: string, settings: Settings): ReturnType<typeof ignore> {
    const ig = ignore();
    ig.add(settings.ignoreRules.global);
    ig.add(settings.ignoreRules.perCli[cli] || []);
    return ig;
  }

  isIgnored(ig: ReturnType<typeof ignore>, relativePath: string): boolean {
    return ig.ignores(relativePath.replace(/\\/g, '/'));
  }
}
```

### 3. Atomic Backup (BR-09)
```typescript
async createSnapshot(options: SnapshotOptions): Promise<SnapshotResult> {
  const timestamp = generateTimestamp();
  const tempDir = path.join(backupDir, `bak${timestamp}.tmp`);
  const finalDir = path.join(backupDir, `bak${timestamp}`);

  try {
    await fs.mkdir(tempDir, { recursive: true });
    await this.copyFiles(source, tempDir, options);
    await this.writeMeta(tempDir, options);
    await fs.rename(tempDir, finalDir); // Atomic commit
    return { success: true, path: finalDir };
  } catch (error) {
    await fs.rm(tempDir, { recursive: true, force: true }); // Rollback
    throw error;
  }
}
```

### 4. Sparse Selection Model (Column View)
```typescript
interface SelectionState {
  // Only store explicit overrides
  overrides: Map<string, 'checked' | 'unchecked'>;
}

function getEffectiveState(path: string, overrides: Map<string, string>): 'checked' | 'unchecked' | 'indeterminate' {
  // Check exact match
  if (overrides.has(path)) return overrides.get(path) as 'checked' | 'unchecked';

  // Check ancestors (nearest wins)
  const parts = path.split('/');
  for (let i = parts.length - 1; i >= 0; i--) {
    const ancestor = parts.slice(0, i).join('/');
    if (overrides.has(ancestor)) return overrides.get(ancestor) as 'checked' | 'unchecked';
  }

  return 'unchecked'; // Default
}
```

### 5. Single Instance Lock (BR-16)
```typescript
// main/index.ts
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}
```

## Technology Stack

| Layer | Technology |
|-------|------------|
| Framework | Electron 28+ |
| Build Tool | electron-vite |
| Frontend | React 18 |
| State | Zustand |
| IPC | electron-trpc |
| UI | Radix UI + Tailwind CSS |
| Editor | Monaco Editor |
| Glob | ignore (npm) |
| Validation | Zod |

## File Size Thresholds

| Threshold | Action |
|-----------|--------|
| > 100MB | Warning before Import/Backup/Apply |
| > 10MB | Monaco opens as read-only |
| > 5 snapshots | Auto-delete oldest |
