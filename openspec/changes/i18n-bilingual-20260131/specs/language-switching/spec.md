## ADDED Requirements

### Requirement: Language switcher in Settings
The system SHALL provide a language selection control in the Settings page.

#### Scenario: Display language options
- **WHEN** user navigates to Settings page
- **THEN** language selector is visible below "Global Ignore Rules" section
- **AND** shows current language as selected
- **AND** offers "中文" and "English" options

#### Scenario: Switch to English
- **WHEN** user selects "English" from language dropdown
- **THEN** UI immediately updates to English
- **AND** no page reload occurs
- **AND** all visible text changes to English

#### Scenario: Switch to Chinese
- **WHEN** user selects "中文" from language dropdown
- **THEN** UI immediately updates to Chinese
- **AND** no page reload occurs
- **AND** all visible text changes to Chinese

### Requirement: Language preference persistence
The system SHALL persist language preference in settings.json.

#### Scenario: Save language preference
- **WHEN** user changes language to "en-US"
- **THEN** settings.json is updated with `"language": "en-US"`
- **AND** change is persisted to disk

#### Scenario: Restore language on restart
- **WHEN** application restarts after user set language to "en-US"
- **THEN** application loads with English UI
- **AND** language selector shows "English" as selected

### Requirement: Default language for new installations
The system SHALL default to Chinese (zh-CN) for new installations.

#### Scenario: Fresh installation
- **WHEN** application runs for first time (no settings.json)
- **THEN** UI displays in Chinese
- **AND** settings.json is created with `"language": "zh-CN"`
