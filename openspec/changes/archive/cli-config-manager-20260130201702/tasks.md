## 1. Project Setup

- [x] 1.1 Initialize Electron project with electron-vite
- [x] 1.2 Configure TypeScript and path aliases
- [x] 1.3 Install core dependencies (React, Zustand, Radix UI, Tailwind)
- [x] 1.4 Install electron-trpc and configure IPC bridge
- [x] 1.5 Set up single-instance lock in main process

## 2. Shared Types and Constants

- [x] 2.1 Define Settings interface (cliRegistry, ignoreRules)
- [x] 2.2 Define ProjectMeta interface
- [x] 2.3 Define SnapshotMeta interface
- [x] 2.4 Define constants (WORKSPACE_PATH, thresholds)

## 3. Main Process Services

- [x] 3.1 Implement WorkspaceService (init, resolve paths)
- [x] 3.2 Implement SettingsService (read/write settings.json)
- [x] 3.3 Implement IgnoreService (compile ignore rules using `ignore` lib)
- [x] 3.4 Implement ProjectService (CRUD projects, link/unlink CLIs)
- [x] 3.5 Implement SnapshotService (create/list/delete snapshots)
- [x] 3.6 Implement SyncService (import/apply/restore with atomicity)

## 4. tRPC Router

- [x] 4.1 Create tRPC context with workspace root
- [x] 4.2 Define settings router (get, update, addCli, removeCli)
- [x] 4.3 Define projects router (list, create, delete, linkCli, unlinkCli)
- [x] 4.4 Define fileOps router (import, backup, apply, restore)
- [x] 4.5 Define fs router (listDir for ColumnView)

## 5. Renderer Setup

- [x] 5.1 Configure tRPC client in renderer
- [x] 5.2 Set up Tailwind CSS
- [x] 5.3 Create base layout with navigation

## 6. Zustand Stores

- [x] 6.1 Create settingsStore
- [x] 6.2 Create projectStore
- [x] 6.3 Create explorerStore (path stack, selection)

## 7. Settings Page

- [x] 7.1 CLI Registry management UI (add/edit/remove)
- [x] 7.2 Ignore Rules editor UI
- [x] 7.3 Path validation with warning

## 8. Project Management

- [x] 8.1 Project list view
- [x] 8.2 Create project dialog
- [x] 8.3 Project detail page with linked CLIs

## 9. Column View Component

- [x] 9.1 ColumnView container with path stack
- [x] 9.2 Column component with virtualization
- [x] 9.3 ColumnItem with checkbox (cascade selection)
- [x] 9.4 Indeterminate state calculation

## 10. Monaco Editor Integration

- [x] 10.1 Lazy load Monaco Editor
- [x] 10.2 JSON syntax highlighting and validation
- [x] 10.3 Markdown preview toggle
- [x] 10.4 Read-only mode for files > 10MB

## 11. File Operations UI

- [x] 11.1 Import flow with large file warning
- [x] 11.2 Apply flow with selection summary
- [x] 11.3 Backup management view
- [x] 11.4 Restore flow with partial snapshot constraint

## 12. Testing and Polish

- [x] 12.1 Test backup atomicity (simulate failures)
- [x] 12.2 Test ignore rules with edge cases
- [x] 12.3 Test snapshot retention (auto-cleanup)
- [x] 12.4 Final UI polish and error handling
