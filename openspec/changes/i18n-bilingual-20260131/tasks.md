# Tasks: 双语国际化 (i18n Bilingual Support)

## 1. Dependencies & Infrastructure

- [x] 1.1 Install i18next and react-i18next packages
- [x] 1.2 Create src/renderer/i18n/index.ts with i18n configuration
- [x] 1.3 Create src/renderer/i18n/locales/zh-CN.json with all Chinese translations
- [x] 1.4 Create src/renderer/i18n/locales/en-US.json with all English translations
- [x] 1.5 Import i18n in src/renderer/main.tsx before App

## 2. ConfirmDialog Component

- [x] 2.1 Create src/renderer/components/ConfirmDialog.tsx with Radix Dialog
- [x] 2.2 Implement default and danger variants
- [x] 2.3 Add localized default button labels

## 3. Settings & Persistence

- [x] 3.1 Add language field to Settings type in src/shared/types.ts
- [x] 3.2 Update DEFAULT_SETTINGS in src/shared/constants.ts with language: 'zh-CN'
- [x] 3.3 Add updateLanguage procedure to src/main/trpc/router.ts
- [x] 3.4 Add language switcher UI to Settings page in App.tsx

## 4. Component Text Replacement - App.tsx

- [x] 4.1 Replace Navigation component hardcoded strings
- [x] 4.2 Replace HomePage hardcoded strings
- [x] 4.3 Replace SettingsPage hardcoded strings
- [x] 4.4 Replace CreateProject dialog strings
- [x] 4.5 Replace EditCLIs dialog strings
- [x] 4.6 Replace AddCLI dialog strings
- [x] 4.7 Replace native confirm in handleRemoveCli with ConfirmDialog

## 5. Component Text Replacement - ProjectDetailPage.tsx

- [x] 5.1 Replace page header and status strings
- [x] 5.2 Replace import/apply button strings
- [x] 5.3 Replace native confirm in handleImport with ConfirmDialog
- [x] 5.4 Replace native confirm in handleApply with ConfirmDialog

## 6. Component Text Replacement - BackupManager.tsx

- [x] 6.1 Replace backup manager header and button strings
- [x] 6.2 Replace backup list item strings
- [x] 6.3 Replace native confirm in handleRestore with ConfirmDialog
- [x] 6.4 Replace native confirm in handleDelete with ConfirmDialog

## 7. Component Text Replacement - ColumnView.tsx

- [x] 7.1 Replace toolbar button strings (Select All, Delete)
- [x] 7.2 Replace empty state strings
- [x] 7.3 Replace native confirm in handleDelete with ConfirmDialog
- [x] 7.4 Replace native alert in rename error with toast or dialog

## 8. Component Text Replacement - FileOpsToolbar.tsx

- [x] 8.1 Replace all toolbar button strings

## 9. Component Text Replacement - FilePreview.tsx

- [x] 9.1 Replace preview header and status strings
- [x] 9.2 Replace edit mode button strings
- [x] 9.3 Replace native confirm in handleDelete with ConfirmDialog
- [x] 9.4 Replace native confirm for unsaved changes with ConfirmDialog

## 10. Verification

- [x] 10.1 Verify all 92 strings are translated
- [x] 10.2 Test language switching in Settings page
- [x] 10.3 Test language persistence across app restart
- [x] 10.4 Verify no hardcoded UI text remains in components
