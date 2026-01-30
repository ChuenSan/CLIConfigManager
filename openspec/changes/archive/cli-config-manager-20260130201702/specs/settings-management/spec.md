# Settings Management Capability

## ADDED Requirements

### Requirement: CLI Registry Management
The system SHALL maintain a global registry of CLI names and their installPaths.

#### Scenario: Add CLI to Registry
**Given** settings.cliRegistry is empty
**When** user adds CLI "AAA" with installPath "C:\Users\a\.AAA"
**Then** settings.json contains cliRegistry.AAA.installPath = "C:\Users\a\.AAA"
**And** CLI "AAA" is available for project linking

#### Scenario: Reject Duplicate CLI Case Insensitive
**Given** CLI "AAA" is already registered
**When** user attempts to add CLI "aaa" or "Aaa"
**Then** operation fails with error "CLI already exists (case-insensitive)"
**And** no duplicate entry is created

#### Scenario: Validate installPath Exists
**Given** user attempts to add CLI with installPath "C:\NonExistent\Path"
**When** the path does not exist on filesystem
**Then** warning is displayed: "Path does not exist"
**And** user can choose to proceed or cancel

---

### Requirement: Ignore Rules Configuration
The system SHALL support global and per-CLI ignore rules using .gitignore syntax.

#### Scenario: Global Ignore Rule
**Given** global ignoreRules contains "**/*.log"
**When** Import/Backup/Apply encounters "debug.log" or "logs/app.log"
**Then** these files are skipped and treated as non-existent

#### Scenario: Per-CLI Ignore Rule
**Given** perCli.AAA ignoreRules contains "**/session.cache"
**When** importing CLI "AAA" with file "session.cache"
**Then** session.cache is skipped
**And** when importing CLI "BBB" with file "session.cache"
**Then** session.cache is imported because rule only applies to AAA

#### Scenario: Ignore Rule Negation
**Given** global ignoreRules contains ["**/*.log", "!important.log"]
**When** Import encounters "debug.log" and "important.log"
**Then** debug.log is skipped
**And** important.log is imported

---

### Requirement: Workspace Initialization
The system SHALL initialize workspace at %APPDATA%/CLIConfigManager/.

#### Scenario: First Launch Initialization
**Given** %APPDATA%/CLIConfigManager/ does not exist
**When** application starts for the first time
**Then** directory %APPDATA%/CLIConfigManager/ is created
**And** settings.json is created with empty cliRegistry and default ignoreRules
**And** Projects/ directory is created

#### Scenario: Workspace Path Containment
**Given** user creates project with name "../escape"
**When** project creation is attempted
**Then** operation fails with error "Invalid project name"
**And** no directory is created outside workspace root
