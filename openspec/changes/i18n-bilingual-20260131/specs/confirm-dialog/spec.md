## ADDED Requirements

### Requirement: ConfirmDialog component
The system SHALL provide a reusable ConfirmDialog component based on Radix Dialog.

#### Scenario: Render confirm dialog
- **WHEN** ConfirmDialog is opened with title and description
- **THEN** modal overlay appears with backdrop blur
- **AND** dialog displays title, description, and action buttons
- **AND** focus is trapped within dialog

#### Scenario: Confirm action
- **WHEN** user clicks confirm button
- **THEN** onConfirm callback is invoked
- **AND** dialog closes

#### Scenario: Cancel action
- **WHEN** user clicks cancel button or presses Escape
- **THEN** dialog closes
- **AND** onConfirm is NOT invoked

### Requirement: ConfirmDialog danger variant
The system SHALL support a danger variant for destructive actions.

#### Scenario: Danger variant styling
- **WHEN** ConfirmDialog is rendered with `variant="danger"`
- **THEN** confirm button displays with danger styling (red)
- **AND** visual emphasis indicates destructive action

### Requirement: ConfirmDialog localization
The system SHALL use translated strings for all ConfirmDialog text.

#### Scenario: Localized button labels
- **WHEN** ConfirmDialog is rendered without custom labels
- **THEN** confirm button shows t('dialog.confirm')
- **AND** cancel button shows t('dialog.cancel')

#### Scenario: Custom button labels
- **WHEN** ConfirmDialog is rendered with `confirmLabel={t('dialog.delete')}`
- **THEN** confirm button shows translated delete text

### Requirement: Replace native alert/confirm
The system SHALL replace all native browser alert/confirm dialogs with ConfirmDialog.

#### Scenario: Delete file confirmation
- **WHEN** user clicks delete on a file
- **THEN** ConfirmDialog appears (not native confirm)
- **AND** dialog text is in current locale language

#### Scenario: Apply changes confirmation
- **WHEN** user clicks "Apply to CLI"
- **THEN** ConfirmDialog appears with warning message
- **AND** message is translated to current locale

#### Scenario: Restore backup confirmation
- **WHEN** user clicks restore on a backup
- **THEN** ConfirmDialog appears with danger variant
- **AND** warning text is in current locale language
