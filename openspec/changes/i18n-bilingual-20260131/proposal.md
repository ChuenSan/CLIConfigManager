# Proposal: 双语国际化 (i18n Bilingual Support)

## Context
CLI Config Manager 需要支持中英文双语界面，默认显示中文，用户可在设置页面切换语言。

## Confirmed Constraints (User Approved)
- **i18n Library**: react-i18next
- **Default Language**: zh-CN (中文)
- **Language Switcher**: Settings page
- **Dialog Handling**: Replace native alert/confirm with Radix Dialog

---

## Research Findings

### Text Inventory Summary
| Component | String Count |
|-----------|-------------|
| App.tsx | 30 |
| ProjectDetailPage.tsx | 16 |
| BackupManager.tsx | 15 |
| ColumnView.tsx | 11 |
| FileOpsToolbar.tsx | 6 |
| FilePreview.tsx | 14 |
| **Total** | **~92** |

### Discovered Constraints
| Type | Constraint |
|------|-----------|
| Hard | Native `alert/confirm` cannot be localized → must replace with Radix Dialog |
| Hard | Dynamic text (e.g., `Import (${count})`) requires parameterized translation keys |
| Hard | Tooltip `title` attributes need special handling |
| Soft | One existing Chinese string in App.tsx needs normalization |

---

## Design Specification (Zero-Decision)

### I18N-01: Library Configuration

```typescript
// src/renderer/i18n/index.ts
import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import zhCN from './locales/zh-CN.json'
import enUS from './locales/en-US.json'

i18n.use(initReactI18next).init({
  resources: {
    'zh-CN': { translation: zhCN },
    'en-US': { translation: enUS }
  },
  lng: 'zh-CN', // default
  fallbackLng: 'en-US',
  interpolation: { escapeValue: false }
})

export default i18n
```

### I18N-02: Translation Key Structure

```json
{
  "nav": {
    "projects": "项目",
    "settings": "设置"
  },
  "home": {
    "title": "项目",
    "newProject": "新建项目",
    "noProjects": "暂无项目",
    "configureCliFirst": "请先在设置中配置 CLI 路径"
  },
  "project": {
    "import": "导入",
    "importing": "导入中...",
    "importWithCount": "导入 ({{count}})",
    "apply": "应用到 CLI",
    "applying": "应用中..."
  },
  "settings": {
    "title": "设置",
    "language": "语言",
    "cliRegistry": "CLI 注册表",
    "addCli": "添加 CLI",
    "ignoreRules": "忽略规则"
  },
  "dialog": {
    "confirm": "确认",
    "cancel": "取消",
    "delete": "删除",
    "save": "保存"
  }
}
```

### I18N-03: Language Persistence

```typescript
// Store language preference in settings.json
interface Settings {
  cliRegistry: Record<string, string>
  ignoreRules: IgnoreRules
  language: 'zh-CN' | 'en-US' // NEW
}
```

### I18N-04: Confirm Dialog Component

```typescript
// src/renderer/components/ConfirmDialog.tsx
interface ConfirmDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  onConfirm: () => void
}
```

### I18N-05: Language Switcher UI

Location: Settings page, below "Global Ignore Rules" section

```tsx
<div className="mb-6">
  <h2 className="text-lg font-semibold mb-3">{t('settings.language')}</h2>
  <select
    value={currentLanguage}
    onChange={(e) => changeLanguage(e.target.value)}
    className="px-3 py-2 bg-app-surface border border-app-border rounded-md"
  >
    <option value="zh-CN">中文</option>
    <option value="en-US">English</option>
  </select>
</div>
```

---

## Implementation Files

| File | Changes |
|------|---------|
| `package.json` | Add `i18next`, `react-i18next` |
| `src/renderer/i18n/index.ts` | i18n configuration |
| `src/renderer/i18n/locales/zh-CN.json` | Chinese translations |
| `src/renderer/i18n/locales/en-US.json` | English translations |
| `src/renderer/main.tsx` | Import i18n |
| `src/renderer/App.tsx` | Replace hardcoded strings with `t()` |
| `src/renderer/pages/ProjectDetailPage.tsx` | Replace hardcoded strings |
| `src/renderer/components/BackupManager.tsx` | Replace hardcoded strings |
| `src/renderer/components/ColumnView.tsx` | Replace hardcoded strings |
| `src/renderer/components/FileOpsToolbar.tsx` | Replace hardcoded strings |
| `src/renderer/components/FilePreview.tsx` | Replace hardcoded strings |
| `src/renderer/components/ConfirmDialog.tsx` | NEW: Reusable confirm dialog |
| `src/shared/types.ts` | Add `language` to Settings type |
| `src/main/trpc/router.ts` | Add language update procedure |
| `src/main/services/SettingsService.ts` | Handle language persistence |

---

## Success Criteria

1. All 92 hardcoded strings extracted to translation files
2. Both zh-CN and en-US locale files complete and accurate
3. Language switcher functional in Settings page
4. Language preference persisted across app restarts
5. All native alert/confirm replaced with ConfirmDialog
6. Dynamic text (counts, names) properly interpolated
7. No hardcoded UI text remaining in component files
8. Default language is zh-CN on fresh install
