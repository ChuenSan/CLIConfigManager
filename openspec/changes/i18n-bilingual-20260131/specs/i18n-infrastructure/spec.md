## ADDED Requirements

### Requirement: i18n library initialization
The system SHALL initialize react-i18next before React rendering to ensure translations are available on first render.

#### Scenario: App startup with default language
- **WHEN** application starts for the first time
- **THEN** UI displays in Chinese (zh-CN)
- **AND** no translation keys are visible to user

#### Scenario: App startup with saved language preference
- **WHEN** application starts with language set to "en-US" in settings
- **THEN** i18n initializes with English locale
- **AND** UI displays in English immediately

### Requirement: Translation file structure
The system SHALL use static JSON imports for translation files with two-level key structure (module.key).

#### Scenario: Translation key lookup
- **WHEN** component calls `t('home.newProject')`
- **THEN** system returns "新建项目" for zh-CN locale
- **AND** returns "New Project" for en-US locale

#### Scenario: Missing translation key
- **WHEN** component calls `t('nonexistent.key')`
- **THEN** system returns the key itself as fallback
- **AND** logs warning in development mode

### Requirement: Dynamic text interpolation
The system SHALL support variable interpolation in translation strings using `{{variable}}` syntax.

#### Scenario: Count interpolation
- **WHEN** component calls `t('project.importWithCount', { count: 5 })`
- **THEN** system returns "导入 (5)" for zh-CN
- **AND** returns "Import (5)" for en-US

#### Scenario: Name interpolation
- **WHEN** component calls `t('dialog.deleteFile', { name: 'config.json' })`
- **THEN** system returns "删除 "config.json"？" for zh-CN
- **AND** returns "Delete "config.json"?" for en-US

### Requirement: All UI text externalized
The system SHALL have no hardcoded user-facing text in component files.

#### Scenario: Component text verification
- **WHEN** developer searches for quoted strings in component files
- **THEN** only technical strings (CSS classes, IDs, paths) are found
- **AND** all user-facing text uses `t()` function

### Requirement: Translation completeness
The system SHALL have complete translations for both zh-CN and en-US locales.

#### Scenario: Locale file parity
- **WHEN** comparing zh-CN.json and en-US.json
- **THEN** both files have identical key structure
- **AND** no keys are missing in either file
