# UI Components Capability

## ADDED Requirements

### Requirement: Column View Navigation
The system SHALL provide Finder-like column view for file browsing.

#### Scenario: Navigate Directory Hierarchy
**Given** project "MyProject" has CLI "AAA" with nested directories
**When** user clicks on "AAA" folder in column 1
**Then** column 2 displays contents of AAA/
**And** when user clicks on "settings" subfolder in column 2
**Then** column 3 displays contents of AAA/settings/

#### Scenario: File Selection Shows Editor
**Given** user is viewing column with files
**When** user clicks on "config.json"
**Then** right panel displays Monaco Editor with file contents
**And** JSON syntax highlighting is applied

---

### Requirement: Checkbox Cascade Selection
The system SHALL support cascading checkbox selection for file operations.

#### Scenario: Select Directory Selects All Children
**Given** directory "settings/" contains 3 files
**When** user checks the checkbox for "settings/"
**Then** all 3 files within are automatically checked
**And** "settings/" checkbox shows checked state

#### Scenario: Partial Selection Shows Indeterminate
**Given** directory "settings/" contains 3 files
**When** user checks 1 of 3 files
**Then** "settings/" checkbox shows indeterminate state
**And** when user checks remaining 2 files
**Then** "settings/" checkbox shows checked state

#### Scenario: Uncheck Parent Unchecks Children
**Given** directory "settings/" is fully checked
**When** user unchecks "settings/"
**Then** all child files are unchecked

---

### Requirement: Monaco Editor Integration
The system SHALL provide Monaco Editor for JSON and Markdown files.

#### Scenario: JSON Editing with Validation
**Given** user opens "config.json"
**Then** Monaco Editor displays with JSON syntax highlighting
**And** format button is available
**And** when user introduces invalid JSON syntax
**Then** error markers appear inline

#### Scenario: Markdown Preview Toggle
**Given** user opens "README.md"
**Then** Monaco Editor displays with Markdown syntax highlighting
**And** preview toggle button is available
**And** when user clicks preview toggle
**Then** rendered Markdown preview is displayed

#### Scenario: Large File Read-Only Mode
**Given** file "large_data.json" is 15MB
**When** user opens this file
**Then** Monaco Editor opens in read-only mode
**And** notification displays: "File exceeds 10MB, opened as read-only"

---

### Requirement: Single Instance Enforcement
The system SHALL prevent multiple application instances.

#### Scenario: Second Instance Blocked
**Given** application instance A is running
**When** user attempts to launch instance B
**Then** instance B exits immediately
**And** instance A window is brought to foreground
**And** no workspace corruption occurs
